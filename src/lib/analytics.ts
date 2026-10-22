// Google tags, loaded only after the visitor consents — see CookieConsentContext.
// One gtag.js load serves both IDs (Google warns against loading it twice):
//   - Google Analytics 4 (VITE_GA_MEASUREMENT_ID): Analytics consent
//   - Merchant Center Google tag (GT-TQL9D99R): Marketing consent, same as
//     the Meta Pixel — measures purchases coming from Shopping listings
// Each ID is only configured once its own category is granted, and Consent
// Mode signals tell Google which storage it may use.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
// Public ID — it ships in every page that loads the tag.
const MERCHANT_TAG_ID = "GT-TQL9D99R";

let scriptLoaded = false;
let analyticsOn = false;
let marketingOn = false;
const configured = new Set<string>();

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const isAnalyticsConfigured = () => Boolean(GA_ID);

const gtag = (...args: unknown[]) => window.gtag?.(...args);

const ensureGtag = (id: string) => {
  if (scriptLoaded || typeof window === "undefined") return;
  scriptLoaded = true;

  window.dataLayer = window.dataLayer || [];
  // Must push the `arguments` object, exactly as Google's snippet does —
  // gtag.js doesn't process plain arrays as commands.
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  gtag("js", new Date());

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
};

const configure = (id: string) => {
  if (configured.has(id)) return;
  configured.add(id);
  // page_view is sent manually on route change (see AnalyticsPageViewTracker),
  // since the automatic one only fires on initial load in this single-page app.
  gtag("config", id, { send_page_view: false });
};

const activeIds = () => [analyticsOn && GA_ID, marketingOn && MERCHANT_TAG_ID].filter(Boolean) as string[];

export const enableGoogleAnalytics = () => {
  if (!GA_ID || analyticsOn || typeof window === "undefined") return;
  analyticsOn = true;
  ensureGtag(GA_ID);
  gtag("consent", "update", { analytics_storage: "granted" });
  configure(GA_ID);
};

export const enableGoogleMarketing = () => {
  if (marketingOn || typeof window === "undefined") return;
  marketingOn = true;
  ensureGtag(MERCHANT_TAG_ID);
  gtag("consent", "update", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  configure(MERCHANT_TAG_ID);
};

const clearCookies = (matches: (name: string) => boolean) => {
  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (matches(name)) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  } catch { /* ignore */ }
};

// Best-effort cleanup when consent is withdrawn — the loaded script can't be
// removed, so revoke consent, stop sending events, and clear Google's cookies.
export const disableGoogleAnalytics = () => {
  analyticsOn = false;
  if (typeof window === "undefined") return;
  gtag("consent", "update", { analytics_storage: "denied" });
  clearCookies((n) => n.startsWith("_ga"));
};

export const disableGoogleMarketing = () => {
  marketingOn = false;
  if (typeof window === "undefined") return;
  gtag("consent", "update", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  clearCookies((n) => n.startsWith("_gcl"));
};

export const trackPageView = (path: string) => {
  const ids = activeIds();
  if (!ids.length) return;
  gtag("event", "page_view", { page_path: path, send_to: ids });
};

export const trackPurchase = (transactionId: string, value: number) => {
  const ids = activeIds();
  if (!ids.length) return;
  gtag("event", "purchase", { transaction_id: transactionId, value, currency: "KES", send_to: ids });
};
