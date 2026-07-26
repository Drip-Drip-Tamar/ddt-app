/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';
import path from 'path';

export default getViteConfig({
  resolve: {
    alias: {
      '@pages': path.resolve(__dirname, './src/pages'),
      '@components': path.resolve(__dirname, './src/components'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@data': path.resolve(__dirname, './src/data'),
      '@config': path.resolve(__dirname, './src/config')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './tests/setup/setup.ts',
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.astro/',
        'studio/',
        'e2e/',
        '*.config.*',
        'tests/**',
        'src/env.d.ts',
        // Astro component behavior is exercised by container tests, while
        // this ratchet tracks the existing script/API/data instrumentation.
        'src/components/**/*.astro',
        'src/components/SanityVisualEditing.tsx'
      ],
      // Ratchet, not gate: set a few points below the levels measured on
      // 2026-07-07 (see IMPROVEMENT-PLAN.md Task 15) so normal fluctuation
      // doesn't fail CI, but a real regression does. Raise these as
      // coverage improves — never lower them to fit falling coverage.
      thresholds: {
        statements: 84,
        branches: 72,
        functions: 86,
        lines: 85
      }
    },
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.astro', 'studio', 'e2e']
  }
});
