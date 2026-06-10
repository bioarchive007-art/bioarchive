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

          {/* Floating Hand-Drawn Biological Diagrams */}
          <svg className="drawing drawing-1" viewBox="0 0 80 120" width="70" height="100">
            <path d="M20,10 C40,25 40,45 20,60 C0,75 0,95 20,110" />
            <path d="M60,10 C40,25 40,45 60,60 C80,75 80,95 60,110" />
            <line x1="28" y1="18" x2="52" y2="18" />
            <line x1="38" y1="32" x2="42" y2="32" />
            <line x1="32" y1="48" x2="48" y2="48" />
            <line x1="20" y1="60" x2="60" y2="60" />
            <line x1="32" y1="72" x2="48" y2="72" />
            <line x1="38" y1="88" x2="42" y2="88" />
            <line x1="28" y1="102" x2="52" y2="102" />
          </svg>

          <svg className="drawing drawing-2" viewBox="0 0 100 100" width="80" height="80">
            <circle cx="50" cy="50" r="10" strokeDasharray="3 3" />
            <circle cx="50" cy="20" r="3" /><line x1="50" y1="23" x2="50" y2="35" />
            <circle cx="71" cy="29" r="3" /><line x1="69" y1="31" x2="60" y2="40" />
            <circle cx="80" cy="50" r="3" /><line x1="77" y1="50" x2="65" y2="50" />
            <circle cx="71" cy="71" r="3" /><line x1="69" y1="69" x2="60" y2="60" />
            <circle cx="50" cy="80" r="3" /><line x1="50" y1="77" x2="50" y2="65" />
            <circle cx="29" cy="71" r="3" /><line x1="31" y1="69" x2="40" y2="60" />
            <circle cx="20" cy="50" r="3" /><line x1="23" y1="50" x2="35" y2="50" />
            <circle cx="29" cy="29" r="3" /><line x1="31" y1="31" x2="40" y2="40" />
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
            <circle cx="55" cy="70" r="3.5" />
            <circle cx="35" cy="35" r="2" fill="currentColor" />
            <circle cx="55" cy="50" r="2" fill="currentColor" />
          </svg>

          <svg className="drawing drawing-5" viewBox="0 0 100 100" width="80" height="80">
            <path d="M20,50 C20,20 50,15 65,30 C80,45 80,65 60,75 C40,85 20,80 35,60 C50,40 70,55 85,50" />
            <line x1="35" y1="32" x2="48" y2="35" />
            <line x1="42" y1="22" x2="52" y2="28" />
            <line x1="58" y1="48" x2="48" y2="52" />
            <line x1="45" y1="68" x2="38" y2="60" />
          </svg>

          <svg className="drawing drawing-6" viewBox="0 0 120 60" width="100" height="50">
            <circle cx="20" cy="15" r="3" /><line x1="20" y1="18" x2="20" y2="26" />
            <circle cx="35" cy="15" r="3" /><line x1="35" y1="18" x2="35" y2="26" />
            <circle cx="50" cy="15" r="3" /><line x1="50" y1="18" x2="50" y2="26" />
            <circle cx="65" cy="15" r="3" /><line x1="65" y1="18" x2="65" y2="26" />
            <circle cx="80" cy="15" r="3" /><line x1="80" y1="18" x2="80" y2="26" />
            <circle cx="95" cy="15" r="3" /><line x1="95" y1="18" x2="95" y2="26" />
            <circle cx="20" cy="45" r="3" /><line x1="20" y1="42" x2="20" y2="34" />
            <circle cx="35" cy="45" r="3" /><line x1="35" y1="42" x2="35" y2="34" />
            <circle cx="50" cy="45" r="3" /><line x1="50" y1="42" x2="50" y2="34" />
            <circle cx="65" cy="45" r="3" /><line x1="65" y1="42" x2="65" y2="34" />
            <circle cx="80" cy="45" r="3" /><line x1="80" y1="42" x2="80" y2="34" />
            <circle cx="95" cy="45" r="3" /><line x1="95" y1="42" x2="95" y2="34" />
          </svg>

          <svg className="drawing drawing-7" viewBox="0 0 100 100" width="85" height="85">
            <polygon points="50,20 80,37 80,72 50,89 20,72 20,37" />
            <line x1="47" y1="26" x2="73" y2="41" />
            <line x1="75" y1="68" x2="51" y2="82" />
            <line x1="26" y1="68" x2="26" y2="41" />
            <line x1="50" y1="20" x2="50" y2="8" />
            <line x1="80" y1="37" x2="90" y2="31" />
            <line x1="80" y1="72" x2="90" y2="78" />
            <line x1="50" y1="89" x2="50" y2="96" />
            <line x1="20" y1="72" x2="10" y2="78" />
            <line x1="20" y1="37" x2="10" y2="31" />
            <circle cx="50" cy="8" r="2" />
            <circle cx="90" cy="31" r="2" />
            <circle cx="90" cy="78" r="2" />
            <circle cx="50" cy="96" r="2" />
            <circle cx="10" cy="78" r="2" />
            <circle cx="10" cy="31" r="2" />
          </svg>

          <svg className="drawing drawing-8" viewBox="0 0 120 80" width="100" height="70">
            <path d="M35,12 C55,12 52,30 60,40 C68,30 65,12 85,12 C105,12 115,25 115,40 C115,55 105,68 85,68 C65,68 68,50 60,40 C52,50 55,68 35,68 C15,68 5,55 5,40 C5,25 15,12 35,12 Z" />
            <circle cx="30" cy="40" r="4" />
            <circle cx="90" cy="40" r="4" />
            <circle cx="24" cy="32" r="2" />
            <circle cx="96" cy="32" r="2" />
          </svg>

          <svg className="drawing drawing-9" viewBox="0 0 120 70" width="100" height="60">
            <path d="M30,32 C45,28 65,28 80,32 C95,36 100,48 85,52 C70,56 50,56 35,52 C20,48 15,36 30,32 Z" />
            <path d="M40,42 Q48,36 55,44 T70,42 T80,44" strokeDasharray="2 2" />
            <path d="M22,42 C10,45 0,35 -10,48 C-18,55 -25,48 -35,58" />
            <path d="M24,46 C12,52 2,46 -8,58 C-15,64 -20,60 -28,72" />
            <line x1="45" y1="30" x2="43" y2="24" />
            <line x1="60" y1="30" x2="60" y2="24" />
            <line x1="75" y1="31" x2="77" y2="25" />
            <line x1="50" y1="54" x2="52" y2="60" />
            <line x1="65" y1="55" x2="65" y2="61" />
            <line x1="80" y1="53" x2="82" y2="59" />
          </svg>

          <svg className="drawing drawing-10" viewBox="0 0 120 100" width="100" height="85">
            <path d="M15,30 Q22,25 30,32 T45,45 T60,30 T75,45 T90,60 T105,45" />
            <circle cx="15" cy="30" r="3" fill="currentColor" />
            <circle cx="22" cy="27" r="3" fill="currentColor" />
            <circle cx="30" cy="32" r="3" fill="currentColor" />
            <circle cx="38" cy="38" r="3" fill="currentColor" />
            <circle cx="45" cy="45" r="3" fill="currentColor" />
            <circle cx="53" cy="38" r="3" fill="currentColor" />
            <circle cx="60" cy="30" r="3" fill="currentColor" />
            <circle cx="68" cy="38" r="3" fill="currentColor" />
            <circle cx="75" cy="45" r="3" fill="currentColor" />
            <circle cx="83" cy="52" r="3" fill="currentColor" />
            <circle cx="90" cy="60" r="3" fill="currentColor" />
            <circle cx="98" cy="52" r="3" fill="currentColor" />
            <circle cx="105" cy="45" r="3" fill="currentColor" />
          </svg>

          <svg className="drawing drawing-11" viewBox="0 0 100 70" width="85" height="60">
            <path d="M15,35 C15,15 85,15 85,35 C85,55 15,55 15,35 Z" />
            <path d="M22,35 C25,25 28,45 32,35 C36,25 40,45 44,35 C48,25 52,45 56,35 C60,25 64,45 68,35 C72,25 75,45 78,35" strokeWidth="1" />
          </svg>

          <svg className="drawing drawing-12" viewBox="0 0 100 100" width="80" height="80">
            <path d="M30,38 C42,35 60,35 70,40 C80,45 80,55 70,60 C60,65 42,65 30,62 C20,59 20,41 30,38 Z" />
            <circle cx="45" cy="48" r="1.5" />
            <circle cx="55" cy="52" r="1.5" />
            <circle cx="65" cy="46" r="1.5" />
            <path d="M24,50 C12,42 5,55 -5,50 T-20,60" />
            <path d="M26,53 C14,58 7,48 -3,60 T-18,52" />
          </svg>

          <svg className="drawing drawing-13" viewBox="0 0 120 100" width="100" height="80">
            <circle cx="30" cy="30" r="10" />
            <circle cx="15" cy="48" r="5" /><line x1="24" y1="36" x2="18" y2="44" />
            <circle cx="45" cy="48" r="5" /><line x1="36" y1="36" x2="42" y2="44" />
            <circle cx="85" cy="55" r="11" />
            <circle cx="70" cy="75" r="5" /><line x1="78" y1="63" x2="73" y2="71" />
            <circle cx="100" cy="75" r="5" /><line x1="92" y1="63" x2="97" y2="71" />
            <circle cx="85" cy="32" r="5" /><line x1="85" y1="44" x2="85" y2="37" />
          </svg>

          <svg className="drawing drawing-14" viewBox="0 0 100 100" width="80" height="80">
            <circle cx="50" cy="50" r="25" />
            <circle cx="50" cy="50" r="18" strokeDasharray="2 2" />
          </svg>

          <svg className="drawing drawing-15" viewBox="0 0 100 100" width="80" height="80">
            <path d="M50,90 L50,70 C43,70 38,73 35,70 C28,64 28,48 38,52 C41,54 43,60 43,64 C47,60 43,45 50,38 C57,45 53,60 57,64 C57,60 59,54 62,52 C72,48 72,64 65,70 C62,73 57,70 50,70 L50,90" />
            <line x1="47" y1="78" x2="53" y2="78" />
            <line x1="47" y1="84" x2="53" y2="84" />
            <line x1="47" y1="52" x2="53" y2="52" />
            <line x1="47" y1="46" x2="53" y2="46" />
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
