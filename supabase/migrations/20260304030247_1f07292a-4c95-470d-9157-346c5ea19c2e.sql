
-- Create a security definer function to handle expense escalation after approval
-- This bypasses RLS since the approver needs to change assigned_approver_id to someone else
CREATE OR REPLACE FUNCTION public.escalate_expense(
  p_expense_id uuid,
  p_new_status expense_status,
  p_new_approver_id uuid DEFAULT NULL,
  p_new_approver_role user_role DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.expenses
  SET status = p_new_status,
      assigned_approver_id = p_new_approver_id,
      assigned_approver_role = p_new_approver_role
  WHERE id = p_expense_id;
END;
$$;

-- Clean up duplicate approval records for the corrupted expense
DELETE FROM approvals WHERE expense_id = 'd9bdf9aa-5b03-47e4-8353-7c2b7017f99f';

-- Reset the expense back to SUBMITTED state
UPDATE expenses SET status = 'SUBMITTED', assigned_approver_id = '7644d3cb-6fcc-4f9f-b761-860ed131a969', assigned_approver_role = 'MENTOR' WHERE id = 'd9bdf9aa-5b03-47e4-8353-7c2b7017f99f';
