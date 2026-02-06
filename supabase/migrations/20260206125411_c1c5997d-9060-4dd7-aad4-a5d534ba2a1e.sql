-- Add policy for admins to manage profiles (including delete)
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert profiles
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));