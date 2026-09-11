import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Cookie, X } from "lucide-react";

const CookieConsentBanner = () => {
  const {
    hasDecided, analyticsEnabled, preferencesOpen,
    openPreferences, closePreferences, acceptAll, rejectNonEssential, savePreferences,
  } = useCookieConsent();
  const [draftAnalytics, setDraftAnalytics] = useState(analyticsEnabled);
  const [dismissed, setDismissed] = useState(false);

  // Keep the dialog's draft toggle in sync with the saved value whenever it's reopened.
  useEffect(() => {
    if (preferencesOpen) setDraftAnalytics(analyticsEnabled);
  }, [preferencesOpen, analyticsEnabled]);

  return (
    <>
      {!hasDecided && !dismissed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[100] w-auto sm:w-[380px] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Cookie className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-sm text-foreground">We value your privacy</h3>
                </div>
                <button
                  onClick={() => setDismissed(true)}
                  aria-label="Dismiss"
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 -mt-1 -mr-1 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                We use essential storage to run this site, and — only with your consent — analytics to
                understand how it's used.{" "}
                <Link to="/legal/cookies" className="text-primary hover:underline">Learn more</Link>
              </p>

              <div className="flex flex-col gap-2">
                <Button size="sm" className="w-full" onClick={acceptAll}>Accept All</Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={rejectNonEssential}>
                    Reject Non-Essential
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1" onClick={openPreferences}>
                    Customize
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={preferencesOpen} onOpenChange={(o) => !o && closePreferences()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" /> Cookie Preferences
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="pr-4">
                <p className="text-sm font-medium">Essential</p>
                <p className="text-xs text-muted-foreground">Required for login, cart, checkout, and referral tracking to work. Always on.</p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="pr-4">
                <p className="text-sm font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">Google Analytics — helps us understand site traffic. Optional.</p>
              </div>
              <Switch checked={draftAnalytics} onCheckedChange={setDraftAnalytics} />
            </div>
            <p className="text-xs text-muted-foreground">
              Full detail in our{" "}
              <Link to="/legal/cookies" className="text-primary hover:underline" onClick={closePreferences}>
                Cookie Policy
              </Link>.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closePreferences}>Cancel</Button>
            <Button onClick={() => savePreferences(draftAnalytics)}>Save Preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsentBanner;
