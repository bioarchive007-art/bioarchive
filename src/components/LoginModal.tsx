'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Lock } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    // Render Google Sign-in Button in the container
    const renderGoogleBtn = () => {
      const element = document.getElementById('google-signin-btn-container');
      if (element && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.renderButton(element, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 280,
        });
      }
    };

    // If script already loaded, render immediately, else check periodically
    renderGoogleBtn();
    const interval = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        renderGoogleBtn();
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="um-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ zIndex: 900 }}
        >
          <motion.div
            className="um-panel login-modal-panel"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', padding: '32px 24px', textAlign: 'center' }}
          >
            <button className="um-close" onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>

            <div className="login-modal-header" style={{ marginBottom: '20px' }}>
              <div className="lock-icon-wrap" style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(2, 132, 199, 0.12)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#38bdf8'
              }}>
                <Lock size={24} />
              </div>
              <h2 className="login-modal-title" style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '1.25rem',
                color: '#f0f0f0',
                margin: '0 0 8px'
              }}>
                NISER Access Required
              </h2>
              <p className="login-modal-subtitle" style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.84rem',
                color: '#94a3b8',
                lineHeight: '1.5',
                margin: 0
              }}>
                Please sign in with your official <strong>@niser.ac.in</strong> email account to view, download, or upload materials.
              </p>
            </div>

            <div className="login-btn-section" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '24px 0 12px',
              minHeight: '46px'
            }}>
              <div id="google-signin-btn-container"></div>
            </div>

            <div className="login-modal-footer" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'center',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '0.68rem',
              color: '#64748b',
              fontFamily: "'Outfit', sans-serif"
            }}>
              <ShieldAlert size={12} />
              <span>Unauthorized email domains will be blocked.</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
