import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loadGoogleAnalytics, unloadGoogleAnalytics } from "@/lib/analytics";
import { loadMetaPixel, unloadMetaPixel } from "@/lib/metaPixel";

const STORAGE_KEY = "becof-cookie-consent";

interface StoredConsent {
  analytics: boolean;
  // Added after launch — choices saved before then have no `marketing` key,
  // and are treated as undecided so those visitors get asked about it.
  marketing?: boolean;
  decidedAt: string;
}

interface CookieConsentContextValue {
  hasDecided: boolean;
  analyticsEnabled: boolean;
  marketingEnabled: boolean;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (analytics: boolean, marketing: boolean) => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

const readStored = (): StoredConsent | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const CookieConsentProvider = ({ children }: { children: ReactNode }) => {
  const [stored, setStored] = useState<StoredConsent | null>(() => readStored());
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Apply whatever choice was already stored, once, on first load.
  useEffect(() => {
    if (stored?.analytics) loadGoogleAnalytics();
    if (stored?.marketing) loadMetaPixel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (analytics: boolean, marketing: boolean) => {
    const next: StoredConsent = { analytics, marketing, decidedAt: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setStored(next);
    if (analytics) loadGoogleAnalytics();
    else unloadGoogleAnalytics();
    if (marketing) loadMetaPixel();
    else unloadMetaPixel();
    setPreferencesOpen(false);
  };

  const value: CookieConsentContextValue = {
    hasDecided: typeof stored?.marketing === "boolean",
    analyticsEnabled: stored?.analytics ?? false,
    marketingEnabled: stored?.marketing ?? false,
    preferencesOpen,
    openPreferences: () => setPreferencesOpen(true),
    closePreferences: () => setPreferencesOpen(false),
    acceptAll: () => persist(true, true),
    rejectNonEssential: () => persist(false, false),
    savePreferences: (analytics: boolean, marketing: boolean) => persist(analytics, marketing),
  };

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
};

export const useCookieConsent = () => {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    // Fail soft instead of blanking the page (e.g. after a hot-reload of this
    // file detaches the tree from the provider). Conservative defaults: no
    // analytics/marketing tracking without consent, banner can still be shown.
    console.warn("useCookieConsent used outside CookieConsentProvider — tracking disabled");
    return {
      hasDecided: false,
      analyticsEnabled: false,
      marketingEnabled: false,
      preferencesOpen: false,
      openPreferences: () => {},
      closePreferences: () => {},
      acceptAll: () => {},
      rejectNonEssential: () => {},
      savePreferences: () => {},
    } satisfies CookieConsentContextValue;
  }
  return ctx;
};
