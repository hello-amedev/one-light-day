<script lang="ts">
  // 文を句点・読点・空白の後でだけ改行させる。名場面・出来事の文のように、中央にそろえた短い文に使う。
  // 塊の中で折り返す必要がある時は、対応するブラウザ(Chrome など)では文節で折り返す(word-break: auto-phrase)。
  // 塊の末尾の空白は箱の中に入れると詰められて消えるので、箱の外に出す(「スイングバイ前 13.2km/s」の空白)
  import { t } from '../lib/i18n';
  import { splitPhrases } from '../lib/phrases';

  let { text }: { text: string } = $props();
  const parts = $derived(
    splitPhrases(text, t().common.phraseBreaks).map((p) => {
      const body = p.trimEnd();
      return { body, space: body.length < p.length };
    }),
  );
</script>

{#each parts as part}<span class="phrase">{part.body}</span>{#if part.space}{' '}{/if}{/each}

<style>
  .phrase {
    display: inline-block;
    word-break: auto-phrase;
  }
</style>
