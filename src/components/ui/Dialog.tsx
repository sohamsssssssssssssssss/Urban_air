"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

/**
 * A modal dialog built on the native <dialog>: the browser traps focus, makes the rest of the page inert, closes on Esc
 * and returns focus to the control that opened it. Clicking the backdrop also closes it.
 */
export default function Dialog({ open, onClose, title, closeLabel, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref} aria-labelledby={`${id}-t`} onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-card border border-line bg-surface p-0 text-ink shadow-raised"
    >
      {open && (
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id={`${id}-t`} className="text-xl font-bold tracking-tight">{title}</h2>
            <button type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-control border border-line-strong px-3 font-semibold hover:bg-sunken">
              <span aria-hidden="true">✕</span>
              <span className="sr-only">{closeLabel}</span>
            </button>
          </div>
          <div className="mt-3">{children}</div>
        </div>
      )}
    </dialog>
  );
}
