'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '@/config';
import { decodeGoogleCredential, isAuthorizedEmail, checkIsDev } from '@/lib/auth';

interface AuthUser {
  email: string;
  name: string;
  picture: string;
  isAdmin?: boolean;
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
    enableBookRequests: true,
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
  // configLoaded tracks whether the real server config has been fetched.
  // Session restoration is gated on this flag to prevent a race condition
  // where a non-NISER user's cached session is accepted before the actual
  // restrictToInstitutionalEmail value arrives from the server.
  const [configLoaded, setConfigLoaded] = useState(false);
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
    enableBookRequests: true,
    enableNotices: true,
    enableSearch: true,
    enableDownloadLogging: true,
    enableContactForm: true,
    enableDownloads: true,
    requireNiserToUpload: true,
    requireNiserToDownload: true,
  });

  // Load public config on mount — mark configLoaded once we have the real value.
  useEffect(() => {
    fetch('/api/admin/config')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        setSiteConfig(data);
        setConfigLoaded(true);
      })
      .catch(() => {
        // If fetch fails, unblock session restore with default config.
        setConfigLoaded(true);
      });
  }, []);

  const clearSession = () => {
    setUser(null);
    setIdToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bioarchive:idToken');
      localStorage.removeItem('bioarchive:user');
    }
    document.cookie = 'bioarchive_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  };

  const logout = clearSession;

  // Session restore — only runs after the real config has been fetched.
  // This prevents accepting a cached non-NISER session when the restriction
  // was just enabled and the config hasn't loaded yet.
  useEffect(() => {
    if (!configLoaded) return;

    setIsMounted(true);
    const cachedUser = localStorage.getItem('bioarchive:user');
    const cachedToken = localStorage.getItem('bioarchive:idToken');

    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        const isDev = checkIsDev();
        const isAllowed = !siteConfig.restrictToInstitutionalEmail || isAuthorizedEmail(u.email, isDev) || u.isAdmin;
        if (u && u.email && isAllowed) {
          setUser(u);
          if (cachedToken) {
            setIdToken(cachedToken);
            document.cookie = `bioarchive_token=${cachedToken}; path=/; max-age=15552000; SameSite=Lax; Secure`;
          }
        } else {
          // Config changed — user no longer meets the domain requirement.
          clearSession();
        }
      } catch (e) {
        console.error('Failed to parse cached user:', e);
        clearSession();
      }
    } else if (cachedToken) {
      const decoded = decodeGoogleCredential(cachedToken);
      if (decoded) {
        const isDev = checkIsDev();
        const isAllowed = !siteConfig.restrictToInstitutionalEmail || isAuthorizedEmail(decoded.email, isDev);
        if (isAllowed) {
          setUser(decoded);
          setIdToken(cachedToken);
          localStorage.setItem('bioarchive:user', JSON.stringify(decoded));
          document.cookie = `bioarchive_token=${cachedToken}; path=/; max-age=15552000; SameSite=Lax; Secure`;
        } else {
          clearSession();
        }
      } else {
        clearSession();
      }
    }
  // Re-run whenever config is freshly loaded OR when siteConfig changes (admin toggled a setting).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoaded, siteConfig]);

  // Re-validate the ACTIVE user whenever siteConfig changes (e.g. admin toggles
  // restrictToInstitutionalEmail at runtime). Immediately logs out anyone who
  // no longer meets the new requirement without requiring a page refresh.
  useEffect(() => {
    if (!configLoaded || !user) return;
    const isDev = checkIsDev();
    const isAllowed = !siteConfig.restrictToInstitutionalEmail || isAuthorizedEmail(user.email, isDev) || user.isAdmin;
    if (!isAllowed) {
      clearSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteConfig, configLoaded]);

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

    const isDev = checkIsDev();

    // Optimistically set the session on client
    setUser(decoded);
    setIdToken(credential);
    localStorage.setItem('bioarchive:idToken', credential);
    localStorage.setItem('bioarchive:user', JSON.stringify(decoded));
    document.cookie = `bioarchive_token=${credential}; path=/; max-age=15552000; SameSite=Lax; Secure`;
    setShowLogin(false);

    // Call Login history logging API and verify role/access
    fetch('/api/auth/login-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credential}`,
      },
      body: JSON.stringify({}),
    })
    .then((res) => {
      if (res.ok) return res.json();
      throw new Error('Verification failed');
    })
    .then((data) => {
      const isNiser = decoded.email.toLowerCase().endsWith('@niser.ac.in');
      const isAdmin = data.isAdmin === true;
      const isAllowedLogin = !siteConfig.restrictToInstitutionalEmail || isNiser || isAdmin || isDev;

      if (!isAllowedLogin) {
        alert(`Access Restricted: Only @niser.ac.in accounts are permitted. Your email "${decoded.email}" is not authorized.`);
        clearSession();
      } else if (isAdmin) {
        // Cache isAdmin property in user object
        const updatedUser = { ...decoded, isAdmin: true };
        setUser(updatedUser);
        localStorage.setItem('bioarchive:user', JSON.stringify(updatedUser));
      }
    })
    .catch((err) => {
      console.error('[AuthProvider] Verification failed:', err);
      // Re-validate strictly on load. If the restrictions are enabled and email is not allowed, clear
      const isNiser = decoded.email.toLowerCase().endsWith('@niser.ac.in');
      const isAllowedLogin = !siteConfig.restrictToInstitutionalEmail || isNiser || isDev;
      if (!isAllowedLogin) {
        clearSession();
      }
    });

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
