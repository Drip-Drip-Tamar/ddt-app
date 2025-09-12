import { defineConfig } from 'vitest/config';
import { getViteConfig } from 'astro/config';

export default defineConfig(
  getViteConfig(
    defineConfig({
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './tests/setup/setup.ts',
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          exclude: [
            'node_modules/',
            'dist/',
            '.astro/',
            'studio/',
            '*.config.*',
            'tests/**',
            'src/env.d.ts',
            'src/components/SanityVisualEditing.tsx'
          ]
        },
        include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['node_modules', 'dist', '.astro', 'studio']
      }
    })
  )
);