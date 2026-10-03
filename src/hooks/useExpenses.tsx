import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ExpenseStatus, ApprovalAction, UserRole } from '@/lib/constants';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  description: string | null;
  bill_url: string | null;
  status: ExpenseStatus;
  created_at: string;
  created_by: string;
  assigned_approver_role: UserRole | null;
}

interface CreateExpenseInput {
  title: string;
  amount: number;
  category: string;
  description?: string;
  bill_url?: string;
}

export function useMyExpenses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-expenses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });
}

export function usePendingApprovals() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['pending-approvals', user?.id, role],
    queryFn: async () => {
      // Try hierarchy-based first (assigned_approver_id)
      const { data: hierarchyData, error: hierarchyError } = await supabase
        .from('expenses')
        .select(`
          *,
          profiles:created_by (name, email, department)
        `)
        .eq('assigned_approver_id', user!.id)
        .eq('status', 'SUBMITTED')
        .order('created_at', { ascending: false });

      if (hierarchyError) throw hierarchyError;

      // Also fetch role-based for backward compat (old expenses without assigned_approver_id)
      const { data: roleData, error: roleError } = await supabase
        .from('expenses')
        .select(`
          *,
          profiles:created_by (name, email, department)
        `)
        .eq('assigned_approver_role', role!)
        .is('assigned_approver_id', null)
        .eq('status', 'SUBMITTED')
        .order('created_at', { ascending: false });

      if (roleError) throw roleError;

      // Merge and deduplicate
      const allExpenses = [...(hierarchyData || []), ...(roleData || [])];
      const seen = new Set<string>();
      return allExpenses.filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
    },
    enabled: !!user && !!role && role !== 'STUDENT',
  });
}

export function useAllExpenses() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['all-expenses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          profiles:created_by (name, email, department)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && (role === 'ADMIN' || role === 'PAYROLL'),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...input,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-expenses'] });
    },
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  return useMutation({
    mutationFn: async ({ expenseId, action, comments }: { 
      expenseId: string; 
      action: ApprovalAction; 
      comments?: string 
    }) => {
      // Create approval record
      const { error: approvalError } = await supabase
        .from('approvals')
        .insert({
          expense_id: expenseId,
          approver_id: user!.id,
          approver_role: role!,
          action,
          comments,
        });

      if (approvalError) throw approvalError;

      if (action === 'REJECTED') {
        await supabase.rpc('escalate_expense', {
          p_expense_id: expenseId,
          p_new_status: 'REJECTED',
          p_new_approver_id: null,
          p_new_approver_role: null,
        });
      } else {
        const { data: isTerminal } = await supabase
          .rpc('is_terminal_approver', { p_user_id: user!.id });

        if (isTerminal) {
          await supabase.rpc('escalate_expense', {
            p_expense_id: expenseId,
            p_new_status: 'APPROVED',
            p_new_approver_id: null,
            p_new_approver_role: null,
          });
        } else {
          const { data: nextManagerId } = await supabase
            .rpc('get_reporting_manager_user_id', { p_user_id: user!.id });

          if (nextManagerId) {
            const { data: nextRole } = await supabase
              .rpc('get_user_role', { p_user_id: nextManagerId });

            await supabase.rpc('escalate_expense', {
              p_expense_id: expenseId,
              p_new_status: 'SUBMITTED',
              p_new_approver_id: nextManagerId,
              p_new_approver_role: nextRole,
            });
          } else {
            await supabase.rpc('escalate_expense', {
              p_expense_id: expenseId,
              p_new_status: 'APPROVED',
              p_new_approver_id: null,
              p_new_approver_role: null,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['my-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['all-expenses'] });
    },
  });
}

export function useExpenseStats() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['expense-stats', user?.id, role],
    queryFn: async () => {
      let query = supabase.from('expenses').select('*');
      
      // ADMIN and PAYROLL see all expenses; others see only their own
      if (role !== 'ADMIN' && role !== 'PAYROLL') {
        query = query.eq('created_by', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const expenses = data as Expense[];
      const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const approved = expenses.filter(e => e.status === 'APPROVED');
      const pending = expenses.filter(e => e.status === 'SUBMITTED');
      const rejected = expenses.filter(e => e.status === 'REJECTED');

      return {
        total: expenses.length,
        totalAmount,
        approved: approved.length,
        approvedAmount: approved.reduce((sum, e) => sum + Number(e.amount), 0),
        pending: pending.length,
        pendingAmount: pending.reduce((sum, e) => sum + Number(e.amount), 0),
        rejected: rejected.length,
        rejectedAmount: rejected.reduce((sum, e) => sum + Number(e.amount), 0),
      };
    },
    enabled: !!user,
  });
}
