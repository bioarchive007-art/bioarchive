import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Cinzel, Outfit, Plus_Jakarta_Sans, Tangerine } from 'next/font/google';
import Script from 'next/script';
import AuthProvider from '@/components/AuthProvider';
import LayoutLoginModalWrapper from '@/components/LayoutLoginModalWrapper';

const fontCinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600', '700', '900'],
  variable: '--font-cinzel',
  display: 'swap',
});

const fontOutfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

const fontPlusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const fontTangerine = Tangerine({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-tangerine',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BioArchive | NISER Biology Resources',
  description:
    'The definitive study material portal for NISER SBS Students. Access question papers, notes, slides, lab materials, and more.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'manifest', url: '/site.webmanifest' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a1a0f',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <html
      lang="en"
      className={`${fontCinzel.variable} ${fontOutfit.variable} ${fontPlusJakartaSans.variable} ${fontTangerine.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body>
        <AuthProvider>
          {/* Google Identity Services */}
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
          />

          {/* Google Analytics */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-CZS52D25M3"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-CZS52D25M3');
            `}
          </Script>

          {/* Ambient background */}
          <div className="orb-bg" aria-hidden="true">
            <div className="orb-1" />
            <div className="orb-2" />
            <div className="orb-3" />
            <div className="orb-4" />
          </div>

          {/* Loading screen */}
          <div className="loading-screen" id="loading-screen">
            <div className="book-container">
              <div className="book-wrap">
                <div className="book-cover left" />
                <div className="book-spine-3d" />
                <div className="book-cover right" />
                <div className="page-stack left" />
                <div className="page-stack right" />
                <div className="flipping-pages">
                  <div className="flipping-page" />
                  <div className="flipping-page" />
                  <div className="flipping-page" />
                </div>
                <div className="book-ribbon" />
              </div>
            </div>
            <div className="loader-wordmark">
              <span>Bio</span><span className="loader-archive">Archive</span>
            </div>
            <span className="loader-tag">NISER · Biological Sciences</span>
          </div>

          {/* Page content */}
          <div className="page-content" id="page-content">
            {children}
            <footer className="site-footer">
              BioArchive © {year} · Managed by BIO-Archive.
            </footer>
          </div>

          <LayoutLoginModalWrapper />
        </AuthProvider>

        {/* Inline script: hide loading screen, reveal page */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var t = setTimeout(function() {
                  var ls = document.getElementById('loading-screen');
                  var pc = document.getElementById('page-content');
                  if (ls) ls.classList.add('hidden');
                  if (pc) pc.classList.add('visible');
                }, 1800);
                window.__bioarchiveLoadingTimer = t;
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
