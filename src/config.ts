import type { CommandOptions, PublishOptions } from './types'
import process from 'node:process'
import c from 'ansis'
import { createConfigLoader } from 'unconfig'
import { DEFAULT_PUBLISH_OPTIONS, PLATFORM_CHOICES } from './constants'
import { getGitHubRepo, getGitTag, getVersionByGitTag, readTokenFromGitHubCli } from './git'
import { getPackageName, getPackageVersion } from './package'

function normalizeConfig(options: Partial<CommandOptions>) {
  // interop
  if ('default' in options)
    options = options.default as Partial<CommandOptions>

  return options
}

export async function resolveConfig(options: Partial<CommandOptions>): Promise<PublishOptions> {
  const defaults = { ...DEFAULT_PUBLISH_OPTIONS }
  options = normalizeConfig(options)

  const cwd = options.cwd || process.cwd()

  const loader = createConfigLoader<CommandOptions>({
    sources: [
      {
        files: [
          'vsxpub.config',
        ],
      },
    ],
    cwd,
    merge: false,
  })

  const configOptions = await loader.load()
  const config = { ...defaults, ...configOptions, ...options }

  config.name = config.name || await getPackageName(cwd)
  config.version = config.version || await getPackageVersion() || await getVersionByGitTag()
  if (typeof config.dependencies !== 'boolean')
    config.dependencies = false

  config.repo = config.repo || await getGitHubRepo(config.baseUrl)
  config.tag = config.tag || await getGitTag() || `v${config.version}`

  config.githubToken = config.githubToken || process.env.GITHUB_TOKEN || await readTokenFromGitHubCli()
  config.vscePat = config.vscePat || process.env.VSCE_PAT || ''
  config.ovsxPat = config.ovsxPat || process.env.OVSX_PAT || ''

  // normalize exclude
  config.exclude = typeof config.exclude === 'string'
    ? [config.exclude]
    : config.exclude ?? []

  if (config.exclude.length) {
    const invalidPlatforms = config.exclude.filter(p => !PLATFORM_CHOICES.includes(p))
    if (invalidPlatforms.length) {
      console.warn(`Invalid exclude platform: ${c.yellow(invalidPlatforms.join(', '))}`)
    }
  }

  return config as PublishOptions
}
