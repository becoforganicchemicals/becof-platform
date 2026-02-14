import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/becof-logo.png";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Products", path: "/products" },
  { name: "Learn", path: "/learn" },
  { name: "Impact", path: "/impact" },
  { name: "About", path: "/about" },
  { name: "Partners", path: "/partners" },
  { name: "Contact", path: "/contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Becof Organic Chemicals" className="h-10 w-10 object-contain" />
          <span className="font-heading font-bold text-lg text-primary hidden sm:inline">BECOF</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:text-primary hover:bg-primary/5 ${
                location.pathname === link.path ? "text-primary bg-primary/10" : "text-foreground/70"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
          </Button>
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-1">
                    <Shield className="h-3.5 w-3.5" /> Admin
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden sm:inline-flex gap-1">
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </Button>
            </>
          ) : (
            <Link to="/signin">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">Sign In</Button>
            </Link>
          )}
          <Link to="/products">
            <Button size="sm" className="hidden sm:inline-flex">Shop Now</Button>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-card p-4 space-y-1">
          {navLinks.map((link) => (
            <Link key={link.path} to={link.path} onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.path ? "text-primary bg-primary/10" : "text-foreground/70 hover:text-primary"
              }`}>
              {link.name}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="flex-1">
                    <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>Admin</Button>
                  </Link>
                )}
                <Button variant="outline" className="flex-1" onClick={() => { handleSignOut(); setOpen(false); }}>Sign Out</Button>
              </>
            ) : (
              <Link to="/signin" className="flex-1">
                <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>Sign In</Button>
              </Link>
            )}
            <Link to="/products" className="flex-1">
              <Button className="w-full" onClick={() => setOpen(false)}>Shop Now</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
