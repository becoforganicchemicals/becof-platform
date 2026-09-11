import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { X } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const TEASER_SEEN_KEY = "becof-whatsapp-teaser-seen";

// Show the friendly teaser bubble once per browser session, a couple of
// seconds after landing, then auto-hide it — same one-shot pattern as a
// typical live-chat widget rather than nagging on every page.
const WhatsAppFloatButton = () => {
  const [showTeaser, setShowTeaser] = useState(false);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(TEASER_SEEN_KEY) === "1";
    } catch { /* ignore */ }
    if (alreadySeen) return;
    const showTimer = setTimeout(() => setShowTeaser(true), 2500);
    return () => clearTimeout(showTimer);
  }, []);

  const dismissTeaser = () => {
    setShowTeaser(false);
    try {
      sessionStorage.setItem(TEASER_SEEN_KEY, "1");
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!showTeaser) return;
    const hideTimer = setTimeout(dismissTeaser, 9000);
    return () => clearTimeout(hideTimer);
  }, [showTeaser]);

  return (
    <div className="fixed bottom-24 left-4 sm:bottom-6 sm:left-6 z-40 flex flex-col items-start gap-3">
      {showTeaser && (
        <div className="relative w-64 bg-card border border-border rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <button
            onClick={dismissTeaser}
            aria-label="Dismiss"
            className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="text-sm font-medium text-foreground pr-4 mb-1">👋 Need a hand choosing products?</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Chat with our team directly on WhatsApp — we usually reply fast.
          </p>
          <a
            href={buildWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismissTeaser}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#128C7E] hover:underline"
          >
            <FaWhatsapp className="h-4 w-4" /> Start a chat
          </a>
          <span className="absolute -bottom-1.5 left-6 w-3 h-3 bg-card border-b border-r border-border rotate-45" />
        </div>
      )}

      <a
        href={buildWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="group relative flex items-center h-14 rounded-full bg-[#25D366] shadow-xl hover:shadow-2xl transition-shadow"
      >
        <span className="relative flex items-center justify-center w-14 h-14 shrink-0">
          <FaWhatsapp className="h-7 w-7 text-white" />
          <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300 border-2 border-[#25D366]" />
          </span>
        </span>
        <span className="max-w-0 group-hover:max-w-[9rem] overflow-hidden whitespace-nowrap transition-all duration-300 text-white font-semibold text-sm group-hover:pr-5">
          Chat with us
        </span>
      </a>
    </div>
  );
};

export default WhatsAppFloatButton;
