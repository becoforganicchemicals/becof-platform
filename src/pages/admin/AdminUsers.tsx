import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const allRoles: AppRole[] = ["farmer", "distributor", "expert", "admin", "super_admin"];

const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: usersWithRoles, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase.from("user_roles").select("*");
      if (rolesErr) throw rolesErr;
      const { data: profiles, error: profErr } = await supabase.from("profiles").select("*");
      if (profErr) throw profErr;
      return roles.map(r => ({
        ...r,
        profile: profiles.find(p => p.user_id === r.user_id),
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
      toast({ title: "Role updated" });
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Users & Roles ({usersWithRoles?.length || 0})</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : usersWithRoles?.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.profile?.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.profile?.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.profile?.farm_location || "—"}</TableCell>
                  <TableCell><Badge className="capitalize">{u.role}</Badge></TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => updateRole.mutate({ id: u.id, role: v as AppRole })}>
                      <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {allRoles.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
