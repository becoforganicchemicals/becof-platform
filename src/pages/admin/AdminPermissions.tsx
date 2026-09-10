import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheck, Loader2, Shield, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const AdminPermissions = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Only admin-role users (not super_admin, farmer, distributor)
  const { data: admins = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["permission-admins"],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "admin");
      if (rolesErr) throw rolesErr;

      if (roles.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", roles.map((r) => r.user_id));
      if (profErr) throw profErr;

      return roles.map((r) => ({
        ...r,
        profile: profiles.find((p) => p.user_id === r.user_id) ?? null,
      }));
    },
  });

  // All permissions grouped by category
  const { data: permissions = [] } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("category");
      if (error) throw error;
      return data;
    },
  });

  // Selected user's permission grants
  const { data: userPerms = [], isLoading: loadingPerms } = useQuery({
    queryKey: ["user-perms", selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", selectedUserId!);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId,
  });

  const togglePerm = useMutation({
    mutationFn: async ({
      permissionId,
      granted,
    }: {
      permissionId: string;
      granted: boolean;
    }) => {
      if (!selectedUserId) return;
      const existing = userPerms.find((up) => up.permission_id === permissionId);
      if (existing) {
        const { error } = await supabase
          .from("user_permissions")
          .update({ granted, granted_by: currentUser?.id })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_permissions").insert({
          user_id: selectedUserId,
          permission_id: permissionId,
          granted,
          granted_by: currentUser?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-perms", selectedUserId] });
      toast({ title: "Permission updated" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const grantAll = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) return;
      for (const perm of permissions) {
        const existing = userPerms.find((up) => up.permission_id === perm.id);
        if (existing) {
          if (!existing.granted) {
            await supabase
              .from("user_permissions")
              .update({ granted: true, granted_by: currentUser?.id })
              .eq("id", existing.id);
          }
        } else {
          await supabase.from("user_permissions").insert({
            user_id: selectedUserId,
            permission_id: perm.id,
            granted: true,
            granted_by: currentUser?.id,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-perms", selectedUserId] });
      toast({ title: "All permissions granted" });
    },
  });

  const revokeAll = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) return;
      for (const up of userPerms) {
        if (up.granted) {
          await supabase
            .from("user_permissions")
            .update({ granted: false, granted_by: currentUser?.id })
            .eq("id", up.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-perms", selectedUserId] });
      toast({ title: "All permissions revoked" });
    },
  });

  const selectedAdmin = admins.find((u) => u.user_id === selectedUserId);
  const isPermGranted = (permId: string) =>
    userPerms.find((p) => p.permission_id === permId)?.granted ?? false;

  const grouped = permissions.reduce<Record<string, typeof permissions>>(
    (acc, p) => {
      (acc[p.category] = acc[p.category] || []).push(p);
      return acc;
    },
    {}
  );

  const grantedCount = userPerms.filter((p) => p.granted).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Admin Permission Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control which admin modules each admin can access. Super admins always
          have full access.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Admin list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Admin Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-muted-foreground p-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : admins.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4">
                  No admin users found. Only users with the "Admin" role appear
                  here.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {admins.map((u) => {
                    const selected = selectedUserId === u.user_id;
                    const initials =
                      u.profile?.full_name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "A";

                    return (
                      <div
                        key={u.user_id}
                        onClick={() => setSelectedUserId(u.user_id)}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                          selected
                            ? "bg-primary/8 border-l-2 border-primary"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage
                            src={u.profile?.avatar_url || undefined}
                          />
                          <AvatarFallback className="text-xs bg-muted">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {u.profile?.full_name || "Unknown"}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Shield className="h-3 w-3 text-purple-600" />
                            <span className="text-xs text-muted-foreground">
                              Admin
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 transition-colors ${
                            selected
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Permission toggles */}
        <div className="lg:col-span-3">
          {!selectedUserId ? (
            <Card className="h-full flex items-center justify-center min-h-[300px]">
              <CardContent className="text-center text-muted-foreground">
                <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  Select an admin on the left to manage their module access.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    Permissions for{" "}
                    <span className="text-primary">
                      {selectedAdmin?.profile?.full_name || "Admin"}
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {grantedCount} / {permissions.length} granted
                    </Badge>
                    <button
                      onClick={() => grantAll.mutate()}
                      className="text-xs text-primary hover:underline"
                    >
                      Grant all
                    </button>
                    <span className="text-muted-foreground text-xs">|</span>
                    <button
                      onClick={() => revokeAll.mutate()}
                      className="text-xs text-destructive hover:underline"
                    >
                      Revoke all
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPerms ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading
                    permissions…
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(grouped).map(([category, perms]) => (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {category}
                          </h4>
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground">
                            {perms.filter((p) => isPermGranted(p.id)).length}/
                            {perms.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {perms.map((perm) => (
                            <div
                              key={perm.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                isPermGranted(perm.id)
                                  ? "bg-primary/5 border-primary/20"
                                  : "bg-card border-border"
                              }`}
                            >
                              <div className="flex-1 min-w-0 mr-4">
                                <p className="text-sm font-medium">
                                  {perm.name.replace(".", " → ").replace(/^\w/, (c: string) => c.toUpperCase())}
                                </p>
                                {perm.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                              <Switch
                                checked={isPermGranted(perm.id)}
                                onCheckedChange={(checked) =>
                                  togglePerm.mutate({
                                    permissionId: perm.id,
                                    granted: checked,
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPermissions;
