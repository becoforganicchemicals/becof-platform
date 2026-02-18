import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Ban, UserCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import type { Permission } from "@/hooks/usePermissions";

const AdminPermissions = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch all admin users (non-super_admin, non-farmer roles that need permissions)
  // Exclude the current super admin from the list so they can't toggle their own permissions
  const { data: adminUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["permission-users"],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("*")
        .in("role", ["admin", "expert", "distributor"]);
      if (rolesErr) throw rolesErr;

      // Filter out the current user so super admins can't modify their own permissions
      const filteredRoles = roles.filter((r) => r.user_id !== currentUser?.id);
      const userIds = filteredRoles.map((r) => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);
      if (profErr) throw profErr;

      return filteredRoles.map((r) => ({
        ...r,
        profile: profiles.find((p) => p.user_id === r.user_id),
      }));
    },
  });

  // Fetch all permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("category");
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Fetch selected user's permissions
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

  // Toggle permission
  const togglePerm = useMutation({
    mutationFn: async ({ permissionId, granted }: { permissionId: string; granted: boolean }) => {
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
  });

  // Suspend/reactivate user
  const toggleSuspension = useMutation({
    mutationFn: async ({ userId, suspend }: { userId: string; suspend: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: suspend ? "suspended" : "active" })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-users"] });
      toast({ title: "User status updated" });
    },
  });

  const selectedUser = adminUsers.find((u) => u.user_id === selectedUserId);

  // Group permissions by category
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  const isPermGranted = (permId: string) => {
    const up = userPerms.find((p) => p.permission_id === permId);
    return up?.granted ?? false;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ShieldCheck className="h-5 w-5" /> Permission Management
      </h2>

      {/* User selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select User</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
            </div>
          ) : adminUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No admin/expert/distributor users found.</p>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((u) => (
                    <TableRow
                      key={u.user_id}
                      className={selectedUserId === u.user_id ? "bg-primary/5" : "cursor-pointer hover:bg-muted/50"}
                      onClick={() => setSelectedUserId(u.user_id)}
                    >
                      <TableCell className="font-medium">{u.profile?.full_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{u.role.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.profile?.status === "suspended" ? "destructive" : "default"}>
                          {u.profile?.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserId(u.user_id);
                            }}
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Permissions
                          </Button>
                          {u.profile?.status === "suspended" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSuspension.mutate({ userId: u.user_id, suspend: false });
                              }}
                            >
                              <UserCheck className="h-3.5 w-3.5 mr-1" /> Reactivate
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSuspension.mutate({ userId: u.user_id, suspend: true });
                              }}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" /> Suspend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission toggles for selected user */}
      {selectedUserId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Permissions for: <span className="text-primary">{selectedUser?.profile?.full_name || selectedUserId}</span>
              <Badge variant="outline" className="capitalize ml-2">{selectedUser?.role?.replace(/_/g, " ")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPerms ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading permissions...
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([category, perms]) => (
                  <div key={category}>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">{category}</h4>
                    <div className="grid gap-3">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div>
                            <p className="text-sm font-medium">{perm.name}</p>
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          </div>
                          <Switch
                            checked={isPermGranted(perm.id)}
                            onCheckedChange={(checked) =>
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
  );
};

export default AdminPermissions;
