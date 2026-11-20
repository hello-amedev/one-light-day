import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // ame-dev.com/<名前>/ のような下の階層に置いても動くよう、相対パスで出す
  base: './',
  plugins: [svelte()],
  server: {
    fs: {
      // 作業コピー(worktree)から起動した時にも、上の階層のファイルを読めるようにする
      allow: ['..', '../..', '../../..'],
    },
  },
  build: {
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
