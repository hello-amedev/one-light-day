<script lang="ts">
  // 文を句点・読点・空白の後でだけ改行させる。名場面・出来事の文のように、中央にそろえた短い文に使う。
  // 塊の中で折り返す必要がある時は、対応するブラウザ(Chrome など)では文節で折り返す(word-break: auto-phrase)。
  import { t } from '../lib/i18n';
  import { splitPhrases } from '../lib/phrases';

  let { text }: { text: string } = $props();
  const parts = $derived(splitPhrases(text, t().common.phraseBreaks));
</script>

{#each parts as part}<span class="phrase">{part}</span>{/each}

<style>
  .phrase {
    display: inline-block;
    word-break: auto-phrase;
  }
</style>
