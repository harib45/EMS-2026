
-- Create expense_messages table
CREATE TABLE public.expense_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message_text text NOT NULL,
  is_system_message boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_expense_messages_expense_created ON public.expense_messages(expense_id, created_at);

-- Enable RLS
ALTER TABLE public.expense_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for expenses they created
CREATE POLICY "Creators can view expense messages"
ON public.expense_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.expenses
    WHERE expenses.id = expense_messages.expense_id
    AND expenses.created_by = auth.uid()
  )
);

-- Policy: Assigned approvers can view messages
CREATE POLICY "Approvers can view expense messages"
ON public.expense_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.expenses
    WHERE expenses.id = expense_messages.expense_id
    AND expenses.assigned_approver_id = auth.uid()
  )
);

-- Policy: Past approvers can view messages
CREATE POLICY "Past approvers can view expense messages"
ON public.expense_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.approvals
    WHERE approvals.expense_id = expense_messages.expense_id
    AND approvals.approver_id = auth.uid()
  )
);

-- Policy: Admins can view all messages
CREATE POLICY "Admins can view all expense messages"
ON public.expense_messages FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- Policy: Users in approval chain can insert messages
CREATE POLICY "Creators can send messages"
ON public.expense_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.expenses
    WHERE expenses.id = expense_messages.expense_id
    AND expenses.created_by = auth.uid()
  )
);

CREATE POLICY "Approvers can send messages"
ON public.expense_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE expenses.id = expense_messages.expense_id
      AND expenses.assigned_approver_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.approvals
      WHERE approvals.expense_id = expense_messages.expense_id
      AND approvals.approver_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can send messages"
ON public.expense_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND has_role(auth.uid(), 'ADMIN'::user_role)
);
