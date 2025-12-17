import React, { createContext, useContext, useMemo, useState } from "react";
import AlertModal from "./AlertModal";

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const [state, setState] = useState({
    open: false,
    title: "Notice",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
    cancelText: "Cancel",
    isLoading: false,
    disableClose: false,
  });

  const close = () =>
    setState((s) => ({ ...s, open: false, onConfirm: null, isLoading: false }));

  const alert = (message, options = {}) => {
    setState({
      open: true,
      title: options.title || "Notice",
      message,
      onConfirm: null, // OK only
      confirmText: options.confirmText || "Confirm",
      cancelText: options.cancelText || "Cancel",
      isLoading: !!options.isLoading,
      disableClose: !!options.disableClose,
    });
  };

  // Promise-based confirm (super convenient)
  const confirm = (message, options = {}) =>
    new Promise((resolve) => {
      setState({
        open: true,
        title: options.title || "Confirm",
        message,
        confirmText: options.confirmText || "Yes",
        cancelText: options.cancelText || "No",
        disableClose: !!options.disableClose,
        isLoading: false,
        onConfirm: () => {
          close();
          resolve(true);
        },
      });

      // cancel/close => resolve(false)
      const originalClose = close;
      const cancelClose = () => {
        originalClose();
        resolve(false);
      };

      // patch close behavior for this confirm instance
      setState((s) => ({ ...s, onCloseOverride: cancelClose }));
    });

  // Support close override for confirm
  const handleClose = () => {
    if (state.onCloseOverride) return state.onCloseOverride();
    close();
  };

  const api = useMemo(() => ({ alert, confirm, close }), [state]);

  return (
    <AlertContext.Provider value={api}>
      {children}
      <AlertModal
        open={state.open}
        title={state.title}
        message={state.message}
        onClose={handleClose}
        onConfirm={state.onConfirm || undefined}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        isLoading={state.isLoading}
        disableClose={state.disableClose}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used inside <AlertProvider />");
  return ctx;
};
