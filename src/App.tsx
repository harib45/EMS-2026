import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForceChangePassword from "./pages/ForceChangePassword";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import NewExpense from "./pages/NewExpense";
import Approvals from "./pages/Approvals";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Departments from "./pages/Departments";
import Hierarchy from "./pages/Hierarchy";
import Payroll from "./pages/Payroll";
import AccountSettings from "./pages/AccountSettings";
import RoleManagement from "./pages/RoleManagement";
import ExpenseDetail from "./pages/ExpenseDetail";
import Subordinates from "./pages/Subordinates";
import SubordinateDetail from "./pages/SubordinateDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/force-change-password" element={<ForceChangePassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expenses/new" element={<NewExpense />} />
            <Route path="/expenses/:id" element={<ExpenseDetail />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/hierarchy" element={<Hierarchy />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/role-management" element={<RoleManagement />} />
            <Route path="/subordinates" element={<Subordinates />} />
            <Route path="/subordinates/:id" element={<SubordinateDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

