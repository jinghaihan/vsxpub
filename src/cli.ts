import type { CAC } from 'cac'
import type { CommandOptions, MaybePromise, PublishOptions } from './types'
import { existsSync } from 'node:fs'
import process from 'node:process'
import c from 'ansis'
import { cac } from 'cac'
import { execa } from 'execa'
import { name, version } from '../package.json'
import { resolveConfig } from './config'

try {
  const cli: CAC = cac('vsxpub')

  cli
    .command('')
    .option('--repo <repo>', 'Github repo')
    .option('--tag <tag>', 'Github tag')
    .option('--name <name>', 'Extension name')
    .option('--version <version>', 'Extension version')
    .option('--dependencies', 'Install dependencies', { default: true })
    .option('--github-token <token>', 'GitHub Token')
    .option('--vsce-pat <token>', 'Visual Studio Code Extension Token')
    .option('--ovsx-pat <token>', 'Open Vsx Registry Token')
    .option('--exclude <platforms>', 'Exclude platforms from publishing (git, vsce, ovsx)', { default: [] })
    .option('--dry', 'Dry run', { default: false })
    .allowUnknownOptions()
    .action(async (options: CommandOptions) => {
      console.log(`${c.yellow(name)} ${c.dim(`v${version}`)}`)
      console.log()

      const config = await resolveConfig(options)

      const vsix = `./${config.name}-${config.version}.vsix`
      const skipGit = config.exclude.includes('git')
      const skipVsce = config.exclude.includes('vsce')
      const skipOvsx = config.exclude.includes('ovsx')

      if (skipGit && skipVsce && skipOvsx) {
        console.error(c.red('No platforms to publish to.'))
        process.exit(1)
      }

      const failed: string[] = []

      // publish to vscode marketplace
      if (!skipVsce) {
        // const args = ['vsce', 'publish', '--packagePath', vsix]
        const args = ['vsce', 'publish']
        if (config.vscePat) {
          args.push('-p', config.vscePat)
        }
        const normalizedArgs = normalizeArgs(args, config)

        const result = await tryExec({
          config,
          title: 'Publishing to vsce...',
          successMessage: 'Published to vsce.',
          errorMessage: 'Failed to publish to vsce.',
          fn: async () => {
            await execCommand('npx', normalizedArgs, config)
          },
          dryFn: () => {
            console.log(c.green(`npx ${normalizedArgs.join(' ')}`))
          },
        })
        if (!result)
          failed.push('vsce')
      }

      if (!existsSync(vsix)) {
        await execCommand('npx', ['vsce', 'package'], config)
      }

      // publish to openvsx registry
      if (!skipOvsx) {
        const args = ['ovsx', 'publish', vsix]
        if (config.ovsxPat) {
          args.push('-p', config.ovsxPat)
        }
        const normalizedArgs = normalizeArgs(args, config)

        const result = await tryExec({
          config,
          title: 'Publishing to ovsx...',
          successMessage: 'Published to ovsx.',
          errorMessage: 'Failed to publish to ovsx.',
          fn: async () => {
            await execCommand('npx', normalizedArgs, config)
          },
          dryFn: () => {
            console.log(c.green(`npx ${normalizedArgs.join(' ')}`))
          },
        })
        if (!result)
          failed.push('ovsx')
      }

      // upload .vsix to release page
      if (!skipGit) {
        const args = ['release', 'upload', config.tag, vsix, '--repo', config.repo, '--clobber']
        const result = await tryExec({
          config,
          title: 'Uploading .vsix to release page...',
          successMessage: 'Uploaded .vsix to release page.',
          errorMessage: 'Failed to upload .vsix to release page. Please ensure the release page has been created.',
          fn: async () => {
            await execCommand('gh', args, config)
          },
          dryFn: () => {
            console.log(c.green(`gh ${args.join(' ')}`))
          },
        })
        if (!result)
          failed.push('git')
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

  await execa(cmd, args, { env })
}

function normalizeArgs(args: string[], options: PublishOptions) {
  if (!options.dependencies)
    args.push('--no-dependencies')

  return args
}

async function tryExec(options: {
  config: PublishOptions
  title: string
  successMessage: string
  errorMessage: string
  fn: () => MaybePromise<void>
  dryFn?: () => MaybePromise<void>
}): Promise<boolean> {
  let success = false
  console.log()
  console.log(c.dim('--------------'))
  console.log(c.blue(options.title))
  try {
    if (options.config.dry)
      await options.dryFn?.()
    else
      await options.fn()

    success = true

    console.log()
    console.log(c.green(options.successMessage))
    console.log()
  }
  catch (error) {
    console.log()
    console.error(c.red(options.errorMessage))
    console.error(c.red(error instanceof Error ? error.message : String(error)))
    console.log()

    success = false
  }
  finally {
    console.log(c.dim('--------------'))
  }

  return success
}
