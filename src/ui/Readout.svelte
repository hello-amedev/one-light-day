<script lang="ts">
  import RollingNumber from './RollingNumber.svelte';
  // 数字のブロック(ラベル・大きい数字・補足)。右上の日付と右下の距離で共通。
  // 大きい数字は、ゆっくり変わる時だけ桁が回って切り替わる(RollingNumber)。
  interface Props {
    label?: string;
    value: string;
    sub?: string;
    align?: 'start' | 'end';
    /** 地球に関する数字だけ淡い青にする */
    earth?: boolean;
    /** スマホの縦画面では、ラベル・数字・補足を 1 行に並べる(下側の場所を節約する) */
    rowOnPhone?: boolean;
  }
  let { label, value, sub, align = 'end', earth = false, rowOnPhone = false }: Props = $props();
</script>

<div class="readout" class:end={align === 'end'} class:earth class:row-on-phone={rowOnPhone}>
  {#if label}<div class="label">{label}</div>{/if}
  <div class="value"><RollingNumber {value} /></div>
  <!-- 補足が出たり消えたりしても高さが変わらないよう、空でも 1 行ぶんを残す -->
  <div class="sub">{sub ?? ' '}</div>
</div>

<style>
  .readout {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-shadow: var(--text-halo);
    font-variant-numeric: tabular-nums;
    font-family: var(--font-numeric);
  }
  .readout.end {
    align-items: flex-end;
    text-align: right;
  }
  @media (max-width: 640px) and (orientation: portrait) {
    .readout.row-on-phone {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: baseline;
      column-gap: var(--space-2);
      text-align: left;
    }
  }
  .label {
    font-family: var(--font-body);
    font-size: var(--text-xs);
    letter-spacing: 0.08em;
    color: var(--color-text-dim);
  }
  .value {
    font-size: var(--text-xl);
    line-height: 1.15;
    color: var(--color-text);
    white-space: nowrap;
  }
  .earth .value {
    color: var(--color-earth);
  }
  .sub {
    font-size: var(--text-s);
    color: var(--color-text-dim);
    min-height: 1.3em;
    white-space: pre;
  }
</style>
