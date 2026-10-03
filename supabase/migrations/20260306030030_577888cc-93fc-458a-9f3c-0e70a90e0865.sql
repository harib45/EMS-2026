-- Allow PAYROLL role to view all expenses
CREATE POLICY "Payroll can view all expenses"
ON public.expenses FOR SELECT
USING (has_role(auth.uid(), 'PAYROLL'::user_role));