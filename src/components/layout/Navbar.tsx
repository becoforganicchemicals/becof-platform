import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, LogOut, Shield, Heart, User, Truck, Tractor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import logo from "@/assets/becof-logo.png";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Products", path: "/products" },
  { name: "Learn", path: "/learn" },
  { name: "Impact", path: "/impact" },
  { name: "About", path: "/about" },
  { name: "Partners", path: "/partners" },
  { name: "Contact", path: "/contact" },
  { name: "Careers", path: "/careers" },
];

// Role-specific portal config
const getRoleConfig = (role: string | null) => {
  switch (role) {
    case "super_admin":
      return { label: "Super Admin", icon: Shield, portalPath: "/admin", portalLabel: "Admin Portal" };
    case "admin":
      return { label: "Admin", icon: Shield, portalPath: "/admin", portalLabel: "Admin Portal" };
    case "distributor":
      return { label: "Distributor", icon: Truck, portalPath: "/profile", portalLabel: "Distributor Portal" };
    case "farmer":
    default:
      return { label: "Farmer", icon: Tractor, portalPath: "/profile", portalLabel: "My Profile" };
  }
};

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, profile, signOut } = useAuth();
  const { itemCount } = useCart();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const roleConfig = getRoleConfig(role);
  const RoleIcon = roleConfig.icon;
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container flex h-16 items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Becof Organic Chemicals" className="h-10 w-10 object-contain" />
          <span className="font-heading font-bold text-lg text-primary hidden sm:inline">
            Becof Organic Chemicals
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:text-primary hover:bg-primary/5 ${location.pathname === link.path
                ? "text-primary bg-primary/10"
                : "text-foreground/70"
                }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Wishlist — authenticated only */}
          {user && (
            <Link to="/wishlist">
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
          )}

          {/* Cart */}
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Button>
          </Link>

          {user ? (
            <>
              {/* User avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden sm:flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <Avatar className="h-8 w-8 border-2 border-primary/20 hover:border-primary/60 transition-colors">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-sm truncate">
                        {profile?.full_name || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <RoleIcon className="h-3 w-3 text-primary" />
                        <span className="text-xs text-primary font-medium">{roleConfig.label}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={roleConfig.portalPath} className="flex items-center gap-2 cursor-pointer">
                      <RoleIcon className="h-4 w-4" />
                      {roleConfig.portalLabel}
                    </Link>
                  </DropdownMenuItem>
                  {/* Always show profile link for farmers/distributors */}
                  {(role === "farmer" || role === "distributor") && (
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/signin">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
          )}

          <Link to="/products">
            <Button size="sm" className="hidden sm:inline-flex">Shop Now</Button>
          </Link>

          {/* Mobile hamburger */}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-border bg-card p-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === link.path
                ? "text-primary bg-primary/10"
                : "text-foreground/70 hover:text-primary"
                }`}
            >
              {link.name}
            </Link>
          ))}

          {/* Mobile user section */}
          {user && (
            <div className="pt-2 border-t border-border mt-2">
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                  <div className="flex items-center gap-1">
                    <RoleIcon className="h-3 w-3 text-primary" />
                    <span className="text-xs text-primary">{roleConfig.label}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {user ? (
              <>
                <Link to={roleConfig.portalPath} className="flex-1" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full gap-2">
                    <RoleIcon className="h-4 w-4" />
                    {roleConfig.portalLabel}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { handleSignOut(); setOpen(false); }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/signin" className="flex-1">
                <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                  Sign In
                </Button>
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
