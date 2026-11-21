import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/** このファイルがあるフォルダ(末尾は /) */
const ROOT = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // ame-dev.com/<名前>/ のような下の階層に置いても動くよう、相対パスで出す
  base: './',
  plugins: [svelte()],
  server: {
    watch: {
      // このフォルダの直下の .claude/(その中に別の checkout=作業コピーがある)とビルドの成果物の変化で、
      // 開いているページを再読み込みしない。'**/.claude/**' と書くと、作業コピー自身(.claude/worktrees/ の下にある)の
      // 全ファイルが監視から外れ、編集が画面に反映されなくなる
      ignored: [`${ROOT}.claude/**`, `${ROOT}dist/**`],
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
