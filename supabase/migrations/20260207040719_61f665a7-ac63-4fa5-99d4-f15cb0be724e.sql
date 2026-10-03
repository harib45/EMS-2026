
-- Create custom enums for the expense reimbursement system
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'PAYROLL', 'HOD', 'MENTOR', 'STUDENT');
CREATE TYPE public.expense_status AS ENUM ('LOGGED', 'SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE public.payment_mode AS ENUM ('CASH', 'UPI', 'BANK');
CREATE TYPE public.approval_action AS ENUM ('APPROVED', 'REJECTED');

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table for role management (security best practice)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    UNIQUE (user_id, role)
);

-- Create expenses table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    description TEXT,
    bill_url TEXT,
    status expense_status NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assigned_approver_role user_role
);

-- Create approvals table for approval history
CREATE TABLE public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL,
    approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approver_role user_role NOT NULL,
    action approval_action NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_mode payment_mode NOT NULL,
    reference_id TEXT,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
$$;

-- Security definer function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = p_role
  );
$$;

-- Function to get next approver role in hierarchy
CREATE OR REPLACE FUNCTION public.get_next_approver_role(p_role user_role)
RETURNS user_role
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_role
    WHEN 'STUDENT' THEN RETURN 'MENTOR';
    WHEN 'MENTOR' THEN RETURN 'HOD';
    WHEN 'HOD' THEN RETURN 'PAYROLL';
    WHEN 'PAYROLL' THEN RETURN 'ADMIN';
    WHEN 'ADMIN' THEN RETURN NULL;
    ELSE RETURN NULL;
  END CASE;
END;
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Expenses policies
CREATE POLICY "Users can view own expenses" ON public.expenses
FOR SELECT TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Approvers can view pending expenses" ON public.expenses
FOR SELECT TO authenticated 
USING (assigned_approver_role = public.get_user_role(auth.uid()));

CREATE POLICY "Admins can view all expenses" ON public.expenses
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Users can create expenses" ON public.expenses
FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own pending expenses" ON public.expenses
FOR UPDATE TO authenticated 
USING (auth.uid() = created_by AND status = 'SUBMITTED');

CREATE POLICY "Approvers can update assigned expenses" ON public.expenses
FOR UPDATE TO authenticated 
USING (assigned_approver_role = public.get_user_role(auth.uid()));

-- Approvals policies
CREATE POLICY "Users can view approvals for own expenses" ON public.approvals
FOR SELECT TO authenticated 
USING (EXISTS (
    SELECT 1 FROM public.expenses WHERE expenses.id = expense_id AND expenses.created_by = auth.uid()
));

CREATE POLICY "Approvers can view own approvals" ON public.approvals
FOR SELECT TO authenticated USING (approver_id = auth.uid());

CREATE POLICY "Approvers can insert approvals" ON public.approvals
FOR INSERT TO authenticated WITH CHECK (approver_id = auth.uid());

-- Payments policies
CREATE POLICY "Users can view payments for own expenses" ON public.payments
FOR SELECT TO authenticated 
USING (EXISTS (
    SELECT 1 FROM public.expenses WHERE expenses.id = expense_id AND expenses.created_by = auth.uid()
));

CREATE POLICY "Payroll and Admin can view all payments" ON public.payments
FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'PAYROLL') OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Payroll and Admin can insert payments" ON public.payments
FOR INSERT TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'PAYROLL') OR public.has_role(auth.uid(), 'ADMIN'));

-- Audit logs policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'STUDENT');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger function to handle expense creation (auto-log for ADMIN)
CREATE OR REPLACE FUNCTION public.handle_expense_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_role user_role;
  next_approver user_role;
BEGIN
  creator_role := public.get_user_role(NEW.created_by);
  
  IF creator_role = 'ADMIN' THEN
    NEW.status := 'LOGGED';
    NEW.assigned_approver_role := NULL;
  ELSE
    next_approver := public.get_next_approver_role(creator_role);
    NEW.assigned_approver_role := next_approver;
    NEW.status := 'SUBMITTED';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for expense creation
CREATE TRIGGER on_expense_created
BEFORE INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.handle_expense_creation();

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_entity TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity, p_entity_id, p_details);
END;
$$;
