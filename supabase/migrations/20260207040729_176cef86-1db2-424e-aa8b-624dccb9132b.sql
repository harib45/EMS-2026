
-- Fix function search_path for get_next_approver_role
CREATE OR REPLACE FUNCTION public.get_next_approver_role(p_role user_role)
RETURNS user_role
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
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

-- Drop the overly permissive audit log policy and make it more restrictive
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only authenticated users who are the actor can insert their own audit logs
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
FOR INSERT TO authenticated 
WITH CHECK (actor_id = auth.uid());
