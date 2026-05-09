import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['controllers/**', 'middlewares/**'],
      exclude: ['node_modules/**', 'dist/**', '__tests__/**'],
    },
  },
})
