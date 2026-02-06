-- Create roles table for dynamic role management
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Only system_admin can manage roles
CREATE POLICY "System admin can manage roles"
ON public.roles
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- All authenticated users can view roles
CREATE POLICY "Authenticated users can view roles"
ON public.roles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Seed initial roles from enum
INSERT INTO public.roles (name, display_name, description, is_system_role) VALUES
  ('system_admin', 'Pääkäyttäjä', 'Täydet oikeudet kaikkiin toimintoihin', true),
  ('contract_manager', 'Sopimushallinta', 'Yritysten ja sopimusten hallinta', false),
  ('hardware_ops', 'Laitehallinta', 'Laitteiden ja varaston hallinta', false),
  ('support', 'Asiakaspalvelu', 'Vain luku -oikeudet', false);

-- Create page permissions table
CREATE TABLE public.role_page_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, page_key)
);

-- Create trigger for updated_at
CREATE TRIGGER update_role_page_permissions_updated_at
BEFORE UPDATE ON public.role_page_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.role_page_permissions ENABLE ROW LEVEL SECURITY;

-- Only system_admin can manage permissions
CREATE POLICY "System admin can manage page permissions"
ON public.role_page_permissions
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- All authenticated users can view permissions (needed for UI)
CREATE POLICY "Authenticated users can view page permissions"
ON public.role_page_permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Seed default permissions for each role
-- Get role IDs
DO $$
DECLARE
  system_admin_id UUID;
  contract_manager_id UUID;
  hardware_ops_id UUID;
  support_id UUID;
  pages TEXT[] := ARRAY['dashboard', 'autoilijat', 'kalusto', 'laitteet', 'kuljettajat', 'varustelu', 'laadunvalvonta', 'asetukset', 'kayttajat'];
  page TEXT;
BEGIN
  SELECT id INTO system_admin_id FROM public.roles WHERE name = 'system_admin';
  SELECT id INTO contract_manager_id FROM public.roles WHERE name = 'contract_manager';
  SELECT id INTO hardware_ops_id FROM public.roles WHERE name = 'hardware_ops';
  SELECT id INTO support_id FROM public.roles WHERE name = 'support';
  
  -- System admin gets full access to everything (but won't be checked - always has access)
  FOREACH page IN ARRAY pages LOOP
    INSERT INTO public.role_page_permissions (role_id, page_key, can_view, can_edit) VALUES
      (system_admin_id, page, true, true);
  END LOOP;
  
  -- Contract manager permissions
  INSERT INTO public.role_page_permissions (role_id, page_key, can_view, can_edit) VALUES
    (contract_manager_id, 'dashboard', true, false),
    (contract_manager_id, 'autoilijat', true, true),
    (contract_manager_id, 'kalusto', true, true),
    (contract_manager_id, 'laitteet', true, false),
    (contract_manager_id, 'kuljettajat', true, true),
    (contract_manager_id, 'varustelu', true, true),
    (contract_manager_id, 'laadunvalvonta', true, true),
    (contract_manager_id, 'asetukset', true, false),
    (contract_manager_id, 'kayttajat', false, false);
  
  -- Hardware ops permissions
  INSERT INTO public.role_page_permissions (role_id, page_key, can_view, can_edit) VALUES
    (hardware_ops_id, 'dashboard', true, false),
    (hardware_ops_id, 'autoilijat', true, false),
    (hardware_ops_id, 'kalusto', true, false),
    (hardware_ops_id, 'laitteet', true, true),
    (hardware_ops_id, 'kuljettajat', false, false),
    (hardware_ops_id, 'varustelu', true, false),
    (hardware_ops_id, 'laadunvalvonta', true, false),
    (hardware_ops_id, 'asetukset', false, false),
    (hardware_ops_id, 'kayttajat', false, false);
  
  -- Support permissions (read-only)
  INSERT INTO public.role_page_permissions (role_id, page_key, can_view, can_edit) VALUES
    (support_id, 'dashboard', true, false),
    (support_id, 'autoilijat', true, false),
    (support_id, 'kalusto', true, false),
    (support_id, 'laitteet', true, false),
    (support_id, 'kuljettajat', true, false),
    (support_id, 'varustelu', true, false),
    (support_id, 'laadunvalvonta', true, false),
    (support_id, 'asetukset', false, false),
    (support_id, 'kayttajat', false, false);
END $$;

-- Create function to get user permissions for a page
CREATE OR REPLACE FUNCTION public.get_user_page_permission(
  _user_id UUID,
  _page_key TEXT
)
RETURNS TABLE(can_view BOOLEAN, can_edit BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- System admin always has full access
  SELECT true, true
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'system_admin'::app_role
  )
  UNION ALL
  -- For other roles, get the highest permission
  SELECT 
    COALESCE(MAX(rpp.can_view::int), 0)::boolean,
    COALESCE(MAX(rpp.can_edit::int), 0)::boolean
  FROM public.user_roles ur
  JOIN public.roles r ON r.name = ur.role::text
  JOIN public.role_page_permissions rpp ON rpp.role_id = r.id
  WHERE ur.user_id = _user_id
    AND rpp.page_key = _page_key
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'system_admin'::app_role
    )
  LIMIT 1;
$$;

-- Create index for faster permission lookups
CREATE INDEX idx_role_page_permissions_role ON public.role_page_permissions(role_id);
CREATE INDEX idx_role_page_permissions_page ON public.role_page_permissions(page_key);