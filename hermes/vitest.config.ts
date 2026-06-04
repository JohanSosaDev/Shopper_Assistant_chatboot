import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/pbt/**/*.pbt.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.plugin.ts',
        'src/**/*.controller.ts',
        'src/jobs/**',
      ],
      lines: 70,
      functions: 70,
      branches: 60,
    },
  },
});
