import type { Options } from './types'

export * from './constants'
export * from './types'

export function defineConfig(config: Partial<Options>) {
  return config
}
