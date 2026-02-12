import { Link } from "react-router-dom";
import { Leaf, Facebook, Instagram, Linkedin } from "lucide-react";

const Footer = () => (
  <footer className="bg-primary text-primary-foreground">
    <div className="container py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="h-6 w-6" />
            <span className="font-heading font-bold text-xl">BECOF</span>
          </div>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            Pioneering innovative, eco-friendly chemical solutions that protect human health and enhance environmental well-being.
          </p>
          <div className="flex gap-3 mt-6">
            <a href="https://www.facebook.com/becoforganicchemicals" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="https://www.instagram.com/becoforganicchemicals" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="https://www.linkedin.com/company/becof-organic-chemicals" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            {["Products", "Learn", "Impact", "About", "Partners", "Contact"].map(l => (
              <li key={l}><Link to={`/${l.toLowerCase()}`} className="hover:text-primary-foreground transition-colors">{l}</Link></li>
            ))}
          </ul>
        </div>
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
        <div>
          <h4 className="font-heading font-semibold mb-4">Contact</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li>Nairobi, Kenya</li>
            <li>info@becof.co.ke</li>
            <li>+254 700 000 000</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/20 mt-12 pt-6 text-center text-sm text-primary-foreground/50">
        © {new Date().getFullYear()} Becof Organic Chemicals Limited. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
