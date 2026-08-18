import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Cinzel, Outfit, Plus_Jakarta_Sans, Tangerine } from 'next/font/google';
import Script from 'next/script';
import AuthProvider from '@/components/AuthProvider';
import LayoutLoginModalWrapper from '@/components/LayoutLoginModalWrapper';
import { ToastProvider } from '@/components/Toast';
import BuyMeCoffee from '@/components/BuyMeCoffee';


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
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#030816',
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
        <ToastProvider>
          <AuthProvider>
            {/* Google Identity Services */}
            <Script
              src="https://accounts.google.com/gsi/client"
              strategy="afterInteractive"
            />

            {/* Cloudflare Turnstile — only loaded when NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                strategy="afterInteractive"
              />
            )}

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
                <p>Maintained by BioArchive © {year}</p>
                <a href="mailto:bioarchive007@gmail.com">
                  Contact Us
                </a>
              </footer>
            </div>

            <LayoutLoginModalWrapper />
            <BuyMeCoffee position="bottom-right" />
          </AuthProvider>

        </ToastProvider>

        {/* Inline script: optimized loading screen transition */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var ls = document.getElementById('loading-screen');
                var threshold = 400; // ms
                var loaded = false;
                var shown = false;

                // Start loader as invisible by default
                if (ls) {
                  ls.style.opacity = '0';
                  ls.style.visibility = 'hidden';
                  ls.style.pointerEvents = 'none';
                }

                // If loading takes longer than 400ms, show the loading screen
                var showTimer = setTimeout(function() {
                  if (!loaded && ls) {
                    shown = true;
                    ls.style.opacity = '1';
                    ls.style.visibility = 'visible';
                    ls.style.pointerEvents = 'auto';
                  }
                }, threshold);

                function hideLoader() {
                  loaded = true;
                  clearTimeout(showTimer);
                  if (ls) {
                    ls.style.opacity = '0';
                    ls.style.visibility = 'hidden';
                    ls.style.pointerEvents = 'none';
                    // After transition finishes, add class 'hidden' to make sure
                    setTimeout(function() {
                      ls.classList.add('hidden');
                    }, 600);
                  }
                }

                window.addEventListener('load', function() {
                  // If it was shown, wait a tiny bit so the animation is readable, otherwise hide instantly
                  if (shown) {
                    setTimeout(hideLoader, 400);
                  } else {
                    hideLoader();
                  }
                });

                // Failsafe fallback
                setTimeout(hideLoader, 5000);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
