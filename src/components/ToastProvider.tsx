import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";
import { ToastContext, type ToastKind } from "./ToastContext";
type ToastItem = { id: number; message: string; kind: ToastKind };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = ++nextId.current;
      setToasts((current) => [...current, { id, message, kind }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 4500),
      );
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div
            aria-live={toast.kind === "error" ? "assertive" : "polite"}
            className={`toast toast-${toast.kind}`}
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
          >
            <span className="toast-icon">
              <Icon name={toast.kind === "success" ? "check" : "alert"} size={18} />
            </span>
            <span>{toast.message}</span>
            <button aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
