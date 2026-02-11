-- Fix role_page_permissions policy to include with_check for INSERT/UPDATE
DROP POLICY IF EXISTS "System admin can manage page permissions" ON public.role_page_permissions;
CREATE POLICY "System admin can manage page permissions"
  ON public.role_page_permissions
  FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'system_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

-- Fix roles policy to include with_check for INSERT/UPDATE
DROP POLICY IF EXISTS "System admin can manage roles" ON public.roles;
CREATE POLICY "System admin can manage roles"
  ON public.roles
  FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'system_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

-- Fix user_roles policy to include with_check
DROP POLICY IF EXISTS "System admins can manage all user roles" ON public.user_roles;
CREATE POLICY "System admins can manage all user roles"
  ON public.user_roles
  FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'system_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'));