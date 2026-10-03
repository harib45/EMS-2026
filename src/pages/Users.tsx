import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UserRole, ROLE_COLORS, ROLE_HIERARCHY } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Users, Edit2, KeyRound } from 'lucide-react';

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string;
  department: string | null;
  created_at: string;
  role?: UserRole;
}

export default function UsersPage() {
  const { role, user } = useAuth();
  const { data: dynamicRoles } = useRoles();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

  const handleResetPassword = async (targetUser: UserWithRole) => {
    if (!confirm(`Reset password for ${targetUser.name}? Their password will be set to "123456" and they will be required to change it on next login.`)) return;
    setResettingPassword(targetUser.user_id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', { body: { target_user_id: targetUser.user_id } });
      if (error) throw error;
      toast.success(`Password reset for ${targetUser.name}. Default: 123456`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setResettingPassword(null);
    }
  };

  const fetchUsers = async () => {
    try {
      const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
      ]);
      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;
      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.user_id)?.role as UserRole | undefined,
      })) || [];
      setUsers(usersWithRoles);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (role === 'ADMIN') fetchUsers(); }, [role]);

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;
    setUpdating(true);
    try {
      const selectedRoleObj = dynamicRoles?.find((r: any) => r.name === newRole);
      const updateData: any = { role: newRole as UserRole };
      if (selectedRoleObj) updateData.role_id = selectedRoleObj.id;
      const { error } = await supabase.from('user_roles').update(updateData).eq('user_id', selectedUser.user_id);
      if (error) throw error;
      toast.success('User role updated successfully');
      setSelectedUser(null);
      setNewRole('');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          subtitle="Manage user roles and permissions"
          icon={<Users className="h-5 w-5 text-primary" />}
        />

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold font-display">All Users</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">View and manage all registered users in the system</p>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.department || '-'}</TableCell>
                      <TableCell>
                        <Badge className={cn('font-medium', u.role ? ROLE_COLORS[u.role] : 'bg-muted')}>{u.role || 'No Role'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(u.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { setSelectedUser(u); setNewRole(u.role || ''); }} disabled={u.user_id === user?.id}>
                          <Edit2 className="h-4 w-4 mr-1" />Edit Role
                        </Button>
                        <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => handleResetPassword(u)} disabled={u.user_id === user?.id || resettingPassword === u.user_id}>
                          {resettingPassword === u.user_id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <KeyRound className="h-4 w-4 mr-1" />}
                          Reset Password
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>

        <Dialog open={!!selectedUser} onOpenChange={() => { setSelectedUser(null); setNewRole(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update User Role</DialogTitle>
              <DialogDescription>Change the role for {selectedUser?.name}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="bg-accent/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium">{selectedUser?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span className="font-medium">{selectedUser?.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current Role:</span><Badge className={cn('font-medium', selectedUser?.role ? ROLE_COLORS[selectedUser.role] : 'bg-muted')}>{selectedUser?.role || 'No Role'}</Badge></div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Role</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {ROLE_HIERARCHY.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    {dynamicRoles?.filter((r: any) => !r.is_system_role).map((r: any) => <SelectItem key={r.id} value={r.name}>{r.name} (custom)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedUser(null); setNewRole(''); }}>Cancel</Button>
              <Button onClick={handleUpdateRole} disabled={updating || !newRole}>
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
