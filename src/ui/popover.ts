// 一覧(メニュー・向くの一覧)の開いている間の操作。外を押す・Esc で閉じ、矢印で項目を移る。
// 使い方: <div class="wrap"><button/><div role="menu" use:popover={() => (open = false)}>…</div></div>
// 一覧の親(wrap)の中にあるものは「外」に数えない。閉じた後、Esc の時は wrap の最初のボタン(開いたボタン)へ焦点を戻す。
import { nextMenuIndex, type MenuKey } from './controls';

export function popover(node: HTMLElement, onclose: () => void) {
  const root = node.parentElement as HTMLElement;
  const items = () => [...node.querySelectorAll<HTMLElement>('[role^="menuitem"]')];

  const down = (e: PointerEvent) => {
    if (!root.contains(e.target as Node)) onclose();
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onclose();
      root.querySelector<HTMLElement>('button')?.focus();
    } else if (e.key === 'Tab') {
      onclose();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      const list = items();
      const next = nextMenuIndex(list.length, list.indexOf(document.activeElement as HTMLElement), e.key as MenuKey);
      if (next >= 0) {
        e.preventDefault();
        list[next].focus();
      }
    }
  };

  window.addEventListener('pointerdown', down, true);
  root.addEventListener('keydown', key);
  items()[0]?.focus();
  return {
    destroy() {
      window.removeEventListener('pointerdown', down, true);
      root.removeEventListener('keydown', key);
    },
  };
}
