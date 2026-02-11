
-- Change user_roles.role from app_role enum to text so custom roles work
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'support';

-- Update has_role function to work with text
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update has_any_role function to work with text array
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Update handle_new_user to use text
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'support');
  
  RETURN NEW;
END;
$$;

-- Update get_user_page_permission to use text comparison
CREATE OR REPLACE FUNCTION public.get_user_page_permission(_user_id uuid, _page_key text)
RETURNS TABLE(can_view boolean, can_edit boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true, true
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'system_admin'
  )
  UNION ALL
  SELECT 
    COALESCE(MAX(rpp.can_view::int), 0)::boolean,
    COALESCE(MAX(rpp.can_edit::int), 0)::boolean
  FROM public.user_roles ur
  JOIN public.roles r ON r.name = ur.role
  JOIN public.role_page_permissions rpp ON rpp.role_id = r.id
  WHERE ur.user_id = _user_id
    AND rpp.page_key = _page_key
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'system_admin'
    )
  LIMIT 1;
$$;
