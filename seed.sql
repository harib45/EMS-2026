INSERT INTO public.roles (name, description, is_system_role)
VALUES
  ('ADMIN', 'System administrator with full access', true),
  ('PAYROLL', 'Payroll manager - final approval authority', true),
  ('HOD', 'Head of Department', true),
  ('MENTOR', 'Faculty mentor', true),
  ('STUDENT', 'Student user', true),
  ('PRINCIPAL', 'One above all hod', false)
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  is_system_role = EXCLUDED.is_system_role;

WITH permission_seed AS (
  SELECT *
  FROM (
    VALUES
      ('ADMIN', true, true, true, true),
      ('PAYROLL', true, true, true, false),
      ('HOD', true, true, true, false),
      ('MENTOR', true, true, false, false),
      ('STUDENT', true, false, false, false),
      ('PRINCIPAL', true, true, false, false)
  ) AS v(role_name, can_raise_expense, can_approve_expense, can_view_analytics, can_manage_users)
)
INSERT INTO public.role_permissions (role_id, can_raise_expense, can_approve_expense, can_view_analytics, can_manage_users)
SELECT r.id, ps.can_raise_expense, ps.can_approve_expense, ps.can_view_analytics, ps.can_manage_users
FROM permission_seed ps
JOIN public.roles r ON r.name = ps.role_name
ON CONFLICT (role_id) DO UPDATE
SET
  can_raise_expense = EXCLUDED.can_raise_expense,
  can_approve_expense = EXCLUDED.can_approve_expense,
  can_view_analytics = EXCLUDED.can_view_analytics,
  can_manage_users = EXCLUDED.can_manage_users;

INSERT INTO public.departments (name, hod_user_id)
VALUES
  ('AI&DS', NULL),
  ('CSE', NULL),
  ('Cyber Security', NULL)
ON CONFLICT (name) DO NOTHING;
