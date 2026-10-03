import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useAllExpenses, useExpenseStats } from '@/hooks/useExpenses';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, IndianRupee, TrendingUp, Clock, CheckCircle2, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format } from 'date-fns';

const CHART_COLORS = ['hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(221, 83%, 53%)'];

export default function Payroll() {
  const { role } = useAuth();
  const { data: expenses, isLoading: expLoading } = useAllExpenses();
  const { data: stats, isLoading: statsLoading } = useExpenseStats();

  if (role && !['ADMIN', 'PAYROLL'].includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = expLoading || statsLoading;

  const monthlyMap = new Map<string, { approved: number; total: number; count: number }>();
  expenses?.forEach(e => {
    const month = format(new Date(e.created_at), 'MMM yyyy');
    const prev = monthlyMap.get(month) || { approved: 0, total: 0, count: 0 };
    prev.total += Number(e.amount);
    prev.count += 1;
    if (e.status === 'APPROVED' || e.status === 'LOGGED') prev.approved += Number(e.amount);
    monthlyMap.set(month, prev);
  });
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, v]) => ({
    month, total: Math.round(v.total), approved: Math.round(v.approved), count: v.count,
  }));

  const statusPie = [
    { name: 'Approved', value: stats?.approved || 0, color: CHART_COLORS[0] },
    { name: 'Pending', value: stats?.pending || 0, color: CHART_COLORS[1] },
    { name: 'Rejected', value: stats?.rejected || 0, color: CHART_COLORS[2] },
  ].filter(s => s.value > 0);

  const spenderMap = new Map<string, { name: string; total: number; count: number }>();
  expenses?.forEach(e => {
    const profile = (e as any).profiles;
    const name = profile?.name || 'Unknown';
    const prev = spenderMap.get(e.created_by) || { name, total: 0, count: 0 };
    prev.total += Number(e.amount);
    prev.count += 1;
    spenderMap.set(e.created_by, prev);
  });
  const topSpenders = Array.from(spenderMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Payroll & Payments"
          subtitle="Financial overview and payment statistics"
          icon={<Wallet className="h-5 w-5 text-primary" />}
        />

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard title="Total Amount" value={`₹${stats?.totalAmount?.toLocaleString('en-IN') || 0}`} icon={IndianRupee} iconColor="text-primary" iconBg="bg-primary/10" />
              <StatCard title="Approved" value={`₹${stats?.approvedAmount?.toLocaleString('en-IN') || 0}`} icon={CheckCircle2} iconColor="text-status-green" iconBg="bg-status-green/10" />
              <StatCard title="Pending" value={`₹${stats?.pendingAmount?.toLocaleString('en-IN') || 0}`} icon={Clock} iconColor="text-status-yellow" iconBg="bg-status-yellow/10" />
              <StatCard title="Total Claims" value={stats?.total || 0} icon={TrendingUp} iconColor="text-status-blue" iconBg="bg-status-blue/10" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <GlassCard>
                <h3 className="text-lg font-semibold font-display mb-1">Monthly Expense Trend</h3>
                <p className="text-sm text-muted-foreground mb-4">Total vs approved amounts by month</p>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                      <Legend />
                      <Bar dataKey="total" name="Total" fill="hsl(var(--status-blue))" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="approved" name="Approved" fill="hsl(var(--status-green))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">No data</div>
                )}
              </GlassCard>

              <GlassCard>
                <h3 className="text-lg font-semibold font-display mb-1">Status Distribution</h3>
                <p className="text-sm text-muted-foreground mb-4">Claims by approval status</p>
                {statusPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">No data</div>
                )}
              </GlassCard>

              <GlassCard className="lg:col-span-2">
                <h3 className="text-lg font-semibold font-display mb-1">Top Spenders</h3>
                <p className="text-sm text-muted-foreground mb-4">Users with highest total expense claims</p>
                {topSpenders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Claims</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topSpenders.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.count}</TableCell>
                          <TableCell className="text-right font-semibold">₹{s.total.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">No expense data</div>
                )}
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
