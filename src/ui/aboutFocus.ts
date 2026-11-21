// 板を開いている間、Tab キーで板の外へ出ないようにする(画面に依存しない判定)。

/**
 * Tab を押した時に、フォーカスを移す先の位置を返す。端から出る時だけ反対の端を返し、板の中での普通の移動なら null(ブラウザに任せる)。
 * count: 板の中でフォーカスできるものの数、current: いま選ばれている位置(板の外・なしは -1)。
 */
export function focusTrapTarget(count: number, current: number, backwards: boolean): number | null {
  if (count <= 0) return null;
  if (current < 0) return backwards ? count - 1 : 0;
  if (backwards && current === 0) return count - 1;
  if (!backwards && current === count - 1) return 0;
  return null;
}
