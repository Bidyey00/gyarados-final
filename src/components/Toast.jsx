import { createContext, useCallback, useContext, useState } from 'react';
import Icon from './Icon.jsx';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, tone = 'ok') => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`slide-in flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lift ${
              t.tone === 'error' ? 'bg-brick text-white' : 'bg-navy text-white'
            }`}
          >
            <Icon name={t.tone === 'error' ? 'alert' : 'check'} className="h-4 w-4" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
