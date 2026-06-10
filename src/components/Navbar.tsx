'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Upload, BookOpen, AlertCircle, Info } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface NavbarProps {
  onUploadClick: () => void;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export default function Navbar({ onUploadClick }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

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
            <motion.a
              href="/"
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
            <div className="navbar-links">
              <a href="/" className="nav-link">Curriculum</a>
              <a href="/board" className="nav-link">Notices & Requests</a>
              <a href="/about" className="nav-link">About & Contact</a>
            </div>
          </div>

          {/* Right section */}
          <div className="navbar-right">
            <span className="navbar-label">NISER · SBS</span>
            <button className="navbar-upload-btn" onClick={onUploadClick}>
              <Upload size={16} />
              <span>Upload</span>
            </button>
          </div>
        </div>
      </motion.nav>

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
                <a
                  href="/"
                  className="mobile-menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <BookOpen size={16} />
                  <span>Curriculum</span>
                </a>
                <a
                  href="/board"
                  className="mobile-menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <AlertCircle size={16} />
                  <span>Notices & Requests</span>
                </a>
                <a
                  href="/about"
                  className="mobile-menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <Info size={16} />
                  <span>About & Contact</span>
                </a>
                <button
                  className="mobile-menu-upload-btn"
                  onClick={() => {
                    setIsOpen(false);
                    onUploadClick();
                  }}
                >
                  <Upload size={16} />
                  <span>Upload Material</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
