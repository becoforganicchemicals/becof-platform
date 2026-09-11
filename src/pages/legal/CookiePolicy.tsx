import LegalLayout, { LegalSection } from "@/components/legal/LegalLayout";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";

const sections: LegalSection[] = [
  { id: "what-are-cookies", title: "What Are Cookies & Local Storage" },
  { id: "your-consent", title: "Your Consent Choice" },
  { id: "essential", title: "Essential Storage" },
  { id: "analytics", title: "Analytics (Optional)" },
  { id: "third-party", title: "Third-Party Services" },
  { id: "managing", title: "Managing & Clearing This Data" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us" },
];

const CookiePolicy = () => {
  const { openPreferences, hasDecided, analyticsEnabled } = useCookieConsent();

  return (
    <LegalLayout
      title="Cookie Policy"
      description="What cookies and browser storage Becof Organic Chemicals actually uses, and how to control them."
      lastUpdated="11 September 2026"
      sections={sections}
    >
      <section id="what-are-cookies">
        <h2>1. What Are Cookies &amp; Local Storage</h2>
        <p>
          Cookies are small text files a website can ask your browser to store. "Local storage" and "session
          storage" are similar browser mechanisms that let a website remember small pieces of information on your
          device between visits (local storage) or for the current browser tab session (session storage). This
          Policy covers all of these.
        </p>
      </section>

      <section id="your-consent">
        <h2>2. Your Consent Choice</h2>
        <p>
          When you first visit becoforganicchemicals.com, a banner asks you to Accept All, Reject Non-Essential,
          or Customize which categories you allow. Essential storage runs regardless, since the site can't
          function without it; analytics only activates if you say yes. You can change your mind at any time —
          see <a href="#managing">Section 6</a> below.
        </p>
        {hasDecided && (
          <div className="not-prose bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-foreground m-0">
              Your current choice: <strong>Analytics {analyticsEnabled ? "enabled" : "disabled"}</strong>
            </p>
            <Button size="sm" variant="outline" className="gap-2" onClick={openPreferences}>
              <Settings2 className="h-3.5 w-3.5" /> Manage Preferences
            </Button>
          </div>
        )}
      </section>

      <section id="essential">
        <h2>3. Essential Storage</h2>
        <p>These are required for core site functionality and are not optional — the Services will not work correctly without them:</p>
        <ul>
          <li>
            <strong>Authentication session</strong> — keeps you signed in as you move between pages, and remembers
            your login between visits until you sign out or your session expires.
          </li>
          <li>
            <strong>Referral code capture</strong> — if you arrive at our site via a friend's referral link, we
            store the referral code in your browser until you sign up, so your friend can be credited correctly.
          </li>
          <li>
            <strong>Dismissed prompts</strong> — if you dismiss a "resume payment" prompt for a specific
            in-progress order, we remember that choice for the rest of your browser session.
          </li>
          <li>
            <strong>Your cookie consent choice itself</strong> — so we don't ask you again on every visit.
          </li>
        </ul>
      </section>

      <section id="analytics">
        <h2>4. Analytics (Optional)</h2>
        <p>
          With your consent, we use <strong>Google Analytics</strong> to understand how visitors use our site —
          which pages are viewed, how people navigate between them, and general traffic patterns. This helps us
          improve the site and understand what's actually useful to farmers and distributors visiting us.
        </p>
        <p>
          Google Analytics is only loaded, and only sets its cookies, after you actively choose "Accept All" or
          enable the Analytics toggle in Customize. If you choose "Reject Non-Essential," or haven't made a
          choice yet, Google Analytics is never loaded and sets nothing. Data collected is subject to{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's own Privacy Policy</a>.
        </p>
      </section>

      <section id="third-party">
        <h2>5. Third-Party Services</h2>
        <p>
          Some third-party services we rely on to operate the Services — such as our payment processor
          (Safaricom/M-Pesa) and cloud infrastructure provider — may set their own cookies or storage as part of
          delivering their service to us (for example, during the M-Pesa payment flow on your phone). These are
          governed by those providers' own privacy and cookie practices, not this Policy.
        </p>
      </section>

      <section id="managing">
        <h2>6. Managing &amp; Clearing This Data</h2>
        <p>You can change your cookie preferences at any time:</p>
        <ul>
          <li>Click "Manage Preferences" above, or "Cookie Settings" in the footer of any page, to reopen the consent dialog and change your analytics choice.</li>
          <li>Clear your browser's local storage / site data for becoforganicchemicals.com to reset everything, including your consent choice — the banner will reappear on your next visit.</li>
          <li>Sign out to end your authentication session specifically.</li>
        </ul>
        <div className="not-prose">
          <Button className="gap-2" onClick={openPreferences}>
            <Settings2 className="h-4 w-4" /> Open Cookie Preferences
          </Button>
        </div>
      </section>

      <section id="changes">
        <h2>7. Changes to This Policy</h2>
        <p>
          If we introduce new categories of cookies or tracking technology in the future, we will update this
          Policy and, where required, ask for your consent before they are used. The "Last updated" date above
          reflects the most recent revision.
        </p>
      </section>

      <section id="contact">
        <h2>8. Contact Us</h2>
        <p>Questions about this Cookie Policy can be directed to:</p>
        <ul>
          <li>Email: <a href="mailto:info@becoforganic.com">info@becoforganic.com</a></li>
          <li>Phone: <a href="tel:+254735283397">+254 735 283 397</a></li>
        </ul>
      </section>
    </LegalLayout>
  );
};

export default CookiePolicy;
