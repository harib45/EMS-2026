import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  CheckSquare,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Building2,
  GitBranch,
  Wallet,
  UserCog,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ROLE_COLORS } from '@/lib/constants';
import { useSlideInLeft } from '@/hooks/useGsapAnimations';

export function Sidebar() {
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const { permissions } = usePermissions();
  const sidebarRef = useSlideInLeft(0.05);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'My Expenses', href: '/expenses', icon: Receipt, show: true },
    { name: 'New Expense', href: '/expenses/new', icon: PlusCircle, show: permissions?.can_raise_expense !== false },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare, show: permissions?.can_approve_expense === true },
    { name: 'Reports', href: '/reports', icon: BarChart3, show: permissions?.can_view_analytics === true },
    { name: 'Payroll', href: '/payroll', icon: Wallet, show: role === 'ADMIN' || role === 'PAYROLL' },
    { name: 'Subordinates', href: '/subordinates', icon: UsersRound, show: role !== 'STUDENT' },
    { name: 'Users', href: '/users', icon: Users, show: permissions?.can_manage_users === true },
    { name: 'Departments', href: '/departments', icon: Building2, show: permissions?.can_manage_users === true },
    { name: 'Hierarchy', href: '/hierarchy', icon: GitBranch, show: permissions?.can_manage_users === true },
    { name: 'Roles', href: '/role-management', icon: ShieldCheck, show: permissions?.can_manage_users === true },
    { name: 'Settings', href: '/settings', icon: Settings, show: permissions?.can_manage_users === true },
    { name: 'Account', href: '/account', icon: UserCog, show: true },
  ];

  const filteredNav = navigation.filter(item => item.show);

  return (
    <div ref={sidebarRef} className="flex h-full w-64 flex-col sidebar-glass">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
          <Wallet className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <span className="text-lg font-bold font-display text-sidebar-foreground tracking-tight">EMS</span>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-sidebar-primary/30">
            <AvatarImage src={(profile as any)?.profile_image_url || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm font-semibold">
              {(profile as any)?.display_name?.charAt(0).toUpperCase() || profile?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {(profile as any)?.display_name || profile?.name || 'User'}
            </p>
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider mt-0.5",
              role ? ROLE_COLORS[role] : 'bg-muted text-muted-foreground'
            )}>
              {role || 'Loading...'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn(
                "h-[18px] w-[18px] transition-transform duration-200",
                !isActive && "group-hover:scale-110"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl"
          onClick={signOut}
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
