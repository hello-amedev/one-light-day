<script lang="ts">
  // 3D の表示を始められなかった端末(WebGL が使えないなど)向けの表示。静止画と短い案内だけを出す。
  // 日付・距離・時間軸は出さない(動かせないため)。
  import { t } from '../lib/i18n';

  const txt = t().fallback;
  const title = t().intro.title;
  const src = import.meta.env.BASE_URL + 'fallback.jpg';
</script>

<div class="fallback">
  <img class="photo" {src} alt="" />
  <div class="shade"></div>
  <h1 class="title">{title}</h1>
  <p class="message" role="status">
    <span>{txt.notice}</span>
    <span>{txt.advice}</span>
  </p>
</div>

<style>
  .fallback {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--color-space);
  }
  .photo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* 下の案内が読めるよう、画像の下側を地の色で沈める */
  .shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 40%, var(--color-space) 100%);
    opacity: 0.9;
  }
  .title {
    position: absolute;
    top: calc(var(--safe-top) + var(--space-3));
    left: calc(var(--safe-left) + var(--space-3));
    margin: 0;
    font-family: var(--font-title);
    font-weight: var(--title-weight);
    font-size: var(--title-size);
    letter-spacing: var(--title-tracking);
    color: var(--color-text);
    text-shadow: var(--text-halo);
  }
  .message {
    position: absolute;
    left: calc(var(--safe-left) + var(--space-3));
    right: calc(var(--safe-right) + var(--space-3));
    bottom: calc(var(--safe-bottom) + var(--space-4));
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    text-align: center;
    font-family: var(--font-body);
    font-size: var(--text-m);
    letter-spacing: var(--body-tracking);
    color: var(--color-text);
    text-shadow: var(--text-halo);
  }
  .message span:last-child {
    color: var(--color-text-dim);
  }
</style>
