import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { enableGoogleAnalytics, enableGoogleMarketing, trackPageView } from "@/lib/analytics";
import { loadMetaPixel, trackMetaEvent } from "@/lib/metaPixel";

// Renders nothing — just fires a Google page_view / Meta PageView on every
// route change, and only while the visitor has actually consented to each.
// The load calls are idempotent; they're here because this effect runs before
// CookieConsentProvider's own (child effects run first), so on a returning
// visit the first page view would otherwise be dropped before anything loaded.
const AnalyticsPageViewTracker = () => {
  const location = useLocation();
  const { analyticsEnabled, marketingEnabled } = useCookieConsent();

  useEffect(() => {
    // One page_view, sent to whichever Google tags are consented to
    if (analyticsEnabled) enableGoogleAnalytics();
    if (marketingEnabled) enableGoogleMarketing();
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search, analyticsEnabled, marketingEnabled]);

  useEffect(() => {
    if (!marketingEnabled) return;
    loadMetaPixel();
    trackMetaEvent("PageView");
  }, [location.pathname, location.search, marketingEnabled]);

  return null;
};

export default AnalyticsPageViewTracker;
