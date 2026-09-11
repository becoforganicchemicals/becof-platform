import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { trackPageView } from "@/lib/analytics";

// Renders nothing — just fires a GA page_view on every route change, and only
// while the visitor has actually consented to analytics.
const AnalyticsPageViewTracker = () => {
  const location = useLocation();
  const { analyticsEnabled } = useCookieConsent();

  useEffect(() => {
    if (analyticsEnabled) trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search, analyticsEnabled]);

  return null;
};

export default AnalyticsPageViewTracker;
