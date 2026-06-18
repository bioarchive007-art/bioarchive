'use client';

import React from 'react';
import { useAuth } from './AuthProvider';
import LoginModal from './LoginModal';

export default function LayoutLoginModalWrapper() {
  const { showLogin, setShowLogin } = useAuth();
  return <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />;
}
