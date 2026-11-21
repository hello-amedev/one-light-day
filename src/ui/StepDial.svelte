<script lang="ts">
  // 送り(‹ ›)。押すと時刻を戻す・進める。送る量は呼び出し側が決める(読み上げの名前に出る)。
  import UiButton from './UiButton.svelte';
  import Chevron from './Chevron.svelte';

  interface Props {
    backLabel: string;
    forwardLabel: string;
    onstep: (direction: -1 | 1) => void;
  }
  let { backLabel, forwardLabel, onstep }: Props = $props();
</script>

<div class="dial">
  <UiButton icon label={backLabel} tip={backLabel} tipPlace="above" onclick={() => onstep(-1)}>
    <Chevron direction="left" />
  </UiButton>
  <UiButton icon label={forwardLabel} tip={forwardLabel} tipPlace="above" onclick={() => onstep(1)}>
    <Chevron direction="right" />
  </UiButton>
</div>

<style>
  .dial {
    display: inline-flex;
    align-items: center;
  }
</style>
