import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAllExpenses, useExpenseStats } from '@/hooks/useExpenses';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, BarChart3 } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

const STATUS_CHART_COLORS = {
  LOGGED: 'hsl(221, 83%, 53%)',
  SUBMITTED: 'hsl(38, 92%, 50%)',
  APPROVED: 'hsl(142, 71%, 45%)',
  REJECTED: 'hsl(0, 72%, 51%)',
};

export default function Reports() {
  const { role } = useAuth();
  const { data: expenses, isLoading: expensesLoading } = useAllExpenses();
  const { data: stats, isLoading: statsLoading } = useExpenseStats();

  if (role && !['ADMIN', 'PAYROLL', 'HOD'].includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = expensesLoading || statsLoading;

  const categoryData = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    amount: expenses?.filter(e => e.category === cat)
      .reduce((sum, e) => sum + Number(e.amount), 0) || 0,
    count: expenses?.filter(e => e.category === cat).length || 0,
  })).filter(c => c.count > 0);

  const statusData = [
    { name: 'Approved', value: stats?.approved || 0, color: STATUS_CHART_COLORS.APPROVED },
    { name: 'Pending', value: stats?.pending || 0, color: STATUS_CHART_COLORS.SUBMITTED },
    { name: 'Rejected', value: stats?.rejected || 0, color: STATUS_CHART_COLORS.REJECTED },
  ].filter(s => s.value > 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Comprehensive view of expense data and trends"
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard>
              <h3 className="text-lg font-semibold font-display mb-1">Total Overview</h3>
              <p className="text-sm text-muted-foreground mb-4">Summary of all expense activity</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-accent/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold font-display">{stats?.total || 0}</p>
                </div>
                <div className="p-4 bg-accent/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold font-display">₹{stats?.totalAmount?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div className="p-4 bg-accent/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">Approved Amount</p>
                  <p className="text-2xl font-bold font-display text-status-green">₹{stats?.approvedAmount?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div className="p-4 bg-accent/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">Pending Amount</p>
                  <p className="text-2xl font-bold font-display text-status-yellow">₹{stats?.pendingAmount?.toLocaleString('en-IN') || 0}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-semibold font-display mb-1">Status Distribution</h3>
              <p className="text-sm text-muted-foreground mb-4">Breakdown by approval status</p>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </GlassCard>

            <GlassCard className="lg:col-span-2">
              <h3 className="text-lg font-semibold font-display mb-1">Expenses by Category</h3>
              <p className="text-sm text-muted-foreground mb-4">Amount spent in each category</p>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">No expenses data available</div>
              )}
            </GlassCard>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
