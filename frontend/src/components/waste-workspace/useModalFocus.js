import { useEffect, useRef } from "react";
export function useModalFocus(open, root, onClose, busy) {
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.focus();
    function key(e) {
      if (e.key === "Escape" && !latest.current.busy) {
        e.preventDefault();
        latest.current.onClose?.();
      }
      if (e.key !== "Tab") return;
      const nodes = [
          ...root.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
          ),
        ].filter((n) => n.getClientRects().length),
        first = nodes[0],
        last = nodes.at(-1);
      if (!first) {
        e.preventDefault();
        root.current.focus();
      } else if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === root.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === root.current)
      ) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open, root]);
}
