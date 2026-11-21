<script lang="ts">
  // 右上の日付。押すとその場が入力欄になり、日付を打って Enter で移る(時刻は今のまま、日付だけ替える)。
  // Esc か入力欄の外を押すと、移らずに戻る。読めない形・範囲の外の日付は、入力欄の下に案内を出して入力を続ける。
  // 入力を始めると再生を止める(打っている間に日付が変わらないように)。
  import { tick } from 'svelte';
  import { dateInputToEt } from '../lib/dateInput';
  import { formatDate, formatSinceLaunch } from '../lib/format';
  import { t } from '../lib/i18n';
  import type { AppStore } from '../lib/store';
  import Readout from './Readout.svelte';
  import { watchStore } from './store.svelte';

  /** editing は入力中か(入力中は操作の部品を薄くしない。UiLayer が受け取る) */
  let { store, editing = $bindable(false) }: { store: AppStore; editing?: boolean } = $props();
  const view = watchStore(store);

  let text = $state('');
  let error = $state('');
  let input: HTMLInputElement | undefined = $state();
  let button: HTMLButtonElement | undefined = $state();

  async function start() {
    if (view.state.playing) store.pause();
    text = formatDate(store.get().et);
    error = '';
    editing = true;
    await tick();
    input?.focus();
    input?.select();
  }

  async function finish(refocus: boolean) {
    editing = false;
    error = '';
    if (refocus) {
      await tick();
      button?.focus();
    }
  }

  function submit() {
    const s = store.get();
    const et = dateInputToEt(text, s.et, store.minEt, store.maxEt);
    if (et === null) {
      error = t().hud.dateRange(formatDate(store.minEt), formatDate(store.maxEt));
      input?.select();
      return;
    }
    store.setTime(et);
    void finish(true);
  }

  function key(e: KeyboardEvent) {
    // キーは画面全体にも渡す(打っている間、操作の部品が薄くならないように)
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      void finish(true);
    }
  }
</script>

<div class="date-jump">
  {#if editing}
    <input
      bind:this={input}
      bind:value={text}
      class="field"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      spellcheck="false"
      aria-label={t().hud.dateInput}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? 'date-jump-error' : undefined}
      onkeydown={key}
      onblur={() => finish(false)}
    />
    <div class="error" id="date-jump-error" role="alert">{error}</div>
  {:else}
    <button bind:this={button} type="button" class="open" title={t().hud.dateEdit} onclick={start}>
      <Readout value={formatDate(view.state.et)} sub={formatSinceLaunch(view.state.et)} />
    </button>
  {/if}
</div>

<style>
  .date-jump {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .open {
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: inherit;
    cursor: pointer;
  }
  .open:hover :global(.value) {
    color: var(--color-gold);
  }
  .open:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: var(--space-1);
  }
  .field {
    width: 10.5ch;
    padding: 0;
    border: none;
    border-bottom: var(--line-thin) solid var(--color-gold);
    background: none;
    color: var(--color-text);
    font-family: var(--font-numeric);
    font-size: var(--text-readout);
    line-height: 1.15;
    text-align: right;
    font-variant-numeric: tabular-nums;
    text-shadow: var(--text-halo);
    outline: none;
    pointer-events: auto;
  }
  .error {
    white-space: nowrap;
    margin-top: var(--space-1);
    font-family: var(--font-body);
    font-size: var(--text-s);
    letter-spacing: var(--body-tracking);
    color: var(--color-gold);
    text-align: right;
    text-shadow: var(--text-halo);
    min-height: 1.3em;
  }
  @media (max-width: 640px) and (orientation: portrait) {
    .field {
      font-size: var(--text-xl);
    }
    /* スマホの縦は 1 行に収まらないので、文節で折り返す(対応するブラウザだけ) */
    .error {
      max-width: 14rem;
      white-space: normal;
      word-break: auto-phrase;
    }
  }
</style>
