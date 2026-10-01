import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback((type, message) => {
    // Skip if the same message is already showing - e.g. a background poll
    // and a foreground request can both fail from the same dead session and
    // each try to toast about it independently; without this the user would
    // see the identical message stacked twice for one real event.
    setToasts((t) => {
      if (t.some((x) => x.type === type && x.message === message)) return t;
      const id = ++seq;
      // Errors explain what to fix, so they stay up longer than confirmations.
      timers.current[id] = setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4500);
      return [...t, { id, type, message }];
    });
  }, [dismiss]);

  const api = {
    success: (msg) => push('success', msg),
    error: (msg) => push('error', msg),
    info: (msg) => push('info', msg),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
