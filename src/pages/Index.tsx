import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFadeIn, useStaggerFadeIn } from '@/hooks/useGsapAnimations';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowRight, Receipt, CheckCircle, BarChart3, Loader2, FileText, Shield, TrendingUp } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const heroRef = useFadeIn(0.1);
  const featuresRef = useStaggerFadeIn('.gsap-fade-item', 0.3);
  const rolesRef = useFadeIn(0.2);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">EMS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero with Spline */}
      <section className="py-12 md:py-20 px-4">
        <div className="container mx-auto grid md:grid-cols-2 gap-8 items-center max-w-6xl">
          <div ref={heroRef}>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              College Expense Reimbursement Made Simple
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Streamline your expense submissions and approvals with our role-based
              workflow system. From student to admin, everyone has the right tools.
            </p>
            <div className="flex gap-4">
              <Link to="/register">
                <Button size="lg">
                  Start Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:block h-[420px] rounded-2xl overflow-hidden border bg-gradient-to-br from-primary/10 via-muted/30 to-accent/10 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
              <div className="flex gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">Track · Approve · Reimburse</p>
                <p className="text-sm text-muted-foreground mt-1">All in one place</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto" ref={featuresRef}>
          <h2 className="text-3xl font-bold text-center mb-12 gsap-fade-item">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-xl p-6 border gsap-fade-item">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Expense Tracking</h3>
              <p className="text-muted-foreground">
                Submit expenses with categories, amounts, and descriptions.
                Track status in real-time.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border gsap-fade-item">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Role-Based Approvals</h3>
              <p className="text-muted-foreground">
                Hierarchical approval workflow: Student → Mentor → HOD → Payroll → Admin.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border gsap-fade-item">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics & Reports</h3>
              <p className="text-muted-foreground">
                Comprehensive dashboards with expense trends, category breakdowns, and more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-16 px-4" ref={rolesRef}>
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Approval Hierarchy</h2>
          <div className="flex flex-wrap justify-center gap-4 items-center">
            {['STUDENT', 'MENTOR', 'HOD', 'PAYROLL', 'ADMIN'].map((role, index, arr) => (
              <div key={role} className="flex items-center gap-4">
                <div className="bg-card border rounded-lg px-4 py-2 font-medium">
                  {role}
                </div>
                {index < arr.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground mt-6">
            Each expense is approved by the immediate higher role in the hierarchy
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2025 EMS — Expense Management System</p>
        </div>
      </footer>
    </div>
  );
}
