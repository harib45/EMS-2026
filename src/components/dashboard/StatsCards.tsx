import { useExpenseStats } from '@/hooks/useExpenses';
import { usePendingApprovals } from '@/hooks/useExpenses';
import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CheckCircle2, Clock, XCircle, IndianRupee } from 'lucide-react';

export function StatsCards() {
  const { role } = useAuth();
  const { data: stats, isLoading } = useExpenseStats();
  const { data: pendingApprovals } = usePendingApprovals();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-5 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Expenses',
      value: stats?.total || 0,
      subtext: `₹${stats?.totalAmount?.toLocaleString('en-IN') || 0} total`,
      icon: Receipt,
      iconColor: 'text-status-blue',
      iconBg: 'bg-status-blue/10',
    },
    {
      title: 'Approved',
      value: stats?.approved || 0,
      subtext: `₹${stats?.approvedAmount?.toLocaleString('en-IN') || 0}`,
      icon: CheckCircle2,
      iconColor: 'text-status-green',
      iconBg: 'bg-status-green/10',
    },
    {
      title: 'Pending',
      value: stats?.pending || 0,
      subtext: `₹${stats?.pendingAmount?.toLocaleString('en-IN') || 0}`,
      icon: Clock,
      iconColor: 'text-status-yellow',
      iconBg: 'bg-status-yellow/10',
    },
    {
      title: 'Rejected',
      value: stats?.rejected || 0,
      subtext: `₹${stats?.rejectedAmount?.toLocaleString('en-IN') || 0}`,
      icon: XCircle,
      iconColor: 'text-status-red',
      iconBg: 'bg-status-red/10',
    },
  ];

  if (role && role !== 'STUDENT') {
    cards.push({
      title: 'Awaiting Your Approval',
      value: pendingApprovals?.length || 0,
      subtext: 'expenses need review',
      icon: IndianRupee,
      iconColor: 'text-status-purple',
      iconBg: 'bg-status-purple/10',
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {cards.map((card) => (
        <StatCard key={card.title} className="gsap-fade-item" {...card} />
      ))}
    </div>
  );
}
