import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, Search, Ban, UserCheck, Shield, Tractor, Truck, ShieldCheck,
  Loader2, Phone, MapPin, Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// expert removed
const ALL_ROLES: AppRole[] = ["farmer", "distributor", "admin", "super_admin"];

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  farmer: { label: "Farmer", icon: Tractor, color: "text-green-600 bg-green-50 border-green-200" },
  distributor: { label: "Distributor", icon: Truck, color: "text-blue-600 bg-blue-50 border-blue-200" },
  admin: { label: "Admin", icon: Shield, color: "text-purple-600 bg-purple-50 border-purple-200" },
  super_admin: { label: "Super Admin", icon: ShieldCheck, color: "text-red-600 bg-red-50 border-red-200" },
};

const RoleBadge = ({ role }: { role: string }) => {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.farmer;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

const AdminUsers = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [detailUser, setDetailUser] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (rolesErr) throw rolesErr;

      const userIds = roles.map(r => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);
      if (profErr) throw profErr;

      return roles.map(r => ({
        ...r,
        profile: profiles.find(p => p.user_id === r.user_id) ?? null,
      }));
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Role updated successfully" });
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
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: vars.suspend ? "User suspended" : "User reactivated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Filter
  const filtered = users.filter(u => {
    const name = u.profile?.full_name?.toLowerCase() ?? "";
    const match = name.includes(search.toLowerCase());
    const roleMatch = roleFilter === "all" || u.role === roleFilter;
    return match && roleMatch;
  });

  // Stats
  const counts = ALL_ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Users & Roles
          <span className="text-sm font-normal text-muted-foreground ml-1">({users.length})</span>
        </h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ALL_ROLES.map(r => {
          const cfg = ROLE_CONFIG[r];
          const Icon = cfg.icon;
          return (
            <Card
              key={r}
              className={`cursor-pointer transition-all border ${roleFilter === r ? "ring-2 ring-primary" : "hover:shadow-sm"
                }`}
              onClick={() => setRoleFilter(roleFilter === r ? "all" : r)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{counts[r]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ALL_ROLES.map(r => (
              <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Change Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : filtered.map(u => {
                const isSelf = u.user_id === currentUser?.id;
                const suspended = u.profile?.status === "suspended";
                const initials = u.profile?.full_name
                  ? u.profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                  : "U";

                return (
                  <TableRow key={u.id} className={isSelf ? "bg-primary/5" : ""}>
                    <TableCell>
                      <button
                        className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                        onClick={() => setDetailUser(u)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {u.profile?.full_name || "—"}
                            {isSelf && <span className="ml-1 text-xs text-primary">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        {u.profile?.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />{u.profile.phone}
                          </div>
                        )}
                        {(u.profile?.farm_location || u.profile?.business_location) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {u.profile.farm_location || u.profile.business_location}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><RoleBadge role={u.role} /></TableCell>
                    <TableCell>
                      <Badge variant={suspended ? "destructive" : "default"} className="text-xs">
                        {suspended ? "Suspended" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={isSelf}
                        onValueChange={v => updateRole.mutate({ id: u.id, role: v as AppRole })}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.map(r => (
                            <SelectItem key={r} value={r}>
                              {ROLE_CONFIG[r].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {!isSelf && (
                        suspended ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => toggleSuspend.mutate({ userId: u.user_id, suspend: false })}
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Reactivate
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => toggleSuspend.mutate({ userId: u.user_id, suspend: true })}
                          >
                            <Ban className="h-3.5 w-3.5" /> Suspend
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User detail dialog */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Profile information for this user.</DialogDescription>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={detailUser.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-lg bg-muted">
                    {detailUser.profile?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{detailUser.profile?.full_name || "Unknown"}</p>
                  <RoleBadge role={detailUser.role} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {detailUser.profile?.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                    <p className="font-medium">{detailUser.profile.phone}</p>
                  </div>
                )}
                {detailUser.profile?.status && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                    <Badge variant={detailUser.profile.status === "suspended" ? "destructive" : "default"}>
                      {detailUser.profile.status}
                    </Badge>
                  </div>
                )}
                {/* Farmer fields */}
                {detailUser.role === "farmer" && detailUser.profile?.farm_location && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Farm Location</p>
                    <p className="font-medium">{detailUser.profile.farm_location}</p>
                  </div>
                )}
                {detailUser.role === "farmer" && detailUser.profile?.farm_size_hectares && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Farm Size</p>
                    <p className="font-medium">{detailUser.profile.farm_size_hectares} ha</p>
                  </div>
                )}
                {detailUser.role === "farmer" && detailUser.profile?.crop_types?.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Crop Types</p>
                    <p className="font-medium">{detailUser.profile.crop_types.join(", ")}</p>
                  </div>
                )}
                {/* Distributor fields */}
                {detailUser.role === "distributor" && detailUser.profile?.business_name && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Business</p>
                    <p className="font-medium">{detailUser.profile.business_name}</p>
                  </div>
                )}
                {detailUser.role === "distributor" && detailUser.profile?.business_location && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Location</p>
                    <p className="font-medium">{detailUser.profile.business_location}</p>
                  </div>
                )}
                {detailUser.role === "distributor" && detailUser.profile?.coverage_area && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Coverage Area</p>
                    <p className="font-medium">{detailUser.profile.coverage_area}</p>
                  </div>
                )}
                {detailUser.role === "distributor" && detailUser.profile?.years_in_business && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Years in Business</p>
                    <p className="font-medium flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> {detailUser.profile.years_in_business} yrs
                    </p>
                  </div>
                )}
                {detailUser.profile?.bio && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Bio</p>
                    <p className="text-sm">{detailUser.profile.bio}</p>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                Joined {new Date(detailUser.created_at).toLocaleDateString("en-KE", {
                  year: "numeric", month: "long", day: "numeric"
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
