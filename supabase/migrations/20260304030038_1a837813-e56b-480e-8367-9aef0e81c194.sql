
-- Fix: UPDATE policies need separate WITH CHECK to allow changing approver fields
-- Drop and recreate the two approver update policies with explicit WITH CHECK (true)

DROP POLICY IF EXISTS "Approvers can update assigned expenses" ON public.expenses;
CREATE POLICY "Approvers can update assigned expenses"
ON public.expenses FOR UPDATE
USING (assigned_approver_role = get_user_role(auth.uid()))
WITH CHECK (true);

DROP POLICY IF EXISTS "Assigned approver can update expenses" ON public.expenses;
CREATE POLICY "Assigned approver can update expenses"
ON public.expenses FOR UPDATE
USING (assigned_approver_id = auth.uid())
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own pending expenses" ON public.expenses;
CREATE POLICY "Users can update own pending expenses"
ON public.expenses FOR UPDATE
USING ((auth.uid() = created_by) AND (status = 'SUBMITTED'::expense_status))
WITH CHECK (true);
