import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTiktok,
  FaYoutube,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

import logo from "@/assets/becof-logo.png";

const socialLinks = [
  { href: "https://www.facebook.com/becoforganicchemicals", label: "Facebook", Icon: FaFacebookF },
  { href: "https://www.instagram.com/becoforganicchemicals", label: "Instagram", Icon: FaInstagram },
  { href: "https://www.linkedin.com/company/becof-organic-chemicals", label: "LinkedIn", Icon: FaLinkedinIn },
  { href: "https://www.tiktok.com/@becoforganicchemicals", label: "TikTok", Icon: FaTiktok },
  { href: "https://www.youtube.com/@becoforganicchemicals", label: "YouTube", Icon: FaYoutube },
];

const shopLinks = [
  { label: "Shop Products", to: "/products" },
  { label: "Custom / Bulk Order", to: "/custom-order" },
  { label: "Learn", to: "/learn" },
  { label: "Our Impact", to: "/impact" },
];

const companyLinks = [
  { label: "About Us", to: "/about" },
  { label: "Become a Distributor", to: "/partners" },
  { label: "Become an Affiliate", to: "/affiliates" },
  { label: "Careers", to: "/careers" },
  { label: "Contact Us", to: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", to: "/legal/privacy" },
  { label: "Terms of Service", to: "/legal/terms" },
  { label: "Cookie Policy", to: "/legal/cookies" },
  { label: "Accessibility", to: "/legal/accessibility" },
];

const FooterColumn = ({
  title, links, trailing,
}: { title: string; links: { label: string; to: string }[]; trailing?: React.ReactNode }) => (
  <div>
    <h4 className="font-heading font-semibold mb-4 text-primary-foreground/90">{title}</h4>
    <ul className="space-y-2.5 text-sm text-primary-foreground/70">
      {links.map((l) => (
        <li key={l.to}>
          <Link to={l.to} className="hover:text-primary-foreground transition-colors">
            {l.label}
          </Link>
        </li>
      ))}
      {trailing && <li>{trailing}</li>}
    </ul>
  </div>
);

const Footer = () => {
  const { openPreferences } = useCookieConsent();

  return (
  <footer className="bg-primary text-primary-foreground relative overflow-hidden">
    {/* decorative accents, consistent with the rest of the site */}
    <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
    <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

    <div className="container py-16 relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-12">
        {/* Brand */}
        <div className="lg:col-span-4">
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="Becof Organic Chemicals Logo" className="h-8 w-auto" />
            <span className="font-heading font-bold text-xl">
              Becof Organic Chemicals
            </span>
          </div>
          <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs mb-6">
            Pioneering innovative, eco-friendly chemical solutions that protect
            human health and enhance environmental well-being.
          </p>

          <ul className="space-y-3 text-sm text-primary-foreground/70 mb-6">
            <li className="flex gap-3">
              <FaMapMarkerAlt className="text-primary-foreground/60 mt-1 shrink-0" />
              <span>Ongata Rongai, Kajiado County, Kenya</span>
            </li>
            <li className="flex items-center gap-3">
              <FaEnvelope className="text-primary-foreground/60 shrink-0" />
              <a href="mailto:info@becoforganic.com" className="hover:text-primary-foreground transition-colors">
                info@becoforganic.com
              </a>
            </li>
            <li className="flex items-center gap-3">
              <FaPhoneAlt className="text-primary-foreground/60 shrink-0" />
              <a href="tel:+254735283397" className="hover:text-primary-foreground transition-colors">
                +254 735 283 397
              </a>
            </li>
          </ul>

          {/* Social Icons */}
          <div className="flex gap-3">
            {socialLinks.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns — own inner grid so it always fills the remaining
            width exactly, regardless of how many columns the brand block above takes */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-10">
          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn
            title="Legal"
            links={legalLinks}
            trailing={
              <button onClick={openPreferences} className="hover:text-primary-foreground transition-colors text-left">
                Cookie Settings
              </button>
            }
          />
        </div>
      </div>

      <div className="border-t border-primary-foreground/20 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-primary-foreground/50">
        <p>© {new Date().getFullYear()} Becof Organic Chemicals Limited. All rights reserved.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {legalLinks.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-primary-foreground/80 transition-colors">
              {l.label}
            </Link>
          ))}
          <button onClick={openPreferences} className="hover:text-primary-foreground/80 transition-colors">
            Cookie Settings
          </button>
        </div>
      </div>
    </div>
  </footer>
  );
};

export default Footer;
