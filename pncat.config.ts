import { defineConfig, mergeCatalogRules } from 'pncat'

export default defineConfig({
  catalogRules: mergeCatalogRules([]),
  postRun: 'eslint --fix "**/package.json" "**/pnpm-workspace.yaml"',
})
