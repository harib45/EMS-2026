import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { PageHeader } from '@/components/ui/page-header';
import { PlusCircle } from 'lucide-react';

export default function NewExpense() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Create Expense"
          subtitle="Submit a new expense request for reimbursement"
          icon={<PlusCircle className="h-5 w-5 text-primary" />}
        />
        <ExpenseForm />
      </div>
    </DashboardLayout>
  );
}
