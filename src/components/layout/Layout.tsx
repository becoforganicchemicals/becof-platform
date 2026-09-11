import { ReactNode, useEffect } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WhatsAppFloatButton from "@/components/WhatsAppFloatButton";
import { captureAffiliateCode } from "@/lib/affiliate";

const REFERRAL_KEY = "becof-referral-code";

const Layout = ({ children }: { children: ReactNode }) => {
  // Capture ?ref=CODE from a shared referral link, wherever it lands, and
  // remember it until signup — doesn't overwrite one already stored, so the
  // first link someone actually clicked wins even if they browse around
  // before registering.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && !localStorage.getItem(REFERRAL_KEY)) {
        localStorage.setItem(REFERRAL_KEY, ref.toUpperCase());
      }
    } catch { /* ignore */ }

    // Capture ?aff=CODE from an affiliate's shared link — see
    // src/lib/affiliate.ts for the attribution-window logic.
    const aff = new URLSearchParams(window.location.search).get("aff");
    if (aff) captureAffiliateCode(aff);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloatButton />
    </div>
  );
};

export default Layout;
