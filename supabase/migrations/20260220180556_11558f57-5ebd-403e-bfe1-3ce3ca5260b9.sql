
-- ============================================
-- PART 1: Create roles table with default roles
-- ============================================
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_system_role boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Admins can insert roles" ON public.roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'ADMIN'::user_role));
CREATE POLICY "Admins can update roles" ON public.roles FOR UPDATE USING (has_role(auth.uid(), 'ADMIN'::user_role));
CREATE POLICY "Admins can delete non-system roles" ON public.roles FOR DELETE USING (has_role(auth.uid(), 'ADMIN'::user_role) AND is_system_role = false);

-- Seed default roles
INSERT INTO public.roles (name, description, is_system_role) VALUES
  ('ADMIN', 'System administrator with full access', true),
  ('PAYROLL', 'Payroll manager - final approval authority', true),
  ('HOD', 'Head of Department', true),
  ('MENTOR', 'Faculty mentor', true),
  ('STUDENT', 'Student user', true);

-- ============================================
-- PART 2: Create role_permissions table
-- ============================================
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE UNIQUE,
  can_raise_expense boolean NOT NULL DEFAULT true,
  can_approve_expense boolean NOT NULL DEFAULT false,
  can_view_analytics boolean NOT NULL DEFAULT false,
  can_manage_users boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view role permissions" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Admins can insert role permissions" ON public.role_permissions FOR INSERT WITH CHECK (has_role(auth.uid(), 'ADMIN'::user_role));
CREATE POLICY "Admins can update role permissions" ON public.role_permissions FOR UPDATE USING (has_role(auth.uid(), 'ADMIN'::user_role));
CREATE POLICY "Admins can delete role permissions" ON public.role_permissions FOR DELETE USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- Seed default permissions
INSERT INTO public.role_permissions (role_id, can_raise_expense, can_approve_expense, can_view_analytics, can_manage_users)
SELECT id, true, true, true, true FROM public.roles WHERE name = 'ADMIN';

INSERT INTO public.role_permissions (role_id, can_raise_expense, can_approve_expense, can_view_analytics, can_manage_users)
SELECT id, true, true, true, false FROM public.roles WHERE name = 'PAYROLL';

INSERT INTO public.role_permissions (role_id, can_raise_expense, can_approve_expense, can_view_analytics, can_manage_users)
SELECT id, true, true, true, false FROM public.roles WHERE name = 'HOD';

INSERT INTO public.role_permissions (role_id, can_raise_expense, can_approve_expense, can_view_analytics, can_manage_users)
SELECT id, true, true, false, false FROM public.roles WHERE name = 'MENTOR';

INSERT INTO public.role_permissions (role_id, can_raise_expense, can_approve_expense, can_view_analytics, can_manage_users)
SELECT id, true, false, false, false FROM public.roles WHERE name = 'STUDENT';

-- ============================================
-- PART 3: Add role_id to user_roles (backward compatible)
-- ============================================
ALTER TABLE public.user_roles ADD COLUMN role_id uuid REFERENCES public.roles(id);

-- Populate role_id from existing enum values
UPDATE public.user_roles ur SET role_id = r.id FROM public.roles r WHERE r.name = ur.role::text;

-- ============================================
-- PART 4: Add assigned_approver_id to expenses
-- ============================================
ALTER TABLE public.expenses ADD COLUMN assigned_approver_id uuid;

-- Add RLS policies for assigned_approver_id
CREATE POLICY "Assigned approver can view expenses"
ON public.expenses FOR SELECT
USING (assigned_approver_id = auth.uid());

CREATE POLICY "Assigned approver can update expenses"
ON public.expenses FOR UPDATE
USING (assigned_approver_id = auth.uid());

-- ============================================
-- PART 5: Helper functions for hierarchy-based approval
-- ============================================

-- Get reporting manager's user_id from a given user_id
CREATE OR REPLACE FUNCTION public.get_reporting_manager_user_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p2.user_id
  FROM public.profiles p1
  JOIN public.profiles p2 ON p1.reporting_manager_id = p2.id
  WHERE p1.user_id = p_user_id;
$$;

-- Check if user's role is PAYROLL or ADMIN (terminal approval)
CREATE OR REPLACE FUNCTION public.is_terminal_approver(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND r.name IN ('PAYROLL', 'ADMIN')
  );
$$;

-- Get user permissions by user_id
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE(can_raise_expense boolean, can_approve_expense boolean, can_view_analytics boolean, can_manage_users boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rp.can_raise_expense, rp.can_approve_expense, rp.can_view_analytics, rp.can_manage_users
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  WHERE ur.user_id = p_user_id
  LIMIT 1;
$$;

-- Get user's role name from roles table
CREATE OR REPLACE FUNCTION public.get_user_role_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  LIMIT 1;
$$;

-- ============================================
-- PART 6: Update expense creation trigger for hierarchy
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_expense_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  creator_role_name text;
  manager_user_id uuid;
BEGIN
  creator_role_name := public.get_user_role_name(NEW.created_by);

  IF creator_role_name = 'ADMIN' THEN
    NEW.status := 'LOGGED';
    NEW.assigned_approver_role := NULL;
    NEW.assigned_approver_id := NULL;
  ELSE
    -- Find reporting manager via hierarchy
    manager_user_id := public.get_reporting_manager_user_id(NEW.created_by);

    IF manager_user_id IS NOT NULL THEN
      NEW.assigned_approver_id := manager_user_id;
      -- Also set role for backward compat
      NEW.assigned_approver_role := public.get_user_role(manager_user_id);
    ELSE
      -- Fallback to old role-based logic
      NEW.assigned_approver_role := public.get_next_approver_role(public.get_user_role(NEW.created_by));
    END IF;
    NEW.status := 'SUBMITTED';
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================
-- PART 7: Update handle_new_user to set role_id
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  student_role_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);

  SELECT id INTO student_role_id FROM public.roles WHERE name = 'STUDENT';

  INSERT INTO public.user_roles (user_id, role, role_id)
  VALUES (NEW.id, 'STUDENT', student_role_id);

  RETURN NEW;
END;
$function$;
