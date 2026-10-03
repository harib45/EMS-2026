import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PlusCircle, Receipt } from 'lucide-react';

export default function Expenses() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="My Expenses"
          subtitle="View and manage all your expense requests"
          icon={<Receipt className="h-5 w-5 text-primary" />}
          actions={
            <Button asChild className="rounded-xl">
              <Link to="/expenses/new">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Expense
              </Link>
            </Button>
          }
        />
        <ExpenseList />
      </div>
    </DashboardLayout>
  );
}
