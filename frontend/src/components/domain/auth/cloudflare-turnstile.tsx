"use client";

import { useEffect, useId, useRef } from "react";
import authStyles from "./auth-pages.module.scss";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: "auto" | "light" | "dark";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type CloudflareTurnstileProps = {
  siteKey: string;
  onVerify: (token: string | null) => void;
  label: string;
};

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";

function ensureTurnstileScript(): void {
  if (document.getElementById(TURNSTILE_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = TURNSTILE_SCRIPT_ID;
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export function CloudflareTurnstile({ siteKey, onVerify, label }: CloudflareTurnstileProps) {
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const generatedId = useId().replace(/:/g, "");
  const containerId = `turnstile-${generatedId}`;

  useEffect(() => {
    if (!siteKey || widgetIdRef.current) return undefined;

    let cancelled = false;
    let retryId: number | null = null;

    const renderWidget = () => {
      if (cancelled || widgetIdRef.current || !containerRef.current) return;

      if (!window.turnstile) {
        retryId = window.setTimeout(renderWidget, 150);
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (token) => onVerify(token),
        "expired-callback": () => onVerify(null),
        "error-callback": () => onVerify(null),
      });
    };

    ensureTurnstileScript();
    renderWidget();

    return () => {
      cancelled = true;
      if (retryId) window.clearTimeout(retryId);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
      onVerify(null);
    };
  }, [onVerify, siteKey]);

  if (!siteKey) return null;

  return (
    <div className={authStyles.turnstileWrap} aria-label={label}>
      <div id={containerId} ref={containerRef} />
    </div>
  );
}
