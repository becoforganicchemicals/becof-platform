const AFFILIATE_KEY = "becof-affiliate-code";
const ATTRIBUTION_DAYS = 30;

interface StoredAffiliate {
  code: string;
  expiresAt: number;
}

// First-touch attribution, same convention as the ?ref= referral capture:
// an already-stored, still-valid code isn't overwritten by a later click.
// Unlike referrals (captured once at signup), this needs an expiry since it
// has to survive until whichever future order it ends up attributed to.
export const captureAffiliateCode = (code: string) => {
  try {
    if (getStoredAffiliate()) return;
    const record: StoredAffiliate = {
      code: code.toUpperCase(),
      expiresAt: Date.now() + ATTRIBUTION_DAYS * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(AFFILIATE_KEY, JSON.stringify(record));
  } catch { /* ignore */ }
};

export const getStoredAffiliate = (): StoredAffiliate | null => {
  try {
    const raw = localStorage.getItem(AFFILIATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAffiliate;
    if (!parsed?.code || !parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      localStorage.removeItem(AFFILIATE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const buildAffiliateLink = (code: string) => `${window.location.origin}/?aff=${code}`;
