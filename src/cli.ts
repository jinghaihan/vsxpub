import type { CAC } from 'cac'
import type { CommandOptions, PublishOptions } from './types'
import { existsSync } from 'node:fs'
import process from 'node:process'
import c from 'ansis'
import { cac } from 'cac'
import { execa } from 'execa'
import { name, version } from '../package.json'
import { resolveConfig } from './config'
import { PLATFORM_CHOICES } from './constants'
import { executeWithFeedback } from './utils'

try {
  const cli: CAC = cac('vsxpub')

  cli
    .command('')
    .option('--cwd <dir>', 'Current working directory')
    .option('--repo <repo>', 'Github repo')
    .option('--tag <tag>', 'Github tag')
    .option('--name <name>', 'Extension name')
    .option('--version <version>', 'Extension version')
    .option('--dependencies', 'Install dependencies', { default: true })
    .option('--github-token <token>', 'GitHub Token')
    .option('--vsce-pat <token>', 'Visual Studio Code Extension Token')
    .option('--ovsx-pat <token>', 'Open Vsx Registry Token')
    .option('--include <platforms>', 'Include platforms from publishing (git, vsce, ovsx)', { default: PLATFORM_CHOICES })
    .option('--exclude <platforms>', 'Exclude platforms from publishing (git, vsce, ovsx)', { default: [] })
    .option('--retry <count>', 'Retry count', { default: 3 })
    .option('--retry-delay <ms>', 'Retry delay', { default: 1000 })
    .option('--dry', 'Dry run', { default: false })
    .allowUnknownOptions()
    .action(async (options: CommandOptions) => {
      console.log(`${c.yellow(name)} ${c.dim(`v${version}`)}`)
      console.log()

      const config = await resolveConfig(options)

      const vsix = `./${config.name}-${config.version}.vsix`
      const skipGit = !config.include.includes('git')
      const skipVsce = !config.include.includes('vsce')
      const skipOvsx = !config.include.includes('ovsx')

      if (skipGit && skipVsce && skipOvsx) {
        console.error(c.red('Please specify at least one platform to publish to.'))
        process.exit(1)
      }

      const failed: string[] = []

      if (!existsSync(vsix)) {
        const res = await createPackage(config)
        if (!res) {
          throw new Error('Failed to create .vsix package.')
        }
      }

      // upload .vsix to release page
      if (!skipGit) {
        const res = await publishToGit(vsix, config)
        if (!res)
          failed.push('git')
      }

      // publish to vscode marketplace
      if (!skipVsce) {
        const res = await publishToVsce(vsix, config)
        if (!res)
          failed.push('vsce')
      }

      // publish to openvsx registry
      if (!skipOvsx) {
        const res = await publishToOvsx(vsix, config)
        if (!res)
          failed.push('ovsx')
      }

      if (failed.length > 0) {
        throw new Error(c.red(`Failed to publish to ${failed.join(', ')}.`))
      }
    })

  cli.help()
  cli.version(version)
  cli.parse()
}
catch (error) {
  console.error(error)
  process.exit(1)
}

async function execCommand(cmd: string, args: string[], config: PublishOptions) {
  const env = {
    ...process.env,
    GITHUB_TOKEN: config.githubToken,
    VSCE_PAT: config.vscePat,
    OVSX_PAT: config.ovsxPat,
  }

  await execa(cmd, args, { env, stdio: 'inherit' })
}

async function createPackage(config: PublishOptions) {
  const args = normalizeArgs(['vsce', 'package'], config)
  return await executeWithFeedback({
    config,
    message: 'Creating .vsix package...',
    successMessage: 'Created .vsix package.',
    errorMessage: 'Failed to create .vsix package.',
    fn: async () => {
      await execCommand('npx', args, config)
    },
    dryFn: () => {
      console.log(c.yellow(`npx ${args.join(' ')}`))
    },
  })
}

async function publishToVsce(vsix: string, config: PublishOptions) {
  const exec = async (args: string[]) => {
    return await executeWithFeedback({
      config,
      message: 'Publishing to visual studio code marketplace...',
      successMessage: 'Published to visual studio code marketplace.',
      errorMessage: 'Failed to publish to visual studio code marketplace.',
      fn: async () => {
        await execCommand('npx', args, config)
      },
      dryFn: () => {
        console.log(c.yellow(`npx ${args.join(' ')}`))
      },
    })
  }

  // try to publish with exist .vsix package
  const res = await exec(normalizeArgs(['vsce', 'publish', '--packagePath', vsix], config))
  if (res)
    return true

  return await exec(normalizeArgs(['vsce', 'publish'], config))
}

async function publishToOvsx(vsix: string, config: PublishOptions) {
  const args = normalizeArgs(['ovsx', 'publish', vsix], config)
  return await executeWithFeedback({
    config,
    message: 'Publishing to open vsx registry...',
    successMessage: 'Published to open vsx registry.',
    errorMessage: 'Failed to publish to open vsx registry.',
    fn: async () => {
      await execCommand('npx', args, config)
    },
    dryFn: () => {
      console.log(c.yellow(`npx ${args.join(' ')}`))
    },
  })
}

async function publishToGit(vsix: string, config: PublishOptions) {
  const args = ['release', 'upload', config.tag, vsix, '--repo', config.repo, '--clobber']
  return await executeWithFeedback({
    config,
    message: 'Uploading .vsix to github release page...',
    successMessage: 'Uploaded .vsix to github release page.',
    errorMessage: 'Failed to upload, please ensure the github release page has been created.',
    fn: async () => {
      await execCommand('gh', args, config)
    },
    dryFn: () => {
      console.log(c.yellow(`gh ${args.join(' ')}`))
    },
  })
}

function normalizeArgs(args: string[], options: PublishOptions) {
  if (!options.dependencies) {
    args.push('--no-dependencies')
  }

  return args
}
