import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function CollectionDialog({
  title,
  onClose,
  busy = false,
  children,
}) {
  const root = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const locked = useRef(busy);
  locked.current = busy;
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.focus();
    function keydown(e) {
      if (e.key === "Escape" && !locked.current) {
        e.preventDefault();
        close.current();
      }
      if (e.key !== "Tab") return;
      const controls = [
        ...root.current.querySelectorAll(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
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
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div
      className="modal d-block collection-workspace-dialog"
      style={{
        background: "rgba(15,23,42,.6)",
        zIndex: 10050,
        overflowY: "auto",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div
          className="modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby="collection-dialog-title"
          tabIndex={-1}
          ref={root}
        >
          <div className="modal-header">
            <h2 className="modal-title fs-20" id="collection-dialog-title">
              {title}
            </h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar detalhes"
              onClick={onClose}
              disabled={busy}
            />
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
