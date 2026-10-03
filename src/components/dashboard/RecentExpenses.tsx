import { useMyExpenses } from '@/hooks/useExpenses';
import { STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt } from 'lucide-react';

export function RecentExpenses() {
  const { data: expenses, isLoading } = useMyExpenses();
  const recentExpenses = expenses?.slice(0, 5);

  if (isLoading) {
    return (
      <GlassCard>
        <h3 className="text-lg font-semibold font-display mb-1">Recent Expenses</h3>
        <p className="text-sm text-muted-foreground mb-4">Your latest expense submissions</p>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  if (!recentExpenses?.length) {
    return (
      <GlassCard>
        <h3 className="text-lg font-semibold font-display mb-1">Recent Expenses</h3>
        <p className="text-sm text-muted-foreground mb-4">Your latest expense submissions</p>
        <div className="py-8 text-center">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No expenses yet</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h3 className="text-lg font-semibold font-display mb-1">Recent Expenses</h3>
      <p className="text-sm text-muted-foreground mb-4">Your latest expense submissions</p>
      <div className="space-y-3">
        {recentExpenses.map((expense) => (
          <div key={expense.id} className="flex items-center gap-4 p-2 rounded-xl hover:bg-accent/50 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{expense.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(expense.created_at), 'dd MMM yyyy')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">
                ₹{Number(expense.amount).toLocaleString('en-IN')}
              </p>
              <Badge className={cn('text-xs', STATUS_COLORS[expense.status])}>
                {expense.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
