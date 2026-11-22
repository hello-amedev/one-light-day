<script lang="ts">
  // 視点の向き。左上の 3 段目の、アイコンと名前のボタン 1 つで、押すと向く相手の一覧が下に開く(選ぶと閉じる)。
  // 候補の決め方は lookTargetsAt(地球・太陽・進む先は常に。木星・土星・月・衛星は近い時期だけ)。メニューの中の同じ項目と共通。
  import { onDestroy } from 'svelte';
  import type { Ephemeris } from '../lib/ephemeris';
  import { t } from '../lib/i18n';
  import type { LookTarget } from '../lib/scenes';
  import type { AppStore } from '../lib/store';
  import Chevron from './Chevron.svelte';
  import { lookTargetsAt } from './controls';
  import Icon from './Icon.svelte';
  import { popover } from './popover';
  import UiButton from './UiButton.svelte';
  import { watchStore } from './store.svelte';

  interface Props {
    store: AppStore;
    eph: Ephemeris;
    /** 一覧を開いている間 true(操作しない間に薄くならないよう、層が知る) */
    open?: boolean;
  }
  let { store, eph, open = $bindable(false) }: Props = $props();
  const txt = t().hud;
  const names = t().bodies;
  const view = watchStore(store);

  const targets = $derived(lookTargetsAt(eph, view.state.et));

  function choose(target: LookTarget) {
    open = false;
    store.lookAt(target);
  }
  onDestroy(() => (open = false));
</script>

<div class="look">
  <UiButton expanded={open} haspopup="menu" onclick={() => (open = !open)}>
    <Icon name="look" />
    <span class="text">{txt.lookGroup}</span>
    <Chevron direction="down" />
  </UiButton>
  {#if open}
    <div class="ui-menu list" role="menu" aria-label={txt.lookGroup} use:popover={() => (open = false)}>
      {#each targets as target (target)}
        <button type="button" class="ui-menu-item" role="menuitem" onclick={() => choose(target)}>
          {target === 'ahead' ? txt.lookAhead : txt.lookAt(names[target])}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .look {
    position: relative;
    display: flex;
    /* アイコンの余白ぶん左へ寄せ、上の視点のアイコンと縦をそろえる */
    margin-left: calc(var(--space-2) * -1);
  }
  .look :global(.ui-button) {
    gap: var(--space-2);
  }
  .list {
    left: 0;
    top: calc(100% + var(--space-1));
    min-width: 10em;
    /* 横画面のスマホでも画面からはみ出さない高さ。足りなければ一覧の中でスクロールする */
    max-height: calc(100dvh - var(--safe-top) - var(--safe-bottom) - 12rem);
  }
</style>
