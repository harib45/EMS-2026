import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { STATUS_COLORS, ROLE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, Receipt, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function SubordinateDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['subordinate-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id!)
        .single();
      if (error) throw error;

      // Get role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id!)
        .single();

      // Get reporting manager name
      let managerName = null;
      if (data.reporting_manager_id) {
        const { data: manager } = await supabase
          .from('profiles')
          .select('display_name, name')
          .eq('id', data.reporting_manager_id)
          .single();
        managerName = manager?.display_name || manager?.name;
      }

      return {
        ...data,
        roleName: roleData?.role || 'STUDENT',
        managerName,
      };
    },
    enabled: !!id && !!user,
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['subordinate-expenses', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', id!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const stats = {
    total: expenses?.length || 0,
    approved: expenses?.filter(e => e.status === 'APPROVED').length || 0,
    rejected: expenses?.filter(e => e.status === 'REJECTED').length || 0,
    pending: expenses?.filter(e => e.status === 'SUBMITTED').length || 0,
    totalAmount: expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0,
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-foreground">User not found</h2>
          <Button asChild variant="link" className="mt-2">
            <Link to="/subordinates">← Back</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/subordinates"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Subordinate Details</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={profile.profile_image_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                    {(profile.display_name || profile.name)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{profile.display_name || profile.name}</h2>
                {profile.display_name && profile.name !== profile.display_name && (
                  <p className="text-sm text-muted-foreground">{profile.name}</p>
                )}
                <Badge className={cn('mt-2', ROLE_COLORS[profile.roleName as keyof typeof ROLE_COLORS])}>
                  {profile.roleName}
                </Badge>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{profile.email}</span>
                </div>
                {profile.department && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{profile.department}</span>
                  </div>
                )}
                {profile.register_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Register No.</span>
                    <span className="font-medium">{profile.register_number}</span>
                  </div>
                )}
                {profile.is_mobile_visible && profile.mobile_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobile</span>
                    <span className="font-medium">{profile.mobile_number}</span>
                  </div>
                )}
                {profile.managerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reports to</span>
                    <span className="font-medium">{profile.managerName}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats + Expenses */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <Receipt className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <Clock className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </CardContent>
              </Card>
            </div>

            {/* Expenses Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !expenses?.length ? (
                  <p className="text-center py-8 text-muted-foreground">No expenses found</p>
                ) : (
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
                      {expenses.map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.title}</TableCell>
                          <TableCell>{e.category}</TableCell>
                          <TableCell className="text-right">
                            ₹{Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-xs', STATUS_COLORS[e.status as keyof typeof STATUS_COLORS])}>
                              {e.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(e.created_at), 'dd MMM yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
