import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Cinzel, Outfit, Plus_Jakarta_Sans, Tangerine } from 'next/font/google';

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (sessionStorage.getItem('ba-loaded')) {
                  document.documentElement.classList.add('fast-load');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        {/* Ambient background */}
        <div className="orb-bg" aria-hidden="true" />

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

        {/* Inline script: hide loading screen, reveal page */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var delay = 350;
                try {
                  if (sessionStorage.getItem('ba-loaded')) {
                    delay = 0;
                  } else {
                    sessionStorage.setItem('ba-loaded', 'true');
                  }
                } catch (e) {}

                var transitionOut = function() {
                  var ls = document.getElementById('loading-screen');
                  var pc = document.getElementById('page-content');
                  if (ls) ls.classList.add('hidden');
                  if (pc) pc.classList.add('visible');
                };

                if (delay === 0) {
                  transitionOut();
                } else {
                  var t = setTimeout(transitionOut, delay);
                  window.addEventListener('load', function() {
                    clearTimeout(t);
                    transitionOut();
                  });
                  window.__bioarchiveLoadingTimer = t;
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
