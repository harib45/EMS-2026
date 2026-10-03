import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

export default function Register() {
  const { user, loading, signUp } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', department: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (<div className="min-h-screen flex items-center justify-center gradient-bg"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>);
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setIsSubmitting(true);
    const { error } = await signUp(formData.email, formData.password, formData.name, formData.department || undefined);
    if (error) toast.error(error.message || 'Failed to create account');
    else toast.success('Account created! Please check your email to verify.');
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Shield className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Create Account</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign up to start managing your expenses</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="rounded-xl" /></div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="rounded-xl" /></div>
          <div className="space-y-2"><Label htmlFor="department">Department (Optional)</Label><Input id="department" placeholder="e.g., Computer Science" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="rounded-xl" /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className="rounded-xl" /></div>
          <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm Password</Label><Input id="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required className="rounded-xl" /></div>
          <Button type="submit" className="w-full rounded-xl" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Account</Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
        </div>
      </GlassCard>
    </div>
  );
}
