import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loadGoogleAnalytics, unloadGoogleAnalytics } from "@/lib/analytics";

const STORAGE_KEY = "becof-cookie-consent";

interface StoredConsent {
  analytics: boolean;
  decidedAt: string;
}

interface CookieConsentContextValue {
  hasDecided: boolean;
  analyticsEnabled: boolean;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (analytics: boolean) => void;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (analytics: boolean) => {
    const next: StoredConsent = { analytics, decidedAt: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setStored(next);
    if (analytics) loadGoogleAnalytics();
    else unloadGoogleAnalytics();
    setPreferencesOpen(false);
  };

  const value: CookieConsentContextValue = {
    hasDecided: stored !== null,
    analyticsEnabled: stored?.analytics ?? false,
    preferencesOpen,
    openPreferences: () => setPreferencesOpen(true),
    closePreferences: () => setPreferencesOpen(false),
    acceptAll: () => persist(true),
    rejectNonEssential: () => persist(false),
    savePreferences: (analytics: boolean) => persist(analytics),
  };

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
};

export const useCookieConsent = () => {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return ctx;
};
