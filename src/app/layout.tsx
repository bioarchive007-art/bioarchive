import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BioArchive | NISER Biology Resources',
  description:
    'The definitive study material portal for NISER SBS Students. Access question papers, notes, slides, lab materials, and more.',
  themeColor: '#0a1a0f',
  other: {
    'color-scheme': 'dark',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
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
            <em>Bio</em>Archive
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
