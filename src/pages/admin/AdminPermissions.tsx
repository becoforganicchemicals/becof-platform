import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck, Ban, UserCheck, Loader2, Shield, Truck, Tractor, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "text-purple-600 bg-purple-50 border-purple-200" },
  distributor: { label: "Distributor", icon: Truck, color: "text-blue-600 bg-blue-50 border-blue-200" },
  farmer: { label: "Farmer", icon: Tractor, color: "text-green-600 bg-green-50 border-green-200" },
};

const AdminPermissions = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // All users except the current super admin
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["permission-users"],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("*")
        .in("role", ["admin", "distributor", "farmer"]);   // expert removed
      if (rolesErr) throw rolesErr;

      const filtered = roles.filter(r => r.user_id !== currentUser?.id);
      if (filtered.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", filtered.map(r => r.user_id));
      if (profErr) throw profErr;

      return filtered.map(r => ({
        ...r,
        profile: profiles.find(p => p.user_id === r.user_id) ?? null,
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
    mutationFn: async ({ permissionId, granted }: { permissionId: string; granted: boolean }) => {
      if (!selectedUserId) return;
      const existing = userPerms.find(up => up.permission_id === permissionId);
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
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleSuspend = useMutation({
    mutationFn: async ({ userId, suspend }: { userId: string; suspend: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: suspend ? "suspended" : "active" })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["permission-users"] });
      toast({ title: vars.suspend ? "User suspended" : "User reactivated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const selectedUser = users.find(u => u.user_id === selectedUserId);
  const isPermGranted = (permId: string) =>
    userPerms.find(p => p.permission_id === permId)?.granted ?? false;

  // Group permissions by category
  const grouped = permissions.reduce<Record<string, typeof permissions>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  const grantedCount = userPerms.filter(p => p.granted).length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ShieldCheck className="h-5 w-5" /> Permission Management
      </h2>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left: User list ── */}
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select a User</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-muted-foreground p-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4">No manageable users found.</p>
              ) : (
                <div className="divide-y divide-border">
                  {users.map(u => {
                    const cfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.farmer;
                    const Icon = cfg.icon;
                    const suspended = u.profile?.status === "suspended";
                    const selected = selectedUserId === u.user_id;
                    const initials = u.profile?.full_name
                      ?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

                    return (
                      <div
                        key={u.user_id}
                        onClick={() => setSelectedUserId(u.user_id)}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${selected ? "bg-primary/8 border-l-2 border-primary" : "hover:bg-muted/50"
                          }`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={u.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {u.profile?.full_name || "Unknown"}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Icon className={`h-3 w-3 ${cfg.color.split(" ")[0]}`} />
                            <span className="text-xs text-muted-foreground">{cfg.label}</span>
                            {suspended && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0 ml-1">
                                Suspended
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Suspend / Reactivate */}
                          {suspended ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              title="Reactivate"
                              onClick={e => {
                                e.stopPropagation();
                                toggleSuspend.mutate({ userId: u.user_id, suspend: false });
                              }}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Suspend"
                              onClick={e => {
                                e.stopPropagation();
                                toggleSuspend.mutate({ userId: u.user_id, suspend: true });
                              }}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          <ChevronRight className={`h-4 w-4 transition-colors ${selected ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Permission toggles ── */}
        <div className="lg:col-span-3">
          {!selectedUserId ? (
            <Card className="h-full flex items-center justify-center min-h-[300px]">
              <CardContent className="text-center text-muted-foreground">
                <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a user on the left to manage their permissions.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    Permissions for{" "}
                    <span className="text-primary">
                      {selectedUser?.profile?.full_name || "User"}
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {selectedUser && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_CONFIG[selectedUser.role]?.color ?? ""
                        }`}>
                        {ROLE_CONFIG[selectedUser.role]?.label}
                      </span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {grantedCount} / {permissions.length} granted
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPerms ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading permissions…
                  </div>
                ) : permissions.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No permissions defined yet.
                  </p>
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
                            {perms.filter(p => isPermGranted(p.id)).length}/{perms.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {perms.map(perm => (
                            <div
                              key={perm.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isPermGranted(perm.id)
                                  ? "bg-primary/5 border-primary/20"
                                  : "bg-card border-border"
                                }`}
                            >
                              <div className="flex-1 min-w-0 mr-4">
                                <p className="text-sm font-medium">{perm.name}</p>
                                {perm.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                              <Switch
                                checked={isPermGranted(perm.id)}
                                onCheckedChange={checked =>
                                  togglePerm.mutate({ permissionId: perm.id, granted: checked })
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
