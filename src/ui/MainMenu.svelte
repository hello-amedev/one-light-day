<script lang="ts">
  // 左上のメニュー。視点(3 つから 1 つ)、視点の向き(本体の視点では出さない)、表示の切り替え 3 つ(入・切が分かる)、
  // 星空だけを表示、使い方、このサイトについて。左上の視点・視点の向きのボタンと同じ操作を、ここからもまとめて行える。
  // 外を押す・Esc で閉じる。矢印で項目を移れる。視点と表示の切り替えは続けて押せるよう、押しても閉じない(向くは選ぶと閉じる)。
  import type { Ephemeris } from '../lib/ephemeris';
  import { t } from '../lib/i18n';
  import type { LookTarget } from '../lib/scenes';
  import type { AppStore, DisplayPrefs, ViewId } from '../lib/store';
  import { lookTargetsAt } from './controls';
  import Icon from './Icon.svelte';
  import { popover } from './popover';
  import UiButton from './UiButton.svelte';
  import { watchStore } from './store.svelte';

  interface Props {
    store: AppStore;
    eph: Ephemeris;
    /** 「このサイトについて」を開く(再生を止めるのは呼び出し側) */
    onabout: () => void;
    /** 使い方の案内を開く(再生を止めるのは呼び出し側) */
    ontutorial: () => void;
    /** 一覧を開いている間 true(操作しない間に薄くならないよう、層が知る) */
    open?: boolean;
  }
  let { store, eph, onabout, ontutorial, open = $bindable(false) }: Props = $props();
  const txt = t().menu;
  const hud = t().hud;
  const names = t().bodies;
  const view = watchStore(store);

  const views: { id: ViewId; text: string }[] = [
    { id: 'voyager', text: hud.viewVoyager },
    { id: 'overview', text: hud.viewOverview },
    { id: 'craft', text: hud.viewCraft },
  ];
  const toggles: { key: keyof DisplayPrefs; text: string }[] = [
    { key: 'labels', text: txt.labels },
    { key: 'orbits', text: txt.orbits },
    { key: 'captions', text: txt.captions },
  ];
  // 一覧を開いている間だけ求める(閉じている間に毎コマ計算しない)
  const targets = $derived(open && view.state.view !== 'craft' ? lookTargetsAt(eph, view.state.et) : []);

  function toggle(key: keyof DisplayPrefs) {
    store.setDisplay({ [key]: !view.state.display[key] } as Partial<DisplayPrefs>);
  }
  function look(target: LookTarget) {
    open = false;
    store.lookAt(target);
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
  <UiButton icon label={txt.open} tip={txt.open} tipAlign="start" expanded={open} haspopup="menu" onclick={() => (open = !open)}>
    <Icon name="menu" />
  </UiButton>
  {#if open}
    <div class="ui-menu list" role="menu" aria-label={txt.open} use:popover={() => (open = false)}>
      <div class="section" role="group" aria-labelledby="menu-views">
        <div class="ui-menu-heading" id="menu-views">{hud.viewGroup}</div>
        {#each views as o (o.id)}
          <button
            type="button"
            class="ui-menu-item"
            role="menuitemradio"
            aria-checked={view.state.view === o.id}
            onclick={() => store.setView(o.id)}
          >
            <span class="ui-menu-mark blank" aria-hidden="true"></span>
            {o.text}
          </button>
        {/each}
      </div>
      {#if targets.length > 0}
        <div class="section" role="group" aria-labelledby="menu-look">
          <div class="ui-menu-heading" id="menu-look">{hud.lookGroup}</div>
          {#each targets as target (target)}
            <button type="button" class="ui-menu-item" role="menuitem" onclick={() => look(target)}>
              <span class="ui-menu-mark blank" aria-hidden="true"></span>
              {target === 'ahead' ? hud.lookAhead : hud.lookAt(names[target])}
            </button>
          {/each}
        </div>
      {/if}
      <div class="section" role="group" aria-labelledby="menu-display">
        <div class="ui-menu-heading" id="menu-display">{txt.displayGroup}</div>
        {#each toggles as o (o.key)}
          <button
            type="button"
            class="ui-menu-item"
            role="menuitemcheckbox"
            aria-checked={view.state.display[o.key]}
            onclick={() => toggle(o.key)}
          >
            <span class="ui-menu-mark" class:on={view.state.display[o.key]} aria-hidden="true"></span>
            {o.text}
          </button>
        {/each}
      </div>
      <div class="rule" role="separator"></div>
      <button type="button" class="ui-menu-item" role="menuitem" onclick={starsOnly}>{txt.starsOnly}</button>
      <button type="button" class="ui-menu-item" role="menuitem" onclick={tutorial}>{t().tutorial.entry}</button>
      <button type="button" class="ui-menu-item" role="menuitem" onclick={about}>{t().about.entry}</button>
    </div>
  {/if}
</div>

<style>
  /* 一覧は、置き場所(UiLayer の題字の行)の左端にそろえて開く。左上の視点・視点の向きのボタンを覆い、同じ操作をここで行う */
  .menu {
    display: flex;
  }
  .list {
    left: 0;
    top: calc(100% + var(--space-1));
    /* 下の視点のボタンより広くし、後ろの同じボタンが一覧の横からのぞかないようにする */
    min-width: max(16em, 100%);
    /* 項目が多いので、低い画面では一覧の中でスクロールする */
    max-height: calc(100dvh - var(--safe-top) - var(--safe-bottom) - 6rem);
  }
  /* 項目を一覧の幅いっぱいに広げる(選ばれている行の金の地が行の端まで届くように) */
  .section {
    display: flex;
    flex-direction: column;
  }
  .section + .section {
    margin-top: var(--space-1);
    border-top: var(--line-thin) solid var(--color-rule);
    padding-top: var(--space-1);
  }
  .rule {
    margin: var(--space-1) 0;
    border-top: var(--line-thin) solid var(--color-rule);
  }
</style>
