import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PageKey = 
  | "dashboard"
  | "autoilijat"
  | "dokumentit"
  | "kalusto"
  | "laitteet"
  | "kuljettajat"
  | "varustelu"
  | "laadunvalvonta"
  | "asetukset"
  | "kayttajat";

interface PagePermission {
  can_view: boolean;
  can_edit: boolean;
}

interface UserPermissions {
  isSystemAdmin: boolean;
  permissions: Record<PageKey, PagePermission>;
  isLoading: boolean;
}

const defaultPermission: PagePermission = { can_view: false, can_edit: false };

const allPages: PageKey[] = [
  "dashboard",
  "autoilijat",
  "dokumentit",
  "kalusto",
  "laitteet",
  "kuljettajat",
  "varustelu",
  "laadunvalvonta",
  "asetukset",
  "kayttajat",
];

export function usePermissions(): UserPermissions {
  // Check if user is system admin
  const { data: isSystemAdmin = false, isLoading: isAdminLoading } = useQuery({
    queryKey: ["is-system-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "system_admin")
        .maybeSingle();

      return !!data;
    },
  });

  // Fetch user's role(s)
  const { data: userRoles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ["user-roles-current"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
  });

  // Fetch all role permissions
  const { data: rolePermissions = [], isLoading: isPermissionsLoading } = useQuery({
    queryKey: ["role-permissions-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_page_permissions")
        .select(`
          page_key,
          can_view,
          can_edit,
          role:roles(name)
        `);

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate permissions for the current user
  const permissions: Record<PageKey, PagePermission> = {} as Record<PageKey, PagePermission>;

  // Initialize all pages with default (no access)
  allPages.forEach(page => {
    permissions[page] = { ...defaultPermission };
  });

  // If system admin, grant full access
  if (isSystemAdmin) {
    allPages.forEach(page => {
      permissions[page] = { can_view: true, can_edit: true };
    });
  } else {
    // Calculate permissions based on user's roles
    rolePermissions.forEach((perm: any) => {
      const roleName = perm.role?.name;
      const pageKey = perm.page_key as PageKey;
      
      if (roleName && userRoles.includes(roleName) && allPages.includes(pageKey)) {
        // Use OR logic - if any role grants access, allow it
        permissions[pageKey] = {
          can_view: permissions[pageKey].can_view || perm.can_view,
          can_edit: permissions[pageKey].can_edit || perm.can_edit,
        };
      }
    });
  }

  return {
    isSystemAdmin,
    permissions,
    isLoading: isAdminLoading || isRolesLoading || isPermissionsLoading,
  };
}

// Helper hook for checking a single page permission
export function usePagePermission(pageKey: PageKey): PagePermission & { isLoading: boolean } {
  const { permissions, isLoading } = usePermissions();
  
  return {
    ...permissions[pageKey],
    isLoading,
  };
}
