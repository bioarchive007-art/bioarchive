'use client';

import React from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="template-fade-in" style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      animation: 'templateFadeIn 0.3s ease-out both',
    }}>
      {children}
      <style jsx>{`
        @keyframes templateFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
