
-- Add system messages on approval actions
CREATE OR REPLACE FUNCTION public.handle_approval_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  expense_record RECORD;
  creator_profile RECORD;
  notification_message text;
  notif_type notification_type;
  email_subject text;
  email_body text;
  approver_name text;
BEGIN
  SELECT * INTO expense_record FROM public.expenses WHERE id = NEW.expense_id;
  SELECT * INTO creator_profile FROM public.profiles WHERE user_id = expense_record.created_by;

  -- Get approver name
  SELECT COALESCE(display_name, name) INTO approver_name FROM public.profiles WHERE user_id = NEW.approver_id;

  IF NEW.action = 'APPROVED' THEN
    notif_type := 'APPROVAL';
    notification_message := 'Your expense "' || expense_record.title || '" (₹' || expense_record.amount || ') has been approved by ' || NEW.approver_role || '.';
  ELSE
    notif_type := 'REJECTION';
    notification_message := 'Your expense "' || expense_record.title || '" (₹' || expense_record.amount || ') has been rejected by ' || NEW.approver_role || '.';
  END IF;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (expense_record.created_by, notification_message, notif_type);

  -- Insert system chat message
  INSERT INTO public.expense_messages (expense_id, sender_id, message_text, is_system_message)
  VALUES (
    NEW.expense_id,
    NEW.approver_id,
    'Expense ' || LOWER(NEW.action::text) || ' by ' || COALESCE(approver_name, NEW.approver_role::text),
    true
  );

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
    false
  );

  RETURN NEW;
END;
$function$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_approval_created ON public.approvals;
CREATE TRIGGER on_approval_created
  AFTER INSERT ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_approval_notification();
