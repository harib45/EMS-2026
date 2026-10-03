
-- Add OCR fields to expenses
ALTER TABLE public.expenses ADD COLUMN ocr_amount numeric;
ALTER TABLE public.expenses ADD COLUMN ocr_date text;
ALTER TABLE public.expenses ADD COLUMN ocr_merchant text;
ALTER TABLE public.expenses ADD COLUMN ocr_text text;
ALTER TABLE public.expenses ADD COLUMN ocr_mismatch_flag boolean DEFAULT false;

-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('APPROVAL', 'REJECTION', 'INFO');

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'INFO',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Create email_logs table
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  is_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
ON public.email_logs FOR SELECT
USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- Trigger function: on approval insert, create notification + email log
CREATE OR REPLACE FUNCTION public.handle_approval_notification()
RETURNS TRIGGER AS $$
DECLARE
  expense_record RECORD;
  creator_profile RECORD;
  notification_message text;
  notif_type notification_type;
  email_subject text;
  email_body text;
BEGIN
  SELECT * INTO expense_record FROM public.expenses WHERE id = NEW.expense_id;
  SELECT * INTO creator_profile FROM public.profiles WHERE user_id = expense_record.created_by;

  IF NEW.action = 'APPROVED' THEN
    notif_type := 'APPROVAL';
    notification_message := 'Your expense "' || expense_record.title || '" (₹' || expense_record.amount || ') has been approved by ' || NEW.approver_role || '.';
  ELSE
    notif_type := 'REJECTION';
    notification_message := 'Your expense "' || expense_record.title || '" (₹' || expense_record.amount || ') has been rejected by ' || NEW.approver_role || '.';
  END IF;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (expense_record.created_by, notification_message, notif_type);

  email_subject := 'Expense Approval Update - ' || expense_record.title;
  email_body := 'Expense Title: ' || expense_record.title || E'\n' ||
                'Approval Level: ' || NEW.approver_role || E'\n' ||
                'Status: ' || NEW.action || E'\n' ||
                'Date: ' || NOW()::text || E'\n' ||
                'Comments: ' || COALESCE(NEW.comments, 'N/A');

  INSERT INTO public.email_logs (to_email, subject, body, is_sent)
  VALUES (
    creator_profile.email,
    email_subject,
    email_body,
    CASE WHEN creator_profile.email LIKE '%@test.com' THEN false ELSE false END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_approval_created
AFTER INSERT ON public.approvals
FOR EACH ROW
EXECUTE FUNCTION public.handle_approval_notification();
