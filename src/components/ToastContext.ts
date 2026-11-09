import { createContext, useContext } from "react";

export type ToastKind = "success" | "error";
type ToastContextValue = { notify: (message: string, kind?: ToastKind) => void };

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return value;
}
