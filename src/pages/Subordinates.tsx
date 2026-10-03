import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Subordinates() {
  const { user, role } = useAuth();

  const { data: myProfile } = useQuery({
    queryKey: ['my-profile-id', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: subordinates, isLoading } = useQuery({
    queryKey: ['subordinates', user?.id, role],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*');
      if (role === 'ADMIN') {
        query = query.neq('user_id', user!.id);
      } else if (myProfile?.id) {
        query = query.eq('reporting_manager_id', myProfile.id);
      } else {
        return [];
      }
      const { data, error } = await query.order('name');
      if (error) throw error;
      const userIds = data.map((p: any) => p.user_id);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
      const roleMap = new Map(roles?.map((r: any) => [r.user_id, r.role]) || []);
      return data.map((p: any) => ({ ...p, roleName: roleMap.get(p.user_id) || 'STUDENT' }));
    },
    enabled: !!user && (role === 'ADMIN' || !!myProfile?.id),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Subordinates"
          subtitle={role === 'ADMIN' ? 'All users in the organization' : 'Your direct reports'}
          icon={<UsersRound className="h-5 w-5 text-primary" />}
        />

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !subordinates?.length ? (
          <GlassCard className="py-12 text-center">
            <UsersRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium font-display text-foreground mb-2">No subordinates found</h3>
            <p className="text-muted-foreground">You don't have any direct reports.</p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subordinates.map((sub: any) => (
              <Link key={sub.id} to={`/subordinates/${sub.user_id}`}>
                <GlassCard hover>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                      <AvatarImage src={sub.profile_image_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {(sub.display_name || sub.name)?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{sub.display_name || sub.name}</p>
                      <Badge className={cn('text-xs mt-1', ROLE_COLORS[sub.roleName as keyof typeof ROLE_COLORS])}>
                        {sub.roleName}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                    {sub.department && <p>Dept: {sub.department}</p>}
                    {sub.register_number && <p>Reg: {sub.register_number}</p>}
                    {sub.is_mobile_visible && sub.mobile_number && <p>📱 {sub.mobile_number}</p>}
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
