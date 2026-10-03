import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Building2, Plus, Trash2, Edit2 } from 'lucide-react';

interface Department { id: string; name: string; hod_user_id: string | null; created_at: string; }
interface UserProfile { user_id: string; name: string; email: string; }

export default function Departments() {
  const { role } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHod, setNewHod] = useState('');
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [editHod, setEditHod] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [{ data: depts }, { data: profiles }] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('profiles').select('user_id, name, email'),
      ]);
      setDepartments(depts || []);
      setUsers(profiles || []);
    } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  useEffect(() => { if (role === 'ADMIN') fetchData(); }, [role]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('departments').insert({ name: newName.trim(), hod_user_id: newHod || null });
      if (error) throw error;
      toast.success('Department created'); setShowAdd(false); setNewName(''); setNewHod(''); fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to create department'); } finally { setSaving(false); }
  };

  const handleUpdateHod = async () => {
    if (!editDept) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('departments').update({ hod_user_id: editHod || null }).eq('id', editDept.id);
      if (error) throw error;
      toast.success('HOD updated'); setEditDept(null); fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to update'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Deleted'); fetchData(); }
  };

  const getUserName = (userId: string | null) => users.find(u => u.user_id === userId)?.name || '—';

  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Departments"
          subtitle="Manage departments and assign HODs"
          icon={<Building2 className="h-5 w-5 text-primary" />}
          actions={
            <Button onClick={() => setShowAdd(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Add Department
            </Button>
          }
        />

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold font-display">All Departments</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Each department can have one assigned HOD</p>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : departments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No departments created yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>HOD</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map(dept => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>{dept.hod_user_id ? <Badge variant="secondary">{getUserName(dept.hod_user_id)}</Badge> : <span className="text-muted-foreground text-sm">Not assigned</span>}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { setEditDept(dept); setEditHod(dept.hod_user_id || ''); }}>
                        <Edit2 className="h-4 w-4 mr-1" /> Edit HOD
                      </Button>
                      <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => handleDelete(dept.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCard>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Department</DialogTitle><DialogDescription>Create a new department and optionally assign an HOD</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><label className="text-sm font-medium">Department Name</label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Computer Science" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">HOD (optional)</label><Select value={newHod} onValueChange={setNewHod}><SelectTrigger><SelectValue placeholder="Select HOD" /></SelectTrigger><SelectContent>{users.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.name} ({u.email})</SelectItem>)}</SelectContent></Select></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={handleAdd} disabled={saving || !newName.trim()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editDept} onOpenChange={() => setEditDept(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Update HOD for {editDept?.name}</DialogTitle><DialogDescription>Assign a user as Head of Department</DialogDescription></DialogHeader>
            <div className="py-4 space-y-2"><label className="text-sm font-medium">HOD</label><Select value={editHod} onValueChange={setEditHod}><SelectTrigger><SelectValue placeholder="Select HOD" /></SelectTrigger><SelectContent><SelectItem value="">None</SelectItem>{users.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.name} ({u.email})</SelectItem>)}</SelectContent></Select></div>
            <DialogFooter><Button variant="outline" onClick={() => setEditDept(null)}>Cancel</Button><Button onClick={handleUpdateHod} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
