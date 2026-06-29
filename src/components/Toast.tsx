'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: 'calc(100% - 48px)',
        pointerEvents: 'none'
      }}>
        <AnimatePresence>
          {toasts.map((t) => {
            let icon = <Info size={16} style={{ color: 'var(--gold)' }} />;
            let borderColor = 'rgba(212, 168, 83, 0.25)';
            let glowColor = 'rgba(212, 168, 83, 0.08)';
            
            if (t.type === 'success') {
              icon = <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
              borderColor = 'rgba(16, 185, 129, 0.25)';
              glowColor = 'rgba(16, 185, 129, 0.08)';
            } else if (t.type === 'error') {
              icon = <AlertTriangle size={16} style={{ color: '#ef4444' }} />;
              borderColor = 'rgba(239, 68, 68, 0.25)';
              glowColor = 'rgba(239, 68, 68, 0.08)';
            }

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                style={{
                  background: 'rgba(3, 10, 24, 0.75)',
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  border: `1px solid ${borderColor}`,
                  boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 15px ${glowColor}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#f0f0f0',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.84rem',
                  lineHeight: '1.4',
                  pointerEvents: 'auto',
                }}
              >
                <div style={{ flexShrink: 0 }}>{icon}</div>
                <div style={{ flexGrow: 1, marginRight: '4px' }}>{t.message}</div>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    borderRadius: '4px',
                    transition: 'color 0.15s, background 0.15s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
