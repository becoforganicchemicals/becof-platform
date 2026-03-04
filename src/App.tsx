import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Wishlist from "./pages/Wishlist";
import Learn from "./pages/Learn";
import Impact from "./pages/Impact";
import About from "./pages/About";
import Partners from "./pages/Partners";
import Contact from "./pages/Contact";
import SignIn from "./pages/SignIn";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Careers from "./pages/Careers";
import Profile from "./pages/Profile";
import LearnDetail from "./pages/LearnDetail";
import CustomOrder from "./pages/CustomOrder";

const queryClient = new QueryClient();

// ── Where each role lands after login ────────────────────────────────────────
// Exported so SignIn.tsx can import and reuse the same logic
export const getRoleRedirect = (role: string | null): string => {
  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin";
    case "distributor":
      return "/profile";
    case "farmer":
    default:
      return "/products";
  }
};

// ── Spinner while auth resolves ───────────────────────────────────────────────
const AuthSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// ── Requires any logged-in user ───────────────────────────────────────────────
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthSpinner />;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

// ── Guest only: redirect logged-in users to their portal ─────────────────────
const GuestOnly = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  if (loading) return <AuthSpinner />;
  if (user) return <Navigate to={getRoleRedirect(role)} replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>

              {/* ── Fully public ─────────────────────────────────────── */}
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/:slug" element={<LearnDetail />} />
              <Route path="/impact" element={<Impact />} />
              <Route path="/about" element={<About />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/careers" element={<Careers />} />

              {/* Sign-in: kick already-logged-in users to their portal */}
              <Route path="/signin"
                element={<GuestOnly><SignIn /></GuestOnly>}
              />

              {/* ── Any authenticated user ────────────────────────────── */}
              <Route path="/cart"
                element={<RequireAuth><Cart /></RequireAuth>}
              />
              <Route path="/checkout"
                element={<RequireAuth><Checkout /></RequireAuth>}
              />
              <Route path="/custom-order"
                element={<RequireAuth><CustomOrder /></RequireAuth>}
              />
              <Route path="/wishlist"
                element={<RequireAuth><Wishlist /></RequireAuth>}
              />
              <Route path="/profile"
                element={<RequireAuth><Profile /></RequireAuth>}
              />

              {/* ── Admin (guards are inside AdminDashboard itself) ───── */}
              <Route path="/admin" element={<AdminDashboard />} />

              {/* ── 404 ──────────────────────────────────────────────── */}
              <Route path="*" element={<NotFound />} />

            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
