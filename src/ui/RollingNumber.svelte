<script lang="ts">
  // 数字の文字列を表示する。ゆっくり変わる時だけ、変わった桁が縦に回って切り替わる(機械式のカウンターのように)。
  // 回すかどうかは rolling.ts が、前に変わってからの時間と変わった桁の数で決める。
  // 読み上げには、回る途中の数字ではなく今の値だけを伝える。
  import { planRoll } from './rolling';

  let { value }: { value: string } = $props();

  interface Cell {
    ch: string;
    /** 回っている間だけ入る、前の文字 */
    prev: string | null;
    /** 回すたびに増やす。同じ位置で続けて回す時に、動きを最初からやり直すための印 */
    seq: number;
  }

  const toCells = (s: string): Cell[] => [...s].map((ch) => ({ ch, prev: null, seq: 0 }));

  // 最初の値は回さずに出す。以降の変化は、下の effect が受ける
  // svelte-ignore state_referenced_locally
  let cells = $state.raw<Cell[]>(toCells(value));
  // svelte-ignore state_referenced_locally
  let shown = value;
  let changedAt = performance.now();

  $effect(() => {
    const next = value;
    if (next === shown) return;
    const now = performance.now();
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { positions } = planRoll(shown, next, now - changedAt, reduced);
    const rolling = new Set(positions);
    const before = cells;
    cells = [...next].map((ch, i) =>
      rolling.has(i) ? { ch, prev: before[i]?.ch ?? null, seq: (before[i]?.seq ?? 0) + 1 } : { ch, prev: null, seq: 0 },
    );
    shown = next;
    changedAt = now;
  });

  function settle(index: number, seq: number) {
    const cell = cells[index];
    if (!cell || cell.seq !== seq || cell.prev === null) return;
    cells = cells.map((c, i) => (i === index ? { ...c, prev: null } : c));
  }
</script>

<span class="sr">{value}</span>
<span class="digits" aria-hidden="true"
  >{#each cells as cell, i (i)}{#if cell.prev !== null}{#key cell.seq}<span class="cell"
          ><span class="stack" onanimationend={() => settle(i, cell.seq)}
            ><span class="line">{cell.prev}</span><span class="line">{cell.ch}</span></span
          ></span
        >{/key}{:else}{cell.ch}{/if}{/each}</span
>

<style>
  /* 読み上げ用。画面には出さない */
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .digits {
    white-space: pre;
  }
  /* 1 文字ぶんの窓。等幅の数字なので、回っても幅も位置も変わらない */
  .cell {
    display: inline-block;
    height: 1.15em;
    overflow: hidden;
    vertical-align: top;
  }
  .stack {
    display: flex;
    flex-direction: column;
    animation: roll var(--dur-s) var(--ease-out) both;
  }
  .line {
    display: block;
    height: 1.15em;
    line-height: 1.15;
  }
  @keyframes roll {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-1.15em);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .stack {
      animation: none;
    }
  }
</style>
