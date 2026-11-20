import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

// 見た目の案(第 2 段階の比較用)。?style=a|b|c の時だけ読み込み、3D が色を読む前に当てる
const style = new URLSearchParams(location.search).get('style');
if (style === 'a' || style === 'b' || style === 'c') {
  await import('./looks.css');
  document.documentElement.dataset.style = style;
}

const target = document.getElementById('app');
if (!target) throw new Error('#app not found');

export default mount(App, { target });
