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
      <head />
      <body>
        {/* Ambient orb background */}
        <div className="orb-bg" aria-hidden="true">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="orb orb-4" />

          {/* Floating Hand-Drawn Biological Diagrams (optimized: 7 drawings) */}
          <svg className="drawing drawing-1" viewBox="0 0 80 120" width="70" height="100">
            <path d="M20,10 C40,25 40,45 20,60 C0,75 0,95 20,110" />
            <path d="M60,10 C40,25 40,45 60,60 C80,75 80,95 60,110" />
            <line x1="28" y1="18" x2="52" y2="18" />
            <line x1="38" y1="32" x2="42" y2="32" />
            <line x1="32" y1="48" x2="48" y2="48" />
            <line x1="20" y1="60" x2="60" y2="60" />
            <line x1="32" y1="72" x2="48" y2="72" />
          </svg>

          <svg className="drawing drawing-2" viewBox="0 0 100 100" width="80" height="80">
            <circle cx="50" cy="50" r="10" strokeDasharray="3 3" />
            <circle cx="50" cy="20" r="3" /><line x1="50" y1="23" x2="50" y2="35" />
            <circle cx="71" cy="29" r="3" /><line x1="69" y1="31" x2="60" y2="40" />
            <circle cx="80" cy="50" r="3" /><line x1="77" y1="50" x2="65" y2="50" />
            <circle cx="29" cy="71" r="3" /><line x1="31" y1="69" x2="40" y2="60" />
            <circle cx="20" cy="50" r="3" /><line x1="23" y1="50" x2="35" y2="50" />
          </svg>

          <svg className="drawing drawing-3" viewBox="0 0 120 70" width="100" height="60">
            <path d="M40,22 C60,20 75,25 75,35 C75,45 60,50 40,48 C20,46 15,40 15,32 C15,24 20,24 40,22 Z" />
            <path d="M15,32 C5,28 -5,35 -15,30" />
            <path d="M17,36 C7,42 -2,35 -12,45" />
          </svg>

          <svg className="drawing drawing-4" viewBox="0 0 100 100" width="80" height="80">
            <path d="M15,50 L35,35 L55,50 L75,35 L90,45" />
            <path d="M35,35 L35,15" />
            <path d="M55,50 L55,70" />
            <circle cx="15" cy="50" r="3.5" />
            <circle cx="35" cy="15" r="3.5" />
            <circle cx="75" cy="35" r="3.5" />
            <circle cx="90" cy="45" r="3.5" />
          </svg>

          <svg className="drawing drawing-5" viewBox="0 0 100 100" width="80" height="80">
            <path d="M20,50 C20,20 50,15 65,30 C80,45 80,65 60,75 C40,85 20,80 35,60 C50,40 70,55 85,50" />
            <line x1="35" y1="32" x2="48" y2="35" />
            <line x1="42" y1="22" x2="52" y2="28" />
            <line x1="58" y1="48" x2="48" y2="52" />
          </svg>

          <svg className="drawing drawing-6" viewBox="0 0 100 100" width="85" height="85">
            <polygon points="50,20 80,37 80,72 50,89 20,72 20,37" />
            <line x1="50" y1="20" x2="50" y2="8" />
            <line x1="80" y1="37" x2="90" y2="31" />
            <line x1="80" y1="72" x2="90" y2="78" />
            <line x1="50" y1="89" x2="50" y2="96" />
            <line x1="20" y1="72" x2="10" y2="78" />
            <line x1="20" y1="37" x2="10" y2="31" />
            <circle cx="50" cy="8" r="2" />
            <circle cx="90" cy="31" r="2" />
            <circle cx="10" cy="78" r="2" />
          </svg>

          <svg className="drawing drawing-7" viewBox="0 0 100 100" width="80" height="80">
            <path d="M50,90 L50,70 C43,70 38,73 35,70 C28,64 28,48 38,52 C41,54 43,60 43,64 C47,60 43,45 50,38 C57,45 53,60 57,64 C57,60 59,54 62,52 C72,48 72,64 65,70 C62,73 57,70 50,70 L50,90" />
            <line x1="47" y1="78" x2="53" y2="78" />
            <line x1="47" y1="52" x2="53" y2="52" />
          </svg>
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
