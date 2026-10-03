import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Plus, Settings2, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function RoleManagementPage() {
  const { role } = useAuth();
  const { data: roles, isLoading } = useRoles();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [permissions, setPermissions] = useState({ can_raise_expense: true, can_approve_expense: false, can_view_analytics: false, can_manage_users: false });
  const [savingPerms, setSavingPerms] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) { toast.error('Role name is required'); return; }
    setCreating(true);
    try {
      const { data: newRole, error } = await supabase.from('roles').insert({ name: newRoleName.toUpperCase().trim(), description: newRoleDesc || null, is_system_role: false }).select().single();
      if (error) throw error;
      const { error: permError } = await supabase.from('role_permissions').insert({ role_id: newRole.id });
      if (permError) throw permError;
      toast.success(`Role "${newRoleName}" created`); setShowCreate(false); setNewRoleName(''); setNewRoleDesc('');
      queryClient.invalidateQueries({ queryKey: ['all-roles'] });
    } catch (e: any) { toast.error(e.message || 'Failed to create role'); } finally { setCreating(false); }
  };

  const getRolePerms = (r: any) => { const rp = r.role_permissions; return Array.isArray(rp) ? rp[0] : rp; };

  const openPermissions = (r: any) => {
    setEditRole(r);
    const rp = getRolePerms(r) || {};
    setPermissions({ can_raise_expense: rp.can_raise_expense ?? true, can_approve_expense: rp.can_approve_expense ?? false, can_view_analytics: rp.can_view_analytics ?? false, can_manage_users: rp.can_manage_users ?? false });
  };

  const handleSavePermissions = async () => {
    if (!editRole) return;
    setSavingPerms(true);
    try {
      const rpId = getRolePerms(editRole)?.id;
      if (rpId) { await supabase.from('role_permissions').update(permissions).eq('id', rpId); }
      else { await supabase.from('role_permissions').insert({ role_id: editRole.id, ...permissions }); }
      toast.success('Permissions updated'); setEditRole(null);
      queryClient.invalidateQueries({ queryKey: ['all-roles'] });
    } catch { toast.error('Failed to save permissions'); } finally { setSavingPerms(false); }
  };

  const handleDeleteRole = async (roleId: string) => {
    setDeleting(roleId);
    try {
      const { error } = await supabase.from('roles').delete().eq('id', roleId);
      if (error) throw error;
      toast.success('Role deleted'); queryClient.invalidateQueries({ queryKey: ['all-roles'] });
    } catch { toast.error('Failed to delete role'); } finally { setDeleting(null); }
  };

  const permissionLabels = [
    { key: 'can_raise_expense', label: 'Can Raise Expense', desc: 'Submit new expense requests' },
    { key: 'can_approve_expense', label: 'Can Approve Expense', desc: 'Approve/reject expense requests' },
    { key: 'can_view_analytics', label: 'Can View Analytics', desc: 'Access reports and analytics' },
    { key: 'can_manage_users', label: 'Can Manage Users', desc: 'Manage users, departments, roles' },
  ] as const;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Role Management"
          subtitle="Create and configure roles & permissions"
          icon={<ShieldCheck className="h-5 w-5 text-primary" />}
          actions={<Button onClick={() => setShowCreate(true)} className="rounded-xl"><Plus className="h-4 w-4 mr-2" /> New Role</Button>}
        />

        <GlassCard>
          <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-5 w-5 text-muted-foreground" /><h3 className="text-lg font-semibold font-display">All Roles</h3></div>
          <p className="text-sm text-muted-foreground mb-4">System roles cannot be deleted. Click permissions to configure access.</p>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Role Name</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Permissions</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {roles?.map((r: any) => {
                    const rp = getRolePerms(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell><Badge variant={r.is_system_role ? 'default' : 'secondary'}>{r.is_system_role ? 'System' : 'Custom'}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{r.description || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {rp?.can_raise_expense && <Badge variant="outline" className="text-xs">Raise</Badge>}
                            {rp?.can_approve_expense && <Badge variant="outline" className="text-xs">Approve</Badge>}
                            {rp?.can_view_analytics && <Badge variant="outline" className="text-xs">Analytics</Badge>}
                            {rp?.can_manage_users && <Badge variant="outline" className="text-xs">Manage</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openPermissions(r)}><Settings2 className="h-4 w-4 mr-1" /> Permissions</Button>
                          {!r.is_system_role && (<Button size="sm" variant="destructive" className="rounded-lg" onClick={() => handleDeleteRole(r.id)} disabled={deleting === r.id}>{deleting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Role</DialogTitle><DialogDescription>Define a new custom role for the organization.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Role Name</Label><Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g. PRINCIPAL, DEAN" /></div>
              <div className="space-y-2"><Label>Description (optional)</Label><Textarea value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} placeholder="Brief description of this role" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={handleCreateRole} disabled={creating}>{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Role</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editRole} onOpenChange={() => setEditRole(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Permissions — {editRole?.name}</DialogTitle><DialogDescription>Configure what this role can do.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              {permissionLabels.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                  <Switch checked={(permissions as any)[key]} onCheckedChange={(v) => setPermissions((p) => ({ ...p, [key]: v }))} />
                </div>
              ))}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setEditRole(null)}>Cancel</Button><Button onClick={handleSavePermissions} disabled={savingPerms}>{savingPerms && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Permissions</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
