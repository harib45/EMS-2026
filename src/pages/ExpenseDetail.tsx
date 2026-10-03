import { useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useApproveExpense } from '@/hooks/useExpenses';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ExpenseChatPanel } from '@/components/expenses/ExpenseChatPanel';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, Receipt, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const approveExpense = useApproveExpense();
  const [action, setAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [comments, setComments] = useState('');
  const backPath = (location.state as any)?.from || '/expenses';

  const { data: expense, isLoading } = useQuery({
    queryKey: ['expense-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select(`*, profiles:created_by (name, display_name, email, department)`).eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: approvals } = useQuery({
    queryKey: ['expense-approvals', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('approvals').select('*').eq('expense_id', id!).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const canActOnExpense = permissions?.can_approve_expense && expense?.status === 'SUBMITTED' && (expense?.assigned_approver_id === user?.id);

  const handleAction = async () => {
    if (!expense || !action) return;
    try {
      await approveExpense.mutateAsync({ expenseId: expense.id, action, comments: comments || undefined });
      toast.success(`Expense ${action.toLowerCase()} successfully`);
      setAction(null); setComments('');
    } catch (error) {
      toast.error('Failed to process approval');
    }
  };

  if (isLoading) {
    return (<DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  if (!expense) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold font-display text-foreground">Expense not found</h2>
          <Button asChild variant="link" className="mt-2"><Link to={backPath}>← Back</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  const profile = expense.profiles as any;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">{expense.title}</h1>
            <p className="text-muted-foreground text-sm">Submitted by {profile?.display_name || profile?.name} • {format(new Date(expense.created_at), 'dd MMM yyyy')}</p>
          </div>
          <Badge className={cn('font-medium text-sm', STATUS_COLORS[expense.status as keyof typeof STATUS_COLORS])}>{expense.status}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard>
              <h3 className="text-base font-semibold font-display mb-4">Expense Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Amount</p><p className="text-lg font-semibold">₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                <div><p className="text-sm text-muted-foreground">Category</p><p className="font-medium">{expense.category}</p></div>
                {expense.description && (<div className="col-span-2"><p className="text-sm text-muted-foreground">Description</p><p className="text-sm">{expense.description}</p></div>)}
                {expense.bill_url && (<div className="col-span-2"><p className="text-sm text-muted-foreground mb-1">Bill / Receipt</p><a href={expense.bill_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">View attachment <ExternalLink className="h-3 w-3" /></a></div>)}
              </div>
            </GlassCard>

            {canActOnExpense && (
              <GlassCard>
                <h3 className="text-base font-semibold font-display mb-4">Approval Actions</h3>
                <div className="flex gap-3">
                  <Button className="rounded-xl text-status-green hover:bg-status-green/10 border-status-green/30" variant="outline" onClick={() => setAction('APPROVED')}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                  </Button>
                  <Button className="rounded-xl text-status-red hover:bg-status-red/10 border-status-red/30" variant="outline" onClick={() => setAction('REJECTED')}>
                    <XCircle className="h-4 w-4 mr-1" />Reject
                  </Button>
                </div>
              </GlassCard>
            )}

            {approvals && approvals.length > 0 && (
              <GlassCard>
                <h3 className="text-base font-semibold font-display mb-4">Approval History</h3>
                <div className="space-y-3">
                  {approvals.map((a) => (
                    <div key={a.id} className="flex items-center justify-between border-b border-border/50 last:border-0 pb-3 last:pb-0">
                      <div><p className="text-sm font-medium">{a.approver_role}</p>{a.comments && <p className="text-xs text-muted-foreground">{a.comments}</p>}</div>
                      <div className="text-right">
                        <Badge variant={a.action === 'APPROVED' ? 'default' : 'destructive'} className="text-xs">{a.action}</Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(a.created_at), 'dd MMM HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
          <div className="lg:col-span-1"><ExpenseChatPanel expenseId={expense.id} /></div>
        </div>
      </div>

      <Dialog open={!!action} onOpenChange={() => { setAction(null); setComments(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === 'APPROVED' ? 'Approve' : 'Reject'} Expense</DialogTitle>
            <DialogDescription>{action === 'APPROVED' ? 'Confirm approval of this expense request' : 'Please provide a reason for rejecting this expense'}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-accent/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Title:</span><span className="font-medium">{expense.title}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-medium">₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comments {action === 'REJECTED' && '*'}</label>
              <Textarea placeholder={action === 'REJECTED' ? 'Reason for rejection...' : 'Optional comments...'} value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAction(null); setComments(''); }}>Cancel</Button>
            <Button onClick={handleAction} disabled={approveExpense.isPending || (action === 'REJECTED' && !comments)} variant={action === 'APPROVED' ? 'default' : 'destructive'}>
              {approveExpense.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{action === 'APPROVED' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
