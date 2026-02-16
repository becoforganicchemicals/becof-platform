import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  permission?: Permission;
}

export const usePermissions = () => {
  const { user, isSuperAdmin } = useAuth();

  const { data: allPermissions = [] } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data as Permission[];
    },
    enabled: !!user,
  });

  const { data: userPermissions = [] } = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!user,
  });

  const hasPermission = (permissionName: string): boolean => {
    if (isSuperAdmin) return true;
    const perm = allPermissions.find((p) => p.name === permissionName);
    if (!perm) return false;
    const up = userPermissions.find((up) => up.permission_id === perm.id);
    return up?.granted ?? false;
  };

  return { allPermissions, userPermissions, hasPermission };
};
