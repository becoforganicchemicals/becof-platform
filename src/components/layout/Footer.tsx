import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTiktok,
  FaYoutube,
  FaEnvelope,
  FaPhoneAlt,
  FaFlask,
} from "react-icons/fa";

import logo from "@/assets/becof-logo.png";

const socialLinks = [
  { href: "https://www.facebook.com/becoforganicchemicals", label: "Facebook", Icon: FaFacebookF },
  { href: "https://www.instagram.com/becoforganicchemicals", label: "Instagram", Icon: FaInstagram },
  { href: "https://www.linkedin.com/company/becof-organic-chemicals", label: "LinkedIn", Icon: FaLinkedinIn },
  { href: "https://www.tiktok.com/@becoforganicchemicals", label: "TikTok", Icon: FaTiktok },
  { href: "https://www.youtube.com/@becoforganicchemicals", label: "YouTube", Icon: FaYoutube },
];

const quickLinks = ["Products", "Learn", "Impact", "About", "Partners", "Careers", "Contact"];

const Footer = () => (
  <footer className="bg-primary text-primary-foreground relative overflow-hidden">
    {/* decorative accents, consistent with the rest of the site */}
    <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
    <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

    <div className="container py-16 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-12">
        {/* Company Info */}
        <div className="lg:col-span-5">
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="Becof Organic Chemicals Logo" className="h-8 w-auto" />
            <span className="font-heading font-bold text-xl">
              Becof Organic Chemicals
            </span>
          </div>
          <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
            Pioneering innovative, eco-friendly chemical solutions that protect
            human health and enhance environmental well-being.
          </p>

          {/* Social Icons */}
          <div className="flex gap-3 mt-6">
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

        {/* Quick Links */}
        <div className="lg:col-span-3">
          <h4 className="font-heading font-semibold mb-4 text-primary-foreground/90">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-primary-foreground/70">
            {quickLinks.map((l) => (
              <li key={l}>
                <Link
                  to={`/${l.toLowerCase()}`}
                  className="hover:text-primary-foreground transition-colors"
                >
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="lg:col-span-4">
          <h4 className="font-heading font-semibold mb-4 text-primary-foreground/90">Contact</h4>
          <ul className="space-y-3 text-sm text-primary-foreground/70">
            <li className="flex gap-3">
              <FaFlask className="text-primary-foreground/60 mt-1 shrink-0" />
              <div>
                <p className="font-medium text-primary-foreground/90">Production Facility</p>
                <p>Ongata Rongai, Kajiado County</p>
              </div>
            </li>

            <li className="flex items-center gap-2">
              <FaEnvelope className="text-primary-foreground/60 shrink-0" />
              <a href="mailto:info@becoforganic.com" className="hover:text-primary-foreground transition-colors">
                info@becoforganic.com
              </a>
            </li>

            <li className="flex items-center gap-2">
              <FaPhoneAlt className="text-primary-foreground/60 shrink-0" />
              <a href="tel:+254735283397" className="hover:text-primary-foreground transition-colors">
                +254 735 283 397
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/20 mt-12 pt-6 text-center text-sm text-primary-foreground/50">
        © {new Date().getFullYear()} Becof Organic Chemicals Limited. All rights
        reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
