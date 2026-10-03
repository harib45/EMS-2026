import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RecentExpenses } from '@/components/dashboard/RecentExpenses';
import { useAuth } from '@/hooks/useAuth';
import { useFadeIn, useStaggerFadeIn } from '@/hooks/useGsapAnimations';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { LayoutDashboard, PlusCircle, Receipt, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const { profile, role } = useAuth();
  const headerRef = useFadeIn(0.05);
  const statsRef = useStaggerFadeIn('.gsap-fade-item', 0.15);
  const bottomRef = useFadeIn(0.3);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div ref={headerRef}>
          <PageHeader
            title={`Welcome back, ${profile?.name?.split(' ')[0] || 'User'}!`}
            subtitle="Here's an overview of your expense activity"
            icon={<LayoutDashboard className="h-5 w-5 text-primary" />}
          />
        </div>

        <div ref={statsRef}>
          <StatsCards />
        </div>

        <div className="grid gap-6 lg:grid-cols-2" ref={bottomRef}>
          <RecentExpenses />
          
          <div className="space-y-4">
            <GlassCard>
              <h3 className="text-lg font-semibold font-display mb-4">Quick Actions</h3>
              <div className="grid gap-3">
                <a
                  href="/expenses/new"
                  className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-all duration-200 group"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <PlusCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">New Expense</p>
                    <p className="text-sm text-muted-foreground">Submit a new expense request</p>
                  </div>
                </a>
                
                <a
                  href="/expenses"
                  className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-all duration-200 group"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">View Expenses</p>
                    <p className="text-sm text-muted-foreground">See all your expense requests</p>
                  </div>
                </a>

                {role && role !== 'STUDENT' && (
                  <a
                    href="/approvals"
                    className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-all duration-200 group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Pending Approvals</p>
                      <p className="text-sm text-muted-foreground">Review expense requests</p>
                    </div>
                  </a>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
