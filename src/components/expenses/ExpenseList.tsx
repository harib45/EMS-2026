import { useMyExpenses } from '@/hooks/useExpenses';
import { STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Receipt } from 'lucide-react';

export function ExpenseList() {
  const { data: expenses, isLoading, error } = useMyExpenses();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load expenses</p>
        </CardContent>
      </Card>
    );
  }

  if (!expenses?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No expenses yet</h3>
          <p className="text-muted-foreground">
            Create your first expense request to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Expenses</CardTitle>
        <CardDescription>
          View and track all your expense requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/expenses/${expense.id}`, { state: { from: '/expenses' } })}>
                <TableCell className="font-medium">{expense.title}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell className="text-right">
                  ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge className={cn('font-medium', STATUS_COLORS[expense.status])}>
                    {expense.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(expense.created_at), 'dd MMM yyyy')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
