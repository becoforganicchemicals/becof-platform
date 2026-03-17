import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; description: string }> = {
  pending: {
    label: "Pending Review",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
    description: "Your application has been received and is awaiting review by our partnerships team.",
  },
  reviewing: {
    label: "Under Review",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Eye,
    description: "Our team is actively reviewing your application. You'll receive an email once a decision is made.",
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
    description: "Congratulations! Your application has been approved. Check your email for login credentials.",
  },
  rejected: {
    label: "Not Approved",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    description: "Unfortunately, your application was not approved at this time. Check your email for details.",
  },
};

interface AppResult {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const ApplicationStatus = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AppResult[] | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase.rpc("lookup_application_status", { _email: email.trim().toLowerCase() });

    if (error) {
      console.error("Lookup error:", error);
      setResults([]);
    } else {
      setResults((data as AppResult[]) || []);
    }
    setLoading(false);
  };

  return (
    <Layout>
      <SEO
        title="Application Status | Becof Organic Chemicals"
        description="Check the status of your Becof distributor partnership application."
        url="https://www.becoforganicchemicals.com/application-status"
      />

      <section className="py-16 min-h-[70vh]">
        <div className="container max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Application Status</h1>
              <p className="text-muted-foreground">
                Enter the email address you used when applying to check your application status.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5" /> Look Up Your Application
                </CardTitle>
                <CardDescription>
                  We'll show you the current status of any distributor applications linked to your email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" disabled={loading} className="gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            {searched && results !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
                {results.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No applications found for this email address.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        If you recently submitted an application, please allow a few minutes for it to appear.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  results.map(app => {
                    const config = statusConfig[app.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    const ref = app.id.slice(0, 8).toUpperCase();

                    return (
                      <Card key={app.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                              <StatusIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-mono text-sm font-semibold text-muted-foreground">
                                  Ref: #{ref}
                                </span>
                                <Badge variant="outline" className={config.color}>
                                  {config.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{config.description}</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>Submitted: {new Date(app.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                                <span>Updated: {new Date(app.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default ApplicationStatus;
