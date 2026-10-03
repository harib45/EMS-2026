
-- Add reporting_manager_id to profiles for reporting hierarchy
ALTER TABLE public.profiles 
ADD COLUMN reporting_manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create departments table
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  hod_user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Everyone can view departments
CREATE POLICY "Everyone can view departments"
ON public.departments FOR SELECT
USING (true);

-- Only admins can manage departments
CREATE POLICY "Admins can insert departments"
ON public.departments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ADMIN'::user_role));

CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'::user_role));

CREATE POLICY "Admins can delete departments"
ON public.departments FOR DELETE
USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- Allow admins to update reporting_manager_id on profiles
-- (existing RLS already allows users to update own profile, and admins need to set reporting managers)
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- Index for faster lookups
CREATE INDEX idx_profiles_reporting_manager ON public.profiles(reporting_manager_id);
CREATE INDEX idx_departments_hod ON public.departments(hod_user_id);
