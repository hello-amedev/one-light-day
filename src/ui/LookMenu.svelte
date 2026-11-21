<script lang="ts">
  // 向く。アイコン 1 つで、押すと向く相手の一覧が開く(選ぶと閉じる)。
  // 候補の決め方は chooseLookTargets(地球・太陽・進む先は常に。木星・土星・月・衛星は近い時期だけ)。
  import { onDestroy } from 'svelte';
  import type { BodyId } from '../lib/bodies';
  import type { Ephemeris } from '../lib/ephemeris';
  import { t } from '../lib/i18n';
  import type { LookTarget } from '../lib/scenes';
  import type { AppStore } from '../lib/store';
  import { chooseLookTargets } from './controls';
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

  const targets = $derived.by(() => {
    const et = view.state.et;
    return chooseLookTargets({
      inCoverage: (body: BodyId) => {
        const c = eph.coverage(body);
        return et >= c.t0 && et <= c.t1;
      },
      distance: (a, b) => eph.distance(a, b, et),
    });
  });

  function choose(target: LookTarget) {
    open = false;
    store.lookAt(target);
  }
  onDestroy(() => (open = false));
</script>

<div class="look">
  <UiButton
    icon
    label={txt.lookGroup}
    tip={txt.lookGroup}
    tipPlace="above"
    tipAlign="start"
    expanded={open}
    haspopup="menu"
    onclick={() => (open = !open)}
  >
    <Icon name="look" />
  </UiButton>
  {#if open}
    <div class="list" role="menu" aria-label={txt.lookGroup} use:popover={() => (open = false)}>
      {#each targets as target (target)}
        <button type="button" class="item" role="menuitem" onclick={() => choose(target)}>
          {target === 'ahead' ? txt.lookAhead : txt.lookAt(names[target])}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .look {
    position: relative;
    margin-left: calc(var(--space-2) * -1);
  }
  .list {
    position: absolute;
    left: 0;
    bottom: calc(100% + var(--space-1));
    z-index: 4;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    min-width: 10em;
    /* 横画面のスマホでも画面からはみ出さない高さ。足りなければ一覧の中でスクロールする */
    max-height: calc(100dvh - var(--safe-top) - var(--safe-bottom) - 13rem);
    overflow-y: auto;
    padding: var(--space-1) 0;
    background: var(--panel-bg);
    border: var(--line-thin) solid var(--color-rule);
  }
  .item {
    display: flex;
    align-items: center;
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
  .item:hover,
  .item:focus-visible {
    color: var(--color-text);
    background: var(--scrim-bg);
  }
  .item:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: -2px;
  }
</style>
