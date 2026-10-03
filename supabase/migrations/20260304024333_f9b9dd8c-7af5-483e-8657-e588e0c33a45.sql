ALTER TABLE public.expenses
ADD CONSTRAINT expenses_created_by_profiles_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);