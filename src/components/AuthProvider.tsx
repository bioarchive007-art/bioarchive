'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '@/config';
import { decodeGoogleCredential, isAuthorizedEmail } from '@/lib/auth';

interface AuthUser {
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: AuthUser | null;
  idToken: string | null;
  showLogin: boolean;
  setShowLogin: (show: boolean) => void;
  logout: () => void;
  triggerLogin: (callback?: () => void) => void;
  loginSuccessCallback: (() => void) | null;
  siteConfig: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  idToken: null,
  showLogin: false,
  setShowLogin: () => {},
  logout: () => {},
  triggerLogin: () => {},
  loginSuccessCallback: null,
  siteConfig: {
    collectEmails: true,
    collectUserAgents: true,
    collectTimestamps: true,
    renameFiles: true,
    requireModeration: true,
    restrictToInstitutionalEmail: true,
    enableFilePreviews: true,
    enableReferenceBooks: true,
    enableUploads: true,
    enableFileRequests: true,
    enableNotices: true,
    enableSearch: true,
    enableDownloadLogging: true,
    enableContactForm: true,
    enableDownloads: true,
    requireNiserToUpload: true,
    requireNiserToDownload: true,
  },
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginSuccessCallback, setLoginSuccessCallback] = useState<(() => void) | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [siteConfig, setSiteConfig] = useState<any>({
    collectEmails: true,
    collectUserAgents: true,
    collectTimestamps: true,
    renameFiles: true,
    requireModeration: true,
    restrictToInstitutionalEmail: true,
    enableFilePreviews: true,
    enableReferenceBooks: true,
    enableUploads: true,
    enableFileRequests: true,
    enableNotices: true,
    enableSearch: true,
    enableDownloadLogging: true,
    enableContactForm: true,
    enableDownloads: true,
    requireNiserToUpload: true,
    requireNiserToDownload: true,
  });

  // Load public config on mount
  useEffect(() => {
    fetch('/api/admin/config')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => setSiteConfig(data))
      .catch(() => {});
  }, []);

  // Initialize from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const cachedUser = localStorage.getItem('bioarchive:user');
    const cachedToken = localStorage.getItem('bioarchive:idToken');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isAllowed = !siteConfig.restrictToInstitutionalEmail || isAuthorizedEmail(u.email, isDev, siteConfig.adminEmails);
        if (u && u.email && isAllowed) {
          setUser(u);
          if (cachedToken) {
            setIdToken(cachedToken);
            document.cookie = `bioarchive_token=${cachedToken}; path=/; max-age=31536000; SameSite=Lax; Secure`;
          }
        }
      } catch (e) {
        console.error('Failed to parse cached user:', e);
      }
    } else if (cachedToken) {
      const decoded = decodeGoogleCredential(cachedToken);
      if (decoded) {
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isAllowed = !siteConfig.restrictToInstitutionalEmail || isAuthorizedEmail(decoded.email, isDev, siteConfig.adminEmails);
        if (isAllowed) {
          setUser(decoded);
          setIdToken(cachedToken);
          localStorage.setItem('bioarchive:user', JSON.stringify(decoded));
          document.cookie = `bioarchive_token=${cachedToken}; path=/; max-age=31536000; SameSite=Lax; Secure`;
        } else {
          localStorage.removeItem('bioarchive:idToken');
          document.cookie = 'bioarchive_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      } else {
        localStorage.removeItem('bioarchive:idToken');
        document.cookie = 'bioarchive_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  }, [siteConfig]);

  const logout = () => {
    setUser(null);
    setIdToken(null);
    localStorage.removeItem('bioarchive:idToken');
    localStorage.removeItem('bioarchive:user');
    document.cookie = 'bioarchive_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  };

  const triggerLogin = (callback?: () => void) => {
    if (callback) {
      setLoginSuccessCallback(() => callback);
    }
    setShowLogin(true);
  };

  // Google credential receiver callback
  const handleCredentialResponse = (response: any) => {
    const credential = response.credential;
    if (!credential) return;

    const decoded = decodeGoogleCredential(credential);
    if (!decoded) return;

    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isAllowed = !siteConfig.restrictToInstitutionalEmail || isAuthorizedEmail(decoded.email, isDev, siteConfig.adminEmails);
    if (!isAllowed) {
      alert(`Access Restricted: Only @niser.ac.in accounts are permitted. Your email "${decoded.email}" is not authorized.`);
      return;
    }

    setUser(decoded);
    setIdToken(credential);
    localStorage.setItem('bioarchive:idToken', credential);
    localStorage.setItem('bioarchive:user', JSON.stringify(decoded));
    document.cookie = `bioarchive_token=${credential}; path=/; max-age=31536000; SameSite=Lax; Secure`;
    setShowLogin(false);

    // Call Login history logging API (fire-and-forget)
    fetch('/api/auth/login-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: decoded.email, name: decoded.name }),
    }).catch((err) => console.error('[AuthProvider] Failed to log login:', err));

    // If there was a callback pending, execute it
    if (loginSuccessCallback) {
      loginSuccessCallback();
      setLoginSuccessCallback(null);
    }
  };

  // Set up Google One-Tap/button global listener once script loads
  useEffect(() => {
    if (!isMounted) return;

    const initGoogleGSI = () => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: CONFIG.GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
        });
      }
    };

    // Poll for google script to be loaded
    const interval = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        initGoogleGSI();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isMounted, loginSuccessCallback, siteConfig]);

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        showLogin,
        setShowLogin,
        logout,
        triggerLogin,
        loginSuccessCallback,
        siteConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
