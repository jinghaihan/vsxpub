export const PLATFORM_CHOICES = ['git', 'vsce', 'ovsx'] as const

export const DEFAULT_PUBLISH_OPTIONS = {
  baseUrl: 'github.com',
  baseUrlApi: 'api.github.com',
  include: PLATFORM_CHOICES,
  exclude: [],
}
