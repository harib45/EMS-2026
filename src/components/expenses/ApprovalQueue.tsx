import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePendingApprovals, useApproveExpense } from '@/hooks/useExpenses';
import { STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, ClipboardList, Eye } from 'lucide-react';

export function ApprovalQueue() {
  const { data: expenses, isLoading, error } = usePendingApprovals();
  const approveExpense = useApproveExpense();
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [action, setAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [comments, setComments] = useState('');

  const handleAction = async () => {
    if (!selectedExpense || !action) return;

    try {
      await approveExpense.mutateAsync({
        expenseId: selectedExpense.id,
        action,
        comments: comments || undefined,
      });

      toast.success(`Expense ${action.toLowerCase()} successfully`);
      setSelectedExpense(null);
      setAction(null);
      setComments('');
    } catch (error) {
      toast.error('Failed to process approval');
      console.error(error);
    }
  };

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
          <p className="text-destructive">Failed to load pending approvals</p>
        </CardContent>
      </Card>
    );
  }

  if (!expenses?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No pending approvals</h3>
          <p className="text-muted-foreground">
            All caught up! There are no expenses waiting for your approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Review and approve/reject expense requests from your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted By</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense: any) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{expense.profiles?.name}</p>
                      <p className="text-sm text-muted-foreground">{expense.profiles?.department}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{expense.title}</TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell className="text-right">
                    ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(expense.created_at), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                      >
                        <Link to={`/expenses/${expense.id}`} state={{ from: '/approvals' }}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setAction('APPROVED');
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setAction('REJECTED');
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedExpense} onOpenChange={() => {
        setSelectedExpense(null);
        setAction(null);
        setComments('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'APPROVED' ? 'Approve' : 'Reject'} Expense
            </DialogTitle>
            <DialogDescription>
              {action === 'APPROVED' 
                ? 'Confirm approval of this expense request'
                : 'Please provide a reason for rejecting this expense'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedExpense && (
            <div className="py-4 space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="font-medium">{selectedExpense.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">
                    ₹{Number(selectedExpense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted by:</span>
                  <span className="font-medium">{selectedExpense.profiles?.name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Comments {action === 'REJECTED' && '*'}
                </label>
                <Textarea
                  placeholder={action === 'REJECTED' ? 'Reason for rejection...' : 'Optional comments...'}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedExpense(null);
              setAction(null);
              setComments('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={approveExpense.isPending || (action === 'REJECTED' && !comments)}
              variant={action === 'APPROVED' ? 'default' : 'destructive'}
            >
              {approveExpense.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === 'APPROVED' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
