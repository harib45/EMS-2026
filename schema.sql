--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS on_approval_created ON public.approvals;
DROP TRIGGER IF EXISTS on_expense_created ON public.expenses;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.approvals CASCADE;
DROP TABLE IF EXISTS public.expense_messages CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

DO $$ BEGIN
  IF to_regprocedure('public.update_profiles_updated_at()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.update_profiles_updated_at() CASCADE';
  END IF;
  IF to_regprocedure('public.log_audit(text, text, uuid, jsonb)') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.log_audit(text, text, uuid, jsonb) CASCADE';
  END IF;
  IF to_regprocedure('public.is_terminal_approver(uuid)') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.is_terminal_approver(uuid) CASCADE';
  END IF;
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.handle_new_user() CASCADE';
  END IF;
  IF to_regprocedure('public.handle_expense_creation()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.handle_expense_creation() CASCADE';
  END IF;
  IF to_regprocedure('public.handle_approval_notification()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.handle_approval_notification() CASCADE';
  END IF;
  IF to_regprocedure('public.get_user_role_name(uuid)') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.get_user_role_name(uuid) CASCADE';
  END IF;
  IF to_regprocedure('public.get_user_permissions(uuid)') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.get_user_permissions(uuid) CASCADE';
  END IF;
  IF to_regprocedure('public.get_reporting_manager_user_id(uuid)') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.get_reporting_manager_user_id(uuid) CASCADE';
  END IF;
END $$;

DROP TYPE IF EXISTS public.approval_action CASCADE;
DROP TYPE IF EXISTS public.expense_status CASCADE;
DROP TYPE IF EXISTS public.notification_type CASCADE;
DROP TYPE IF EXISTS public.payment_mode CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

--
-- Name: approval_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_action AS ENUM (
    'APPROVED',
    'REJECTED'
);


--
-- Name: expense_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expense_status AS ENUM (
    'LOGGED',
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'APPROVAL',
    'REJECTION',
    'INFO'
);


--
-- Name: payment_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_mode AS ENUM (
    'CASH',
    'UPI',
    'BANK'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'PAYROLL',
    'HOD',
    'MENTOR',
    'STUDENT'
);


--
-- Name: escalate_expense(uuid, public.expense_status, uuid, public.user_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.escalate_expense(p_expense_id uuid, p_new_status public.expense_status, p_new_approver_id uuid DEFAULT NULL::uuid, p_new_approver_role public.user_role DEFAULT NULL::public.user_role) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.expenses
  SET status = p_new_status,
      assigned_approver_id = p_new_approver_id,
      assigned_approver_role = p_new_approver_role
  WHERE id = p_expense_id;
END;
$$;


--
-- Name: get_next_approver_role(public.user_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_approver_role(p_role public.user_role) RETURNS public.user_role
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
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


--
-- Name: get_reporting_manager_user_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_reporting_manager_user_id(p_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p2.user_id
  FROM public.profiles p1
  JOIN public.profiles p2 ON p1.reporting_manager_id = p2.id
  WHERE p1.user_id = p_user_id;
$$;


--
-- Name: get_user_permissions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_permissions(p_user_id uuid) RETURNS TABLE(can_raise_expense boolean, can_approve_expense boolean, can_view_analytics boolean, can_manage_users boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT rp.can_raise_expense, rp.can_approve_expense, rp.can_view_analytics, rp.can_manage_users
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  WHERE ur.user_id = p_user_id
  LIMIT 1;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(p_user_id uuid) RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
$$;


--
-- Name: get_user_role_name(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role_name(p_user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT r.name FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  LIMIT 1;
$$;


--
-- Name: handle_approval_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_approval_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: handle_expense_creation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_expense_creation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: has_role(uuid, public.user_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(p_user_id uuid, p_role public.user_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = p_role
  );
$$;


--
-- Name: is_terminal_approver(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_terminal_approver(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND r.name IN ('PAYROLL', 'ADMIN')
  );
$$;


--
-- Name: log_audit(text, text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit(p_action text, p_entity text, p_entity_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity, p_entity_id, p_details);
END;
$$;


--
-- Name: update_profiles_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_profiles_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    approver_id uuid,
    approver_role public.user_role NOT NULL,
    action public.approval_action NOT NULL,
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    hod_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    to_email text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    is_sent boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expense_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message_text text NOT NULL,
    is_system_message boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    amount numeric(10,2) NOT NULL,
    category text NOT NULL,
    description text,
    bill_url text,
    status public.expense_status DEFAULT 'SUBMITTED'::public.expense_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    assigned_approver_role public.user_role,
    ocr_amount numeric,
    ocr_date text,
    ocr_merchant text,
    ocr_text text,
    ocr_mismatch_flag boolean DEFAULT false,
    assigned_approver_id uuid,
    CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    type public.notification_type DEFAULT 'INFO'::public.notification_type NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_mode public.payment_mode NOT NULL,
    reference_id text,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    department text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reporting_manager_id uuid,
    display_name text,
    profile_image_url text,
    mobile_number text,
    register_number text,
    is_mobile_visible boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL,
    password_updated_at timestamp with time zone
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    can_raise_expense boolean DEFAULT true NOT NULL,
    can_approve_expense boolean DEFAULT false NOT NULL,
    can_view_analytics boolean DEFAULT false NOT NULL,
    can_manage_users boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_system_role boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.user_role DEFAULT 'STUDENT'::public.user_role NOT NULL,
    role_id uuid
);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: expense_messages expense_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_messages
    ADD CONSTRAINT expense_messages_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_expense_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_expense_id_key UNIQUE (expense_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_key UNIQUE (role_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_departments_hod; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_hod ON public.departments USING btree (hod_user_id);


--
-- Name: idx_expense_messages_expense_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_messages_expense_created ON public.expense_messages USING btree (expense_id, created_at);


--
-- Name: idx_profiles_reporting_manager; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_reporting_manager ON public.profiles USING btree (reporting_manager_id);


--
-- Name: approvals on_approval_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_approval_created AFTER INSERT ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.handle_approval_notification();


--
-- Name: expenses on_expense_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_expense_created BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.handle_expense_creation();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: approvals approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: approvals approvals_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: departments departments_hod_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_hod_user_id_fkey FOREIGN KEY (hod_user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;


--
-- Name: expense_messages expense_messages_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_messages
    ADD CONSTRAINT expense_messages_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_created_by_profiles_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_profiles_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);


--
-- Name: payments payments_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_reporting_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_reporting_manager_id_fkey FOREIGN KEY (reporting_manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: departments Admins can delete departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete departments" ON public.departments FOR DELETE USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: roles Admins can delete non-system roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete non-system roles" ON public.roles FOR DELETE USING ((public.has_role(auth.uid(), 'ADMIN'::public.user_role) AND (is_system_role = false)));


--
-- Name: role_permissions Admins can delete role permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete role permissions" ON public.role_permissions FOR DELETE USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: departments Admins can insert departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert departments" ON public.departments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: role_permissions Admins can insert role permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert role permissions" ON public.role_permissions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: expense_messages Admins can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can send messages" ON public.expense_messages FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND public.has_role(auth.uid(), 'ADMIN'::public.user_role)));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: departments Admins can update departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update departments" ON public.departments FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: role_permissions Admins can update role permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update role permissions" ON public.role_permissions FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.roles FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: audit_logs Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: expense_messages Admins can view all expense messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all expense messages" ON public.expense_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: expenses Admins can view all expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all expenses" ON public.expenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: email_logs Admins can view email logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view email logs" ON public.email_logs FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.user_role));


--
-- Name: approvals Approvers can insert approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approvers can insert approvals" ON public.approvals FOR INSERT TO authenticated WITH CHECK ((approver_id = auth.uid()));


--
-- Name: expense_messages Approvers can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approvers can send messages" ON public.expense_messages FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM public.expenses
  WHERE ((expenses.id = expense_messages.expense_id) AND (expenses.assigned_approver_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.approvals
  WHERE ((approvals.expense_id = expense_messages.expense_id) AND (approvals.approver_id = auth.uid())))))));


--
-- Name: expenses Approvers can update assigned expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approvers can update assigned expenses" ON public.expenses FOR UPDATE USING ((assigned_approver_role = public.get_user_role(auth.uid()))) WITH CHECK (true);


--
-- Name: expense_messages Approvers can view expense messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approvers can view expense messages" ON public.expense_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.expenses
  WHERE ((expenses.id = expense_messages.expense_id) AND (expenses.assigned_approver_id = auth.uid())))));


--
-- Name: approvals Approvers can view own approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approvers can view own approvals" ON public.approvals FOR SELECT TO authenticated USING ((approver_id = auth.uid()));


--
-- Name: expenses Approvers can view pending expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approvers can view pending expenses" ON public.expenses FOR SELECT TO authenticated USING ((assigned_approver_role = public.get_user_role(auth.uid())));


--
-- Name: expenses Assigned approver can update expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Assigned approver can update expenses" ON public.expenses FOR UPDATE USING ((assigned_approver_id = auth.uid())) WITH CHECK (true);


--
-- Name: expenses Assigned approver can view expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Assigned approver can view expenses" ON public.expenses FOR SELECT USING ((assigned_approver_id = auth.uid()));


--
-- Name: expense_messages Creators can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can send messages" ON public.expense_messages FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.expenses
  WHERE ((expenses.id = expense_messages.expense_id) AND (expenses.created_by = auth.uid()))))));


--
-- Name: expense_messages Creators can view expense messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can view expense messages" ON public.expense_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.expenses
  WHERE ((expenses.id = expense_messages.expense_id) AND (expenses.created_by = auth.uid())))));


