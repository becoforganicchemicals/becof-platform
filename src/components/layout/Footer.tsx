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

import logo from "@/assets/becof-logo.png";

const Footer = () => (
  <footer className="bg-primary text-primary-foreground">
    <div className="container py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Company Info */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="Becof Organic Chemicals Logo" className="h-8 w-auto" />
            <span className="font-heading font-bold text-xl">
              Becof Organic Chemicals
            </span>
          </div>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            Pioneering innovative, eco-friendly chemical solutions that protect
            human health and enhance environmental well-being.
          </p>

          {/* Social Icons */}
          <div className="flex gap-3 mt-6">
            <a
              href="https://www.facebook.com/becoforganicchemicals"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              <FaFacebookF className="h-4 w-4" />
            </a>

            <a
              href="https://www.instagram.com/becoforganicchemicals"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              <FaInstagram className="h-4 w-4" />
            </a>

            <a
              href="https://www.linkedin.com/company/becof-organic-chemicals"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              <FaLinkedinIn className="h-4 w-4" />
            </a>

            <a
              href="https://www.tiktok.com/@becoforganicchemicals"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              <FaTiktok className="h-4 w-4" />
            </a>

            <a
              href="https://www.youtube.com/@becoforganicchemicals"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              <FaYoutube className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-heading font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            {["Products", "Learn", "Impact", "About", "Partners", "Contact"].map(
              (l) => (
                <li key={l}>
                  <Link
                    to={`/${l.toLowerCase()}`}
                    className="hover:text-primary-foreground transition-colors"
                  >
                    {l}
                  </Link>
                </li>
              )
            )}
          </ul>
        </div>

        {/* Solutions */}
        <div>
          <h4 className="font-heading font-semibold mb-4">Solutions</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li>Crop Protection</li>
            <li>Soil Enhancement</li>
            <li>Pest Management</li>
            <li>Organic Fertilizers</li>
            <li>Sustainability Consulting</li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-heading font-semibold mb-4">Contact</h4>
          <ul className="space-y-3 text-sm text-primary-foreground/70">
            <li className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-primary-foreground/60" />
              Nairobi & Kilifi, Kenya
            </li>

            <li className="flex items-center gap-2">
              <FaEnvelope className="text-primary-foreground/60" />
              <a href="mailto:info@becoforganic.com" className="hover:text-primary-foreground">
                info@becoforganic.com
              </a>
            </li>

            <li className="flex items-center gap-2">
              <FaPhoneAlt className="text-primary-foreground/60" />
              <a href="tel:+254735283397" className="hover:text-primary-foreground">
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

