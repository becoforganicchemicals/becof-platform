// Google Analytics (GA4), loaded only after the visitor consents to analytics
// cookies — see CookieConsentContext. Reads the measurement ID from
// VITE_GA_MEASUREMENT_ID; if that's unset, every function here is a silent
// no-op, so the consent banner and preferences UI work standalone even
// before a real GA property is configured.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

let loaded = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const isAnalyticsConfigured = () => Boolean(GA_ID);

export const loadGoogleAnalytics = () => {
  if (!GA_ID || loaded || typeof window === "undefined") return;
  loaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => window.dataLayer!.push(args);
  window.gtag("js", new Date());
  // We send page_view events manually on route change (see AnalyticsPageViewTracker),
  // since gtag's automatic page_view only fires once on initial script load and
  // wouldn't track client-side route changes in this single-page app.
  window.gtag("config", GA_ID, { send_page_view: false });
};

export const trackPageView = (path: string) => {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "page_view", { page_path: path });
};

// Best-effort cleanup when analytics consent is withdrawn — a loaded script
// can't be fully unloaded, but we stop sending events and clear GA's own cookies.
export const unloadGoogleAnalytics = () => {
  loaded = false;
  if (typeof document === "undefined") return;
  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (name.startsWith("_ga")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  } catch { /* ignore */ }
};
