import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index', 'src/cli'],
  exports: true,
  clean: true,
})
