"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

type ToastOptions = { type?: "success" | "error"; action?: { label: string; onClick: () => void }; duration?: number };
type ToastItem = { id: number; message: string; leaving: boolean } & ToastOptions;
type ToastFn = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ToastFn>(() => {});

/** Confirmation and error messages that appear briefly after an action. */
export function useToast(): ToastFn {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems(list => list.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems(list => list.filter(t => t.id !== id)), 180);
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback<ToastFn>(
    (message, options = {}) => {
      const id = nextId.current++;
      // Keep at most three on screen; the newest replaces the oldest.
      setItems(list => [...list.slice(-2), { id, message, leaving: false, ...options }]);
      const duration = options.duration ?? (options.type === "error" ? 6000 : options.action ? 6000 : 3200);
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications">
        {items.map(t => (
          <div key={t.id} className={`toast${t.type === "error" ? " toast--error" : ""}${t.leaving ? " is-leaving" : ""}`} role={t.type === "error" ? "alert" : "status"}>
            {t.type === "error" ? <CircleAlert size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
