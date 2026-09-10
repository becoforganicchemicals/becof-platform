import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Send, Loader2, CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

interface AdminWelcomeProps {
  mode?: "welcome" | "request-more";
}

const AdminWelcome = ({ mode = "welcome" }: AdminWelcomeProps) => {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { allPermissions, userPermissions } = usePermissions();
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Get set of already-granted permission names
  const grantedPermissionIds = new Set(
    userPermissions.filter((up) => up.granted).map((up) => up.permission_id)
  );
  const grantedPermissionNames = new Set(
    allPermissions
      .filter((p) => grantedPermissionIds.has(p.id))
      .map((p) => p.name)
  );

  // Check for denial notifications targeting this user
  const { data: denialNotice } = useQuery({
    queryKey: ["access-denied-notice", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("id, message, created_at, metadata")
        .eq("type", "access_denied")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data?.find((n: any) => {
        const meta = n.metadata as any;
        return meta?.target_user_id === user?.id;
      }) || null;
    },
    enabled: !!user,
  });

  // Check for pending requests from this user
  const { data: pendingRequest } = useQuery({
    queryKey: ["pending-access-request", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("id, created_at, metadata")
        .eq("type", "access_request")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data?.find((n: any) => {
        const meta = n.metadata as any;
        return meta?.requester_id === user?.id;
      }) || null;
    },
    enabled: !!user,
  });

  // Request history — all past access_request notifications from this user
  const { data: requestHistory = [] } = useQuery({
    queryKey: ["access-request-history", user?.id],
    queryFn: async () => {
      // Fetch all access_request and access_denied notifications
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("id, type, title, message, created_at, is_read, metadata")
        .in("type", ["access_request", "access_denied"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Filter for this user's requests and denials
      const requests = (data || []).filter((n: any) => {
        const meta = n.metadata as any;
        return meta?.requester_id === user?.id || meta?.target_user_id === user?.id;
      });

      // Group: each access_request becomes a history entry
      return requests
        .filter((n: any) => n.type === "access_request")
        .map((req: any) => {
          const meta = req.metadata as any;
          const modules = meta?.requested_modules || [];
          // Check if there's a corresponding denial
          const denied = requests.find(
            (d: any) => d.type === "access_denied" && (d.metadata as any)?.target_user_id === user?.id &&
              new Date(d.created_at) > new Date(req.created_at)
          );
          let status: "pending" | "approved" | "denied" = "pending";
          if (denied) status = "denied";
          else if (req.is_read && !denied) status = "approved";

          return {
            id: req.id,
            modules,
            status,
            created_at: req.created_at,
          };
        });
    },
    enabled: !!user,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["all-permissions-welcome"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("id, name, description, category")
        .order("category");
      if (error) throw error;
      return data;
    },
  });

  const grouped = permissions.reduce<Record<string, typeof permissions>>(
    (acc, p) => {
      (acc[p.category] = acc[p.category] || []).push(p);
      return acc;
    },
    {}
  );

  const toggleModule = (name: string) => {
    if (grantedPermissionNames.has(name)) return;
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleRequest = async () => {
    if (!user || selected.length === 0) return;
    setSending(true);
    try {
      const adminName = profile?.full_name || user.email || "An admin";
      const moduleList = selected
        .map((n) => formatPermName(n))
        .join(", ");

      const { error } = await supabase.from("admin_notifications").insert({
        type: "access_request",
        title: `Access Request from ${adminName}`,
        message: `${adminName} (${user.email}) is requesting access to: ${moduleList}`,
        metadata: {
          requester_id: user.id,
          requester_email: user.email,
          requested_modules: selected,
        },
      });
      if (error) throw error;

      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["pending-access-request"] });
      queryClient.invalidateQueries({ queryKey: ["access-request-history"] });
      toast({ title: "Request sent", description: "The Super Admin has been notified." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  const isRequestMore = mode === "request-more";

  // Show pending state inline (not full-page block for request-more mode)
  const hasPending = !!pendingRequest;

  return (
    <div className="flex flex-col items-center py-12 px-4 max-w-xl mx-auto">
      {/* Denial banner */}
      {denialNotice && (
        <div className="w-full mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Previous Request Denied</p>
            <p className="text-xs text-muted-foreground mt-1">
              {denialNotice.message || "Your access request was denied. You can submit a new request with different modules below."}
            </p>
          </div>
        </div>
      )}

      {/* Pending banner */}
      {hasPending && (
        <div className="w-full mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
          <Loader2 className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-spin" />
          <div>
            <p className="text-sm font-medium text-primary">Request Pending</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your access request is awaiting review by the Super Admin.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-full bg-primary/10 p-4 mb-6">
        {isRequestMore ? (
          <ShieldCheck className="h-12 w-12 text-primary" />
        ) : (
          <Shield className="h-12 w-12 text-primary" />
        )}
      </div>

      {isRequestMore ? (
        <>
          <h3 className="text-xl font-bold mb-2 text-center">Request Additional Access</h3>
          <p className="text-muted-foreground mb-1 text-center">
            You currently have access to some modules. Select additional modules below to request more permissions.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-bold mb-2 text-center">Welcome to Becof Admin</h3>
          <p className="text-muted-foreground mb-1 text-center">
            Your account is set up, but you don't have any module permissions yet.
          </p>
        </>
      )}

      <Badge variant="outline" className="capitalize mb-6">
        {role?.replace(/_/g, " ") || "Admin"}
      </Badge>

      {/* Module request form — disabled when pending */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isRequestMore ? "Request More Modules" : "Request Module Access"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {hasPending
              ? "You have a pending request. Wait for it to be reviewed before submitting another."
              : "Select the modules you need, then send a request to the Super Admin."}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {Object.entries(grouped).map(([category, perms]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {category}
              </h4>
              <div className="space-y-2">
                {perms.map((perm) => {
                  const isGranted = grantedPermissionNames.has(perm.name);
                  const isSelected = selected.includes(perm.name);
                  const isDisabled = isGranted || hasPending;

                  return (
                    <label
                      key={perm.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isGranted
                          ? "bg-muted/30 border-border opacity-60 cursor-default"
                          : isDisabled
                          ? "bg-card border-border opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary/5 border-primary/20 cursor-pointer"
                          : "bg-card border-border hover:bg-muted/50 cursor-pointer"
                      }`}
                    >
                      <Checkbox
                        checked={isGranted || isSelected}
                        disabled={isDisabled}
                        onCheckedChange={() => toggleModule(perm.name)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium flex items-center gap-2">
                          {formatPermName(perm.name)}
                          {isGranted && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Granted
                            </Badge>
                          )}
                        </p>
                        {perm.description && (
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <Button
            className="w-full"
            disabled={selected.length === 0 || sending || hasPending}
            onClick={handleRequest}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Request ({selected.length} module{selected.length !== 1 ? "s" : ""})
          </Button>
        </CardContent>
      </Card>

      {/* Request History */}
      {requestHistory.length > 0 && (
        <Card className="w-full mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Request History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {entry.modules.map((m: string) => formatPermName(m)).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(entry.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <RequestStatusBadge status={entry.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function formatPermName(name: string) {
  return name
    .replace(".", " → ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function RequestStatusBadge({ status }: { status: "pending" | "approved" | "denied" }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="gap-1 text-xs shrink-0">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="secondary" className="gap-1 text-xs shrink-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    case "denied":
      return (
        <Badge variant="secondary" className="gap-1 text-xs shrink-0 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="h-3 w-3" /> Denied
        </Badge>
      );
  }
}

export default AdminWelcome;
