import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // ame-dev.com/<名前>/ のような下の階層に置いても動くよう、相対パスで出す
  base: './',
  plugins: [svelte()],
  server: {
    watch: {
      // 作業コピー(.claude/worktrees/ の中の別の checkout)やビルドの成果物の変化で、開いているページを再読み込みしない
      ignored: ['**/.claude/**', '**/dist/**'],
    },
    fs: {
      // 作業コピー(worktree)から起動した時にも、上の階層のファイルを読めるようにする
      allow: ['..', '../..', '../../..'],
    },
  },
  build: {
    target: 'es2022',
    // フォントの小さな分割ファイルを CSS に埋め込まない(埋め込むと、使わない文字の分まで最初に読み込んでしまう)
    assetsInlineLimit: 0,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