--
-- Name: departments Everyone can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view departments" ON public.departments FOR SELECT USING (true);


--
-- Name: role_permissions Everyone can view role permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view role permissions" ON public.role_permissions FOR SELECT USING (true);


--
-- Name: roles Everyone can view roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view roles" ON public.roles FOR SELECT USING (true);


--
-- Name: expense_messages Past approvers can view expense messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Past approvers can view expense messages" ON public.expense_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.approvals
  WHERE ((approvals.expense_id = expense_messages.expense_id) AND (approvals.approver_id = auth.uid())))));


--
-- Name: payments Payroll and Admin can insert payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Payroll and Admin can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'PAYROLL'::public.user_role) OR public.has_role(auth.uid(), 'ADMIN'::public.user_role)));


--
-- Name: payments Payroll and Admin can view all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Payroll and Admin can view all payments" ON public.payments FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'PAYROLL'::public.user_role) OR public.has_role(auth.uid(), 'ADMIN'::public.user_role)));


--
-- Name: expenses Payroll can view all expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Payroll can view all expenses" ON public.expenses FOR SELECT USING (public.has_role(auth.uid(), 'PAYROLL'::public.user_role));


--
-- Name: expenses Users can create expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK ((auth.uid() = created_by));


--
-- Name: audit_logs Users can insert own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((actor_id = auth.uid()));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: expenses Users can update own pending expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own pending expenses" ON public.expenses FOR UPDATE USING (((auth.uid() = created_by) AND (status = 'SUBMITTED'::public.expense_status))) WITH CHECK (true);


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: approvals Users can view approvals for own expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view approvals for own expenses" ON public.approvals FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.expenses
  WHERE ((expenses.id = approvals.expense_id) AND (expenses.created_by = auth.uid())))));


--
-- Name: expenses Users can view own expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT TO authenticated USING ((auth.uid() = created_by));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: payments Users can view payments for own expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view payments for own expenses" ON public.payments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.expenses
  WHERE ((expenses.id = payments.expense_id) AND (expenses.created_by = auth.uid())))));


--
-- Name: approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: email_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


