import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ApprovalQueue } from '@/components/expenses/ApprovalQueue';
import { PageHeader } from '@/components/ui/page-header';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2, CheckSquare } from 'lucide-react';

export default function Approvals() {
  const { user, loading: authLoading } = useAuth();
  const { permissions, isLoading } = usePermissions();

  if (authLoading || isLoading || (!user && !authLoading)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!permissions?.can_approve_expense) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Pending Approvals"
          subtitle="Review and approve expense requests from your team"
          icon={<CheckSquare className="h-5 w-5 text-primary" />}
        />
        <ApprovalQueue />
      </div>
    </DashboardLayout>
  );
}
