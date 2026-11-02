"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [message, setMessage] = useState(null);
  const [dialogOptions, setDialogOptions] = useState({});
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const pendingRef = useRef(null);
  const previousFocusRef = useRef(null);

  const confirmAction = useCallback((description, options = {}) => {
    // Ignore repeated requests while the user is deciding.
    if (pendingRef.current) return Promise.resolve(false);
    previousFocusRef.current = document.activeElement;
    return new Promise((resolve) => {
      pendingRef.current = resolve;
      setDialogOptions(options);
      setMessage(description);
    });
  }, []);

  const finish = useCallback((confirmed) => {
    const resolve = pendingRef.current;
    pendingRef.current = null;
    dialogRef.current?.close();
    setMessage(null);
    previousFocusRef.current?.focus?.();
    resolve?.(confirmed);
  }, []);

  useEffect(() => {
    if (!message) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [message]);

  useEffect(() => () => {
    pendingRef.current?.(false);
    pendingRef.current = null;
  }, []);

  return (
    <ConfirmationContext.Provider value={confirmAction}>
      {children}
      {message && createPortal(
        <dialog
          ref={dialogRef}
          aria-labelledby="confirmation-title"
          aria-describedby="confirmation-description"
          onCancel={(event) => { event.preventDefault(); finish(false); }}
          onClose={() => { if (pendingRef.current) finish(false); }}
          className="confirmation-dialog animate-modal-in fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-[#ebe8e5] bg-white p-0 text-[#292524] shadow-2xl backdrop:bg-[#292524]/45 backdrop:backdrop-blur-sm"
        >
          <div className="p-6 sm:p-7">
            <div aria-hidden="true" className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1ed] text-[#ad5847]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v5m0 3h.01" />
                <path d="M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <h2 id="confirmation-title" className="text-xl font-semibold">{dialogOptions.title || "Confirmar exclusão"}</h2>
            <p id="confirmation-description" className="mt-3 text-sm leading-6 text-[#78716c]">{message}</p>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-[#f0edeb] bg-[#fcfbfa] px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button ref={cancelRef} type="button" onClick={() => finish(false)} className="rounded-xl border border-[#ded8d4] bg-white px-5 py-2.5 text-sm font-semibold text-[#675e59] hover:bg-[#f5f3f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b6d64]">Cancelar</button>
            <button type="button" onClick={() => finish(true)} className="rounded-xl bg-[#ad5847] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#944a3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad5847]">{dialogOptions.confirmLabel || "Sim, excluir"}</button>
          </div>
        </dialog>, document.body
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const confirmAction = useContext(ConfirmationContext);
  if (!confirmAction) throw new Error("useConfirmation requer ConfirmationProvider.");
  return confirmAction;
}
