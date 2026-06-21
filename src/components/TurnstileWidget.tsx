'use client';

import { useEffect, useRef } from 'react';

// NEXT_PUBLIC_ vars are inlined at build time — safe to read in client components
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** True when Turnstile is configured. Use to conditionally disable submit buttons. */
export const TURNSTILE_ENABLED = !!SITE_KEY;

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

/**
 * Renders a Cloudflare Turnstile challenge widget (dark-themed).
 *
 * - If NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set, renders nothing (graceful no-op).
 * - Requires the Turnstile script to be loaded in layout.tsx.
 * - `onToken` is called when the user passes the challenge.
 * - `onExpire` is called when the token expires (user should re-verify).
 */
export default function TurnstileWidget({
  onToken,
  onExpire,
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Use a ref for callbacks to avoid stale-closure issues inside the effect
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;

    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current) return;
      if ((window as any).turnstile) {
        widgetIdRef.current = (window as any).turnstile.render(
          containerRef.current,
          {
            sitekey: SITE_KEY,
            theme: 'dark',
            callback: (token: string) => onTokenRef.current(token),
            'expired-callback': () => {
              if (onExpireRef.current) onExpireRef.current();
            },
          }
        );
      }
    };

    if ((window as any).turnstile) {
      render();
    } else {
      const interval = setInterval(() => {
        if ((window as any).turnstile) {
          clearInterval(interval);
          render();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch (_) {}
        widgetIdRef.current = null;
      }
    };
  }, []); // Mount once — callbacks are managed via refs

  if (!SITE_KEY) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      // No fixed margin — the Turnstile widget controls its own layout based on
      // the widget mode configured in Cloudflare Dashboard (Managed/Non-interactive/Invisible).
    />
  );
}
