import type { CommandOptions, PublishOptions } from './types'
import process from 'node:process'
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

  const config = await loader.load()
  const configOptions = { ...defaults, ...config, ...options }

  configOptions.name = configOptions.name || await getPackageName(cwd)
  configOptions.version = configOptions.version || await getPackageVersion() || await getVersionByGitTag()
  if (typeof configOptions.dependencies !== 'boolean')
    configOptions.dependencies = false

  configOptions.repo = configOptions.repo || await getGitHubRepo(configOptions.baseUrl)
  configOptions.tag = configOptions.tag || await getGitTag() || `v${configOptions.version}`

  configOptions.githubToken = configOptions.githubToken || process.env.GITHUB_TOKEN || await readTokenFromGitHubCli()
  configOptions.vscePat = configOptions.vscePat || process.env.VSCE_PAT || ''
  configOptions.ovsxPat = configOptions.ovsxPat || process.env.OVSX_PAT || ''

  return configOptions as PublishOptions
}
