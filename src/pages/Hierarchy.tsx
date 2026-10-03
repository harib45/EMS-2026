import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UserRole, ROLE_COLORS, ROLE_HIERARCHY } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, GitBranch, Edit2 } from 'lucide-react';

interface ProfileWithRole {
  id: string; user_id: string; name: string; email: string;
  department: string | null; reporting_manager_id: string | null; role?: UserRole;
}

export default function Hierarchy() {
  const { role } = useAuth();
  const [profiles, setProfiles] = useState<ProfileWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<ProfileWithRole | null>(null);
  const [selectedManager, setSelectedManager] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('*').order('name'),
        supabase.from('user_roles').select('*'),
      ]);
      setProfiles(profs?.map(p => ({ ...p, role: roles?.find(r => r.user_id === p.user_id)?.role as UserRole | undefined })) || []);
    } catch { toast.error('Failed to load users'); } finally { setLoading(false); }
  };

  useEffect(() => { if (role === 'ADMIN') fetchData(); }, [role]);

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ reporting_manager_id: selectedManager || null }).eq('id', editUser.id);
      if (error) throw error;
      toast.success('Reporting manager updated'); setEditUser(null); fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to update'); } finally { setSaving(false); }
  };

  const getManagerName = (managerId: string | null) => {
    if (!managerId) return '—';
    const mgr = profiles.find(p => p.id === managerId);
    return mgr ? `${mgr.name} (${mgr.role || 'N/A'})` : '—';
  };

  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Reporting Hierarchy" subtitle="Configure who reports to whom for expense approvals" icon={<GitBranch className="h-5 w-5 text-primary" />} />

        <GlassCard>
          <div className="flex items-center gap-2 mb-2"><GitBranch className="h-5 w-5 text-muted-foreground" /><h3 className="text-lg font-semibold font-display">User Hierarchy</h3></div>
          <p className="text-sm text-muted-foreground mb-4">Hierarchy: STUDENT → MENTOR → HOD → PAYROLL → ADMIN</p>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Reports To</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {profiles.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge className={cn('font-medium', p.role ? ROLE_COLORS[p.role] : 'bg-muted')}>{p.role || 'No Role'}</Badge></TableCell>
                      <TableCell>{p.department || '—'}</TableCell>
                      <TableCell className="text-sm">{getManagerName(p.reporting_manager_id)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { setEditUser(p); setSelectedManager(p.reporting_manager_id || ''); }}>
                          <Edit2 className="h-4 w-4 mr-1" /> Set Manager
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>

        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Set Reporting Manager</DialogTitle><DialogDescription>Assign a reporting manager for {editUser?.name} ({editUser?.role || 'No Role'})</DialogDescription></DialogHeader>
            <div className="py-4 space-y-2">
              <label className="text-sm font-medium">Reporting Manager</label>
              <Select value={selectedManager || "none"} onValueChange={(val) => setSelectedManager(val === "none" ? "" : val)}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {profiles.filter(p => p.id !== editUser?.id).map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.role || 'N/A'} ({p.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
