'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Upload, AlertCircle, Info, LogOut, Lock, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import GlobalSearch from './GlobalSearch';

interface NavbarProps {
  onUploadClick: () => void;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

const getInitials = (name: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function Navbar({ onUploadClick }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const { user, logout, triggerLogin, siteConfig } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const isAdmin = !!(user && user.isAdmin);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUploadClick = () => {
    onUploadClick();
  };

  return (
    <>
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="navbar"
      >
        <div className="navbar-inner">
          {/* Left section */}
          <div className="navbar-left">
            <button
              className="navbar-hamburger"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Link href="/" passHref legacyBehavior>
              <motion.a
                className="navbar-wordmark"
                style={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
              >
                <span className="wordmark-bio">Bio</span>
                <span className="wordmark-archive">Archive</span>
              </motion.a>
            </Link>
            <div className="navbar-links">
              {siteConfig?.enableNotices !== false && <Link href="/notices" className="nav-link">Notices</Link>}
              {siteConfig?.enableFileRequests !== false && (
                <Link href="/requests" className="nav-link">Requests</Link>
              )}
              <Link href="/about" className="nav-link">About</Link>
            </div>
          </div>

          {/* Right section */}
          <div className="navbar-right">
            <span className="navbar-label">NISER · SBS</span>

            {user ? (
              <div className="navbar-user-container" style={{ position: 'relative' }}>
                <button
                  className="navbar-user-btn"
                  onClick={() => setShowDropdown(!showDropdown)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    padding: '4px'
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '1px solid var(--glass-border-hover)',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--green-light)',
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <span className="navbar-username" style={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                    {user.name.split(' ')[0]}
                  </span>
                </button>
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      className="navbar-user-dropdown"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        background: 'var(--bg2)',
                        border: '1px solid var(--glass-border-hover)',
                        borderRadius: '10px',
                        padding: '8px',
                        minWidth: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        boxShadow: 'var(--glass-shadow-hover)',
                        zIndex: 200,
                        marginTop: '8px'
                      }}
                    >
                      <div className="dropdown-user-info" style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        color: 'var(--text-3)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        paddingBottom: '8px',
                        marginBottom: '4px',
                        wordBreak: 'break-all',
                        fontFamily: "'Outfit', sans-serif"
                      }}>
                        {user.email}
                      </div>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setShowDropdown(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--green-light)',
                            padding: '6px 8px',
                            width: '100%',
                            textAlign: 'left',
                            fontSize: '0.76rem',
                            borderRadius: '6px',
                            fontFamily: "'Outfit', sans-serif",
                            textDecoration: 'none',
                            transition: 'background 0.2s',
                          }}
                        >
                          <Lock size={12} />
                          <span>Admin Panel</span>
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          logout();
                          setShowDropdown(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#f87171',
                          padding: '6px 8px',
                          width: '100%',
                          textAlign: 'left',
                          fontSize: '0.76rem',
                          borderRadius: '6px',
                          fontFamily: "'Outfit', sans-serif"
                        }}
                      >
                        <LogOut size={12} />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                className="navbar-login-btn"
                onClick={() => triggerLogin()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: 'var(--text-2)',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginRight: '8px'
                }}
              >
                <span>Sign In</span>
              </button>
            )}

            <button
              className="navbar-search-btn"
              onClick={() => setSearchModalOpen(true)}
              title="Search (Ctrl + K)"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-2)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginRight: '8px'
              }}
            >
              <Search size={16} />
            </button>

            {siteConfig?.enableUploads !== false && (
              <button className="navbar-upload-btn" onClick={handleUploadClick}>
                <Upload size={16} />
                <span>Upload</span>
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Global Search Modal */}
      <AnimatePresence>
        {searchModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '80px',
                paddingLeft: '16px',
                paddingRight: '16px'
              }}
              onClick={() => setSearchModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: -20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  width: '100%',
                  maxWidth: '680px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <GlobalSearch autoFocus onClose={() => setSearchModalOpen(false)} />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mobile-menu-backdrop"
              onClick={() => setIsOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="mobile-menu-drawer"
            >
              <div className="mobile-menu-links">
                {user ? (
                  <div className="mobile-menu-user" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '12px 8px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: '1px solid var(--glass-border-hover)',
                          background: 'rgba(255,255,255,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: 'var(--green-light)',
                          fontFamily: "'Outfit', sans-serif"
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>{user.name}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: "'Outfit', sans-serif" }}>{user.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        color: '#f87171',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        width: 'fit-content',
                        fontFamily: "'Outfit', sans-serif",
                        cursor: 'pointer'
                      }}
                    >
                      <LogOut size={12} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <button
                    className="mobile-menu-link"
                    onClick={() => {
                      setIsOpen(false);
                      triggerLogin();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Sign In</span>
                  </button>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="mobile-menu-link"
                    onClick={() => setIsOpen(false)}
                    style={{ color: 'var(--green-light)' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Lock size={14} />
                      <span>Admin Panel</span>
                    </span>
                  </Link>
                )}

                {siteConfig?.enableNotices !== false && (
                  <Link
                    href="/notices"
                    className="mobile-menu-link"
                    onClick={() => setIsOpen(false)}
                  >
                    <span>Notices</span>
                  </Link>
                )}
                {siteConfig?.enableFileRequests !== false && (
                  <Link
                    href="/requests"
                    className="mobile-menu-link"
                    onClick={() => setIsOpen(false)}
                  >
                    <span>Requests</span>
                  </Link>
                )}
                <Link
                  href="/about"
                  className="mobile-menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <span>About</span>
                </Link>
                {siteConfig?.enableUploads !== false && (
                  <button
                    className="mobile-menu-upload-btn"
                    onClick={() => {
                      setIsOpen(false);
                      handleUploadClick();
                    }}
                  >
                    <Upload size={16} />
                    <span>Upload Material</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
