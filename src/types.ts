import type { PLATFORM_CHOICES } from './constants'

export type Platform = (typeof PLATFORM_CHOICES)[number]

export type MaybePromise<T> = T | Promise<T>

export interface CommonOptions {
  cwd?: string
  dry?: boolean
  exclude?: Platform[]
}

export interface CommandOptions extends CommonOptions {
  /**
   * Github base url
   * @default github.com
   */
  baseUrl?: string
  /**
   * Github base API url
   * @default api.github.com
   */
  baseUrlApi?: string
  /**
   * Github repo
   */
  repo?: string
  /**
   * Git tag
   */
  tag?: string
  /**
   * Extension name
   */
  name?: string
  /**
   * Extension version
   */
  version?: string
  /**
   * Whether to install dependencies
   * @default false
   */
  dependencies?: boolean
  /**
   * GitHub Token
   */
  githubToken?: string
  /**
   * Visual Studio Code Extension Access Token
   */
  vscePat?: string
  /**
   * Open Vsx Registry Access Token
   */
  ovsxPat?: string
}

export type PublishOptions = Required<CommandOptions>
