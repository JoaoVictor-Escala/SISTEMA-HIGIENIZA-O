import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

const ConfirmCtx = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => useContext(ConfirmCtx);

const PRESETS = {
  danger: {
    Icon: Trash2,
    iconBg: 'linear-gradient(135deg, #fee2e2, #fecaca)',
    iconColor: '#e11d48',
    confirmBg: 'linear-gradient(135deg, #f43f5e, #e11d48)',
    confirmShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
    confirmHover: 'linear-gradient(135deg, #e11d48, #be123c)',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    iconColor: '#d97706',
    confirmBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    confirmShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
    confirmHover: 'linear-gradient(135deg, #d97706, #b45309)',
  },
  info: {
    Icon: Info,
    iconBg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    iconColor: '#2563eb',
    confirmBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    confirmShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
    confirmHover: 'linear-gradient(135deg, #4f46e5, #4338ca)',
  },
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const [inputValue, setInputValue] = useState('');

  const confirm = useCallback(({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'danger' }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setInputValue('');
      setState({ title, message, confirmText, cancelText, type, isPrompt: false });
    });
  }, []);

  const prompt = useCallback(({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'info', placeholder = '' }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setInputValue('');
      setState({ title, message, confirmText, cancelText, type, isPrompt: true, placeholder });
    });
  }, []);

  const handleConfirm = () => {
    if (state?.isPrompt) {
      resolveRef.current?.(inputValue);
    } else {
      resolveRef.current?.(true);
    }
    setState(null);
  };

  const handleCancel = () => {
    if (state?.isPrompt) {
      resolveRef.current?.(null);
    } else {
      resolveRef.current?.(false);
    }
    setState(null);
  };

  const preset = state ? (PRESETS[state.type] || PRESETS.danger) : PRESETS.danger;
  const IconComponent = preset.Icon;

  return (
    <ConfirmCtx.Provider value={{ confirm, prompt }}>
      {children}

      {state && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
            animation: 'confirmOverlayIn 0.2s ease-out',
          }}
          onClick={(e) => e.target === e.currentTarget && handleCancel()}
        >
          <div
            style={{
              background: 'var(--white)',
              borderRadius: 20,
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.08)',
              width: '100%',
              maxWidth: 400,
              overflow: 'hidden',
              animation: 'confirmModalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleCancel}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: 'var(--gray-400)',
                borderRadius: 6,
                display: 'flex',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.target.style.background = 'var(--gray-100)'; e.target.style.color = 'var(--gray-600)'; }}
              onMouseLeave={(e) => { e.target.style.background = 'none'; e.target.style.color = 'var(--gray-400)'; }}
            >
              <X size={16} />
            </button>

            {/* Body */}
            <div style={{ padding: '32px 28px 24px', textAlign: 'center', position: 'relative' }}>
              {/* Icon */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: preset.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              }}>
                <IconComponent size={26} color={preset.iconColor} />
              </div>

              {/* Title */}
              <h3 style={{
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--gray-900)',
                marginBottom: 8,
                letterSpacing: '-0.3px',
              }}>
                {state.title}
              </h3>

              {/* Message */}
              <p style={{
                fontSize: 13.5,
                color: 'var(--gray-500)',
                lineHeight: 1.55,
                maxWidth: 300,
                margin: '0 auto',
                marginBottom: state.isPrompt ? 16 : 0,
              }}>
                {state.message}
              </p>

              {state.isPrompt && (
                <div style={{ marginTop: 16 }}>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={state.placeholder}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirm();
                      if (e.key === 'Escape') handleCancel();
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: '1px solid var(--gray-200)',
                      background: 'var(--gray-50)',
                      fontSize: 14,
                      color: 'var(--gray-800)',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = preset.iconColor;
                      e.target.style.background = 'var(--white)';
                      e.target.style.boxShadow = `0 0 0 3px ${preset.iconColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--gray-200)';
                      e.target.style.background = 'var(--gray-50)';
                      e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 28px 24px',
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
            }}>
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: '11px 20px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  border: '1px solid var(--gray-200)',
                  background: 'var(--white)',
                  color: 'var(--gray-600)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.target.style.background = 'var(--gray-50)'; e.target.style.borderColor = 'var(--gray-300)'; }}
                onMouseLeave={(e) => { e.target.style.background = 'var(--white)'; e.target.style.borderColor = 'var(--gray-200)'; }}
              >
                {state.cancelText}
              </button>

              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  padding: '11px 20px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  border: 'none',
                  background: preset.confirmBg,
                  color: '#fff',
                  cursor: 'pointer',
                  boxShadow: preset.confirmShadow,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.target.style.background = preset.confirmHover; e.target.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.target.style.background = preset.confirmBg; e.target.style.transform = 'translateY(0)'; }}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes confirmOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes confirmModalIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </ConfirmCtx.Provider>
  );
}
