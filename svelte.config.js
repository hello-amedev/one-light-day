import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // 部品に渡す store(画面全体の状態)は、部品が生きている間に差し替わらない。
    // 「最初の値だけを参照している」という警告は、この使い方では当てはまらないので出さない
    warningFilter: (warning) => warning.code !== 'state_referenced_locally',
  },
};
