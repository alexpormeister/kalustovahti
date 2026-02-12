
-- Allow users with kayttajat page view permission to see all profiles
CREATE POLICY "Page permission users can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kayttajat') LIMIT 1) = true
  );

-- Allow users with kayttajat page edit permission to update profiles
CREATE POLICY "Page permission users can edit profiles"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'kayttajat') LIMIT 1) = true
  );

-- Allow users with kayttajat page view permission to see all user_roles
CREATE POLICY "Page permission users can view user roles"
  ON public.user_roles FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kayttajat') LIMIT 1) = true
  );

-- Allow users with kayttajat page edit permission to manage user_roles
CREATE POLICY "Page permission users can edit user roles"
  ON public.user_roles FOR ALL
  USING (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'kayttajat') LIMIT 1) = true
  )
  WITH CHECK (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'kayttajat') LIMIT 1) = true
  );
