<script lang="ts">
  // 右上のメニュー。表示の切り替え 3 つ(入・切が分かる)、星空だけを表示、使い方、このサイトについて。
  // 外を押す・Esc で閉じる。矢印で項目を移れる。表示の切り替えは続けて押せるよう、押しても閉じない。
  import { t } from '../lib/i18n';
  import type { AppStore, DisplayPrefs } from '../lib/store';
  import Icon from './Icon.svelte';
  import { popover } from './popover';
  import UiButton from './UiButton.svelte';
  import { watchStore } from './store.svelte';

  interface Props {
    store: AppStore;
    /** 「このサイトについて」を開く(再生を止めるのは呼び出し側) */
    onabout: () => void;
    /** 使い方の案内を開く(再生を止めるのは呼び出し側) */
    ontutorial: () => void;
    /** 一覧を開いている間 true(操作しない間に薄くならないよう、層が知る) */
    open?: boolean;
  }
  let { store, onabout, ontutorial, open = $bindable(false) }: Props = $props();
  const txt = t().menu;
  const view = watchStore(store);

  const toggles: { key: keyof DisplayPrefs; text: string }[] = [
    { key: 'labels', text: txt.labels },
    { key: 'orbits', text: txt.orbits },
    { key: 'captions', text: txt.captions },
  ];

  function toggle(key: keyof DisplayPrefs) {
    store.setDisplay({ [key]: !view.state.display[key] } as Partial<DisplayPrefs>);
  }
  function starsOnly() {
    open = false;
    store.setStarsOnly(true);
  }
  function tutorial() {
    open = false;
    ontutorial();
  }
  function about() {
    open = false;
    onabout();
  }
</script>

<div class="menu">
  <UiButton
    icon
    label={txt.open}
    tip={txt.open}
    tipAlign="end"
    expanded={open}
    haspopup="menu"
    onclick={() => (open = !open)}
  >
    <Icon name="menu" />
  </UiButton>
  {#if open}
    <div class="list" role="menu" aria-label={txt.open} use:popover={() => (open = false)}>
      {#each toggles as o (o.key)}
        <button
          type="button"
          class="item"
          role="menuitemcheckbox"
          aria-checked={view.state.display[o.key]}
          onclick={() => toggle(o.key)}
        >
          <span class="box" class:on={view.state.display[o.key]} aria-hidden="true"></span>
          {o.text}
        </button>
      {/each}
      <div class="rule" role="separator"></div>
      <button type="button" class="item" role="menuitem" onclick={starsOnly}>{txt.starsOnly}</button>
      <button type="button" class="item" role="menuitem" onclick={tutorial}>{t().tutorial.entry}</button>
      <button type="button" class="item" role="menuitem" onclick={about}>{t().about.entry}</button>
    </div>
  {/if}
</div>

<style>
  .menu {
    position: relative;
  }
  .list {
    position: absolute;
    right: 0;
    top: calc(100% + var(--space-1));
    z-index: 4;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    min-width: 14em;
    padding: var(--space-1) 0;
    background: var(--panel-bg);
    border: var(--line-thin) solid var(--color-rule);
  }
  .item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--control-h);
    padding: 0 var(--space-3);
    background: none;
    border: none;
    color: var(--color-text-dim);
    font-size: var(--text-s);
    letter-spacing: 0.04em;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }
  .item[aria-checked='true'] {
    color: var(--color-text);
  }
  .item:hover,
  .item:focus-visible {
    color: var(--color-text);
    background: var(--scrim-bg);
  }
  .item:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: -2px;
  }
  /* 入・切の印。四角の枠で、入の時は中が金で埋まる */
  .box {
    flex: none;
    width: 12px;
    height: 12px;
    box-sizing: border-box;
    border: var(--line-thin) solid var(--color-text-dim);
    transition: background-color var(--dur-s) var(--ease-out);
  }
  .box.on {
    border-color: var(--color-gold);
    background: var(--color-gold);
    box-shadow: inset 0 0 0 2px var(--color-space);
  }
  .rule {
    margin: var(--space-1) var(--space-3);
    border-top: var(--line-thin) solid var(--color-rule);
  }
  @media (prefers-reduced-motion: reduce) {
    .box {
      transition: none;
    }
  }
</style>
