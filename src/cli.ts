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
    .option('--skip-git', 'Skip upload .vsix to release page', { default: false })
    .option('--skip-vsce', 'Skip vsce publish', { default: false })
    .option('--skip-ovsx', 'Skip ovsx publish', { default: false })
    .option('--dry', 'Dry run', { default: false })
    .allowUnknownOptions()
    .action(async (options: CommandOptions) => {
      const config = await resolveConfig(options)

      console.log(`${c.yellow(name)} ${c.dim(`v${version}`)}`)

      const vsix = `./${config.name}-${config.version}.vsix`

      // upload .vsix to release page
      if (!config.skipGit) {
        const args = ['release', 'upload', config.tag, vsix, '--repo', config.repo, '--clobber']
        await tryExec({
          config,
          title: 'Uploading .vsix to release page...',
          errorMessage: 'Failed to upload .vsix to release page. Please ensure the release page has been created.',
          fn: async () => {
            if (!existsSync(vsix)) {
              await execCommand('npx', ['vsce', 'package'], config)
            }
            await execCommand('gh', args, config)
          },
          dryFn: () => {
            console.log(c.green(`gh ${normalizeArgs(args, config).join(' ')}`))
          },
        })
      }

      // publish to vsce
      if (!config.skipVsce) {
        const args = ['vsce', 'publish']
        await tryExec({
          config,
          title: 'Publishing to vsce...',
          errorMessage: 'Failed to publish to vsce.',
          fn: async () => {
            await execCommand('npx', args, config)
          },
          dryFn: () => {
            console.log(c.green(`npx ${normalizeArgs(args, config).join(' ')}`))
          },
        })
      }

      // publish to ovsx
      if (!config.skipOvsx) {
        const args = ['ovsx', 'publish']
        await tryExec({
          config,
          title: 'Publishing to ovsx...',
          errorMessage: 'Failed to publish to ovsx.',
          fn: async () => {
            await execCommand('npx', args, config)
          },
          dryFn: () => {
            console.log(c.green(`npx ${normalizeArgs(args, config).join(' ')}`))
          },
        })
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
  await execa(cmd, normalizeArgs(args, config), { env })
}

function normalizeArgs(args: string[], options: PublishOptions) {
  if (!options.dependencies)
    args.push('--no-dependencies')

  return args
}

async function tryExec(options: {
  config: PublishOptions
  title: string
  errorMessage: string
  fn: () => MaybePromise<void>
  dryFn?: () => MaybePromise<void>
}) {
  console.log()
  console.log(c.dim('--------------'))
  console.log(c.blue(options.title))
  try {
    if (options.config.dry)
      await options.dryFn?.()
    else
      await options.fn()
  }
  catch (error) {
    console.log()
    console.error(c.red(options.errorMessage))
    console.error(c.red(error))
    console.log()
  }
  finally {
    console.log(c.dim('--------------'))
  }
}
