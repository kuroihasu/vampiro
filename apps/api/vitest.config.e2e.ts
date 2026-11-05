import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Todos los archivos comparten la base vampiro_test.
    fileParallelism: false,
    env: { NODE_ENV: 'test' },
  },
});
