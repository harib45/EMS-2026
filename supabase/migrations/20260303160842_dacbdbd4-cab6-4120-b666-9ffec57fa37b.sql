
ALTER TABLE public.profiles
  ADD COLUMN must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN password_updated_at timestamp with time zone;
