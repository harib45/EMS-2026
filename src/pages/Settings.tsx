import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Settings, Database, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
  const { role } = useAuth();

  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Configure system settings and preferences"
          icon={<Settings className="h-5 w-5 text-primary" />}
        />

        <div className="grid gap-6 md:grid-cols-2">
          {[
            { icon: Database, title: 'Database', desc: 'Manage database settings and connections', body: 'Database is managed through Lovable Cloud. All data is securely stored and backed up automatically.' },
            { icon: Shield, title: 'Security', desc: 'Authentication and security settings', body: 'Security is handled by Lovable Cloud with enterprise-grade encryption and secure authentication.' },
            { icon: Bell, title: 'Notifications', desc: 'Configure notification preferences', body: 'Notification settings coming soon. You\'ll be able to configure email alerts for approvals and status changes.' },
            { icon: Settings, title: 'System', desc: 'General system configuration', body: 'System settings such as expense categories, approval thresholds, and department management will be available in a future update.' },
          ].map(({ icon: Icon, title, desc, body }) => (
            <GlassCard key={title} hover>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold font-display">{title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{desc}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
