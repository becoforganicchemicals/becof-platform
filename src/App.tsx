import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useState, type ComponentType, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import AnalyticsPageViewTracker from "@/components/AnalyticsPageViewTracker";
import ScrollToTop from "@/components/ScrollToTop";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Learn from "./pages/Learn";
import Impact from "./pages/Impact";
import About from "./pages/About";
import Partners from "./pages/Partners";
import Affiliate from "./pages/Affiliate";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Careers from "./pages/Careers";
import LearnDetail from "./pages/LearnDetail";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import CookiePolicy from "./pages/legal/CookiePolicy";
import AccessibilityStatement from "./pages/legal/AccessibilityStatement";

// Signed-in, transactional and admin pages are split into their own chunks,
// so public visitors (and crawlers) don't download the admin dashboard, rich
// text editor and charts just to view a product. Public, indexable pages stay
// in the main bundle so they're pre-rendered and appear without a loading state.
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const SignIn = lazy(() => import("./pages/SignIn"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const CustomOrder = lazy(() => import("./pages/CustomOrder"));
const ApplicationStatus = lazy(() => import("./pages/ApplicationStatus"));
const DistributorDashboard = lazy(() => import("./pages/DistributorDashboard"));

// ── Where each role lands after login ────────────────────────────────────────
// Exported so SignIn.tsx can import and reuse the same logic
export const getRoleRedirect = (role: string | null): string => {
  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin";
    case "distributor":
      return "/distributor";
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
  const { user, role, loading } = useAuth();
  if (loading) return <AuthSpinner />;
  if (!user) return <Navigate to="/signin" replace />;
  // User is set but role hasn't been fetched yet — hold rendering until stable.
  // This prevents protected pages from running their own queries with a null role.
  if (role === null) return <AuthSpinner />;
  return <>{children}</>;
};

// ── Guest only: redirect logged-in users to their portal ─────────────────────
const GuestOnly = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  if (loading) return <AuthSpinner />;
  // User is authenticated but role is still being resolved (fetchUserData in flight).
  // Spin here instead of redirecting with role=null → /products (farmer experience).
  if (user && role === null) return <AuthSpinner />;
  if (user) return <Navigate to={getRoleRedirect(role)} replace />;
  return <>{children}</>;
};

// The browser uses BrowserRouter; the build-time prerender (entry-server.tsx)
// passes in a StaticRouter pinned to the URL being rendered.
type RouterComponent = ComponentType<{ children: ReactNode }>;

const App = ({ Router = BrowserRouter }: { Router?: RouterComponent }) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <CookieConsentProvider>
          <Toaster />
          <Sonner />
          <Router>
            <ScrollToTop />
            <AnalyticsPageViewTracker />
            <CookieConsentBanner />
            <Suspense fallback={<AuthSpinner />}>
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
              <Route path="/affiliates" element={<Affiliate />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/application-status" element={<ApplicationStatus />} />
              <Route path="/legal/privacy" element={<PrivacyPolicy />} />
              <Route path="/legal/terms" element={<TermsOfService />} />
              <Route path="/legal/cookies" element={<CookiePolicy />} />
              <Route path="/legal/accessibility" element={<AccessibilityStatement />} />

              {/* Sign-in: kick already-logged-in users to their portal */}
              <Route path="/signin"
                element={<GuestOnly><SignIn /></GuestOnly>}
              />

              {/* Cart and checkout allow guest access — Cart.tsx/Checkout.tsx
                  handle the signed-out case internally rather than being
                  gated by RequireAuth here. */}
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />

              {/* ── Any authenticated user ────────────────────────────── */}
              <Route path="/custom-order"
                element={<RequireAuth><CustomOrder /></RequireAuth>}
              />
              <Route path="/wishlist"
                element={<RequireAuth><Wishlist /></RequireAuth>}
              />
              <Route path="/profile"
                element={<RequireAuth><Profile /></RequireAuth>}
              />
              <Route path="/distributor"
                element={<RequireAuth><DistributorDashboard /></RequireAuth>}
              />

              {/* ── Admin (guards are inside AdminDashboard itself) ───── */}
              <Route path="/admin" element={<AdminDashboard />} />

              {/* ── 404 ──────────────────────────────────────────────── */}
              <Route path="*" element={<NotFound />} />

            </Routes>
            </Suspense>
          </Router>
          </CookieConsentProvider>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
