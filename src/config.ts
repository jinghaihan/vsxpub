import type { CommandOptions, Options, Platform } from './types'
import process from 'node:process'
import c from 'ansis'
import { createConfigLoader } from 'unconfig'
import { DEFAULT_PUBLISH_OPTIONS } from './constants'
import { getGitHubRepo, getGitTag, getVersionByGitTag, readTokenFromGitHubCli } from './git'
import { getPackageName, getPackageVersion } from './package'

function normalizeConfig(options: Partial<CommandOptions>) {
  // interop
  if ('default' in options)
    options = options.default as Partial<CommandOptions>

  return options
}

export async function resolveConfig(options: Partial<CommandOptions>): Promise<Options> {
  const defaults = { ...DEFAULT_PUBLISH_OPTIONS }
  options = normalizeConfig(options)

  const cwd = options.cwd || process.cwd()

  const loader = createConfigLoader<CommandOptions>({
    sources: [
      {
        files: ['vsxpub.config'],
      },
    ],
    cwd,
    merge: false,
  })

  const configOptions = await loader.load()
  const config = { ...defaults, ...configOptions, ...options }

  config.name = config.name || await getPackageName(cwd)
  config.version = config.version || await getPackageVersion() || await getVersionByGitTag()

  if (typeof config.dependencies === 'string') {
    config.dependencies = config.dependencies === 'true'
  }

  config.repo = config.repo || await getGitHubRepo(config.baseUrl)
  config.tag = config.tag || await getGitTag() || `v${config.version}`

  config.githubToken = config.githubToken || process.env.GITHUB_TOKEN || await readTokenFromGitHubCli()
  config.vscePat = config.vscePat || process.env.VSCE_PAT || ''
  config.ovsxPat = config.ovsxPat || process.env.OVSX_PAT || ''

  // exclude is higher priority than include
  config.exclude = typeof config.exclude === 'string'
    ? [config.exclude]
    : config.exclude ?? []

  const include = typeof config.include === 'string'
    ? [config.include]
    : config.include ?? []

  config.include = include.filter(p => !config.exclude.includes(p as Platform))

  if (config.retry && typeof config.retry === 'string') {
    const retry = Number(config.retry)
    if (Number.isNaN(retry)) {
      console.error(c.red('Invalid retry count'))
      config.retry = 3
    }
    else {
      config.retry = retry
    }
  }

  if (config.retryDelay && typeof config.retryDelay === 'string') {
    const retryDelay = Number(config.retryDelay)
    if (Number.isNaN(retryDelay)) {
      console.error(c.red('Invalid retry delay'))
      config.retryDelay = 1000
    }
    else {
      config.retryDelay = retryDelay
    }
  }

  return config as Options
}
