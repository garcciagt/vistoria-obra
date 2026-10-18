import { useEffect, type RefObject } from "react";

/** Calls onDismiss when the user scrolls or taps outside the given elements. */
export function useDismiss(active: boolean, onDismiss: () => void, refs: RefObject<HTMLElement | null>[], onScroll = true) {
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!refs.some((r) => r.current?.contains(t))) onDismiss();
    };
    const scroll = () => onDismiss();
    document.addEventListener("pointerdown", onDown, true);
    if (onScroll) {
      window.addEventListener("scroll", scroll, { passive: true });
      window.addEventListener("touchmove", scroll, { passive: true });
    }
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("touchmove", scroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
