import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserPermissions {
  can_raise_expense: boolean;
  can_approve_expense: boolean;
  can_view_analytics: boolean;
  can_manage_users: boolean;
}

export function usePermissions() {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_permissions', { p_user_id: user!.id });

      if (error) throw error;
      if (data && data.length > 0) return data[0] as UserPermissions;

      // Fallback defaults
      return {
        can_raise_expense: true,
        can_approve_expense: false,
        can_view_analytics: false,
        can_manage_users: false,
      } as UserPermissions;
    },
    enabled: !!user,
  });

  return { permissions: permissions ?? null, isLoading };
}

export function useRoles() {
  return useQuery({
    queryKey: ['all-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*, role_permissions(*)')
        .order('created_at');

      if (error) throw error;
      return data;
    },
  });
}
