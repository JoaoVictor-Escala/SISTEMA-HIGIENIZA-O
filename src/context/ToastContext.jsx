import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastCtx);

const CONFIG = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#15803d', icon: '#22c55e', Icon: CheckCircle },
  error:   { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', icon: '#ef4444', Icon: XCircle },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: '#f59e0b', Icon: AlertTriangle },
  info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', icon: '#3b82f6', Icon: Info },
};

function Toast({ id, message, type, onRemove }) {
  const c = CONFIG[type] || CONFIG.info;
  const { Icon } = c;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '13px 16px',
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      maxWidth: 360, minWidth: 250,
      animation: 'toastIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <Icon size={16} color={c.icon} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: c.text, lineHeight: 1.45 }}>{message}</span>
      <button onClick={() => onRemove(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: c.text, opacity: 0.5, display: 'flex', flexShrink: 0 }}>
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]); // max 5
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastCtx.Provider value={{ toast: add }}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <Toast {...t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
