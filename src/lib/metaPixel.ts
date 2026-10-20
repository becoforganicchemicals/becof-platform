// Meta (Facebook) Pixel, loaded only after the visitor consents to marketing
// cookies — see CookieConsentContext. This is Meta's standard base code, minus
// its inline fbq('track', 'PageView'): page views are sent on every route
// change by AnalyticsPageViewTracker instead, since the inline call would only
// fire once on initial load in this single-page app.
//
// The pixel ID is public (it ships in every page that loads the pixel), so a
// default is baked in; VITE_META_PIXEL_ID overrides it, e.g. for a test pixel.

const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined) || "1328727856049771";

let enabled = false;

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export const loadMetaPixel = () => {
  if (!PIXEL_ID || enabled || typeof window === "undefined") return;
  enabled = true;

  // Already loaded earlier in this visit (consent withdrawn, then re-granted)
  if (window.fbq) {
    window.fbq("consent", "grant");
    return;
  }

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", PIXEL_ID);
};

// Standard events: https://developers.facebook.com/docs/meta-pixel/reference
// `eventID` lets Meta deduplicate if the same event is later also sent
// server-side via the Conversions API.
export const trackMetaEvent = (
  event: "PageView" | "Lead" | "Purchase",
  params?: Record<string, unknown>,
  eventID?: string,
) => {
  if (!enabled || typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params ?? {}, eventID ? { eventID } : undefined);
};

// Best-effort cleanup when marketing consent is withdrawn — the loaded script
// can't be removed, so tell it to stop sending and clear Meta's own cookies.
export const unloadMetaPixel = () => {
  enabled = false;
  if (typeof window === "undefined") return;
  window.fbq?.("consent", "revoke");
  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (name === "_fbp" || name === "_fbc") {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  } catch { /* ignore */ }
};
