// 文を、改行してよい所(区切りの記号の直後)で区切る。画面に依存しない純粋な関数。
// 区切った塊を PhraseText で 1 つずつ折り返さない箱にすると、「発 / 見した」のように語の途中で行が分かれない。
// 1 つの塊が 1 行に収まらない時だけ、その塊の中で折り返す。区切りの記号は言語ごとに辞書(common.phraseBreaks)に置く。

const escape = (s: string): string => s.replace(/[\\\]^-]/g, '\\$&');

/** breaks のどれかの直後で区切る。区切りの記号は前の塊に残す。空の塊は返さない */
export function splitPhrases(text: string, breaks: string): string[] {
  if (!breaks) return text ? [text] : [];
  const b = escape(breaks);
  return text.match(new RegExp(`[^${b}]+[${b}]*|[${b}]+`, 'g')) ?? [];
}
