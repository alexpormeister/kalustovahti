-- Update existing user to system_admin (Alex Pormeister)
UPDATE public.user_roles SET role = 'system_admin' WHERE user_id = '40ce7207-0bcf-4587-a54d-768509bea709';

-- Recreate has_role function (may have been dropped)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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

-- Helper function to check multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
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

-- Recreate helper functions
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_members
  WHERE user_id = _user_id
$$;

-- =====================
-- PROFILES POLICIES
-- =====================
DROP POLICY IF EXISTS "System admin can manage all profiles" ON public.profiles;
CREATE POLICY "System admin can manage all profiles" ON public.profiles
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =====================
-- USER_ROLES POLICIES  
-- =====================
DROP POLICY IF EXISTS "System admin can manage all roles" ON public.user_roles;
CREATE POLICY "System admin can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- =====================
-- COMPANIES POLICIES
-- =====================
DROP POLICY IF EXISTS "System admin can manage all companies" ON public.companies;
CREATE POLICY "System admin can manage all companies" ON public.companies
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

DROP POLICY IF EXISTS "Contract managers can manage companies" ON public.companies;
CREATE POLICY "Contract managers can manage companies" ON public.companies
  FOR ALL USING (has_role(auth.uid(), 'contract_manager'::app_role));

DROP POLICY IF EXISTS "Hardware and support can view companies" ON public.companies;
CREATE POLICY "Hardware and support can view companies" ON public.companies
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['hardware_ops', 'support']::app_role[]));

-- =====================
-- VEHICLES POLICIES
-- =====================
DROP POLICY IF EXISTS "System admin can manage all vehicles" ON public.vehicles;
CREATE POLICY "System admin can manage all vehicles" ON public.vehicles
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

DROP POLICY IF EXISTS "Contract managers can manage vehicles" ON public.vehicles;
CREATE POLICY "Contract managers can manage vehicles" ON public.vehicles
  FOR ALL USING (has_role(auth.uid(), 'contract_manager'::app_role));

DROP POLICY IF EXISTS "Hardware and support can view vehicles" ON public.vehicles;
CREATE POLICY "Hardware and support can view vehicles" ON public.vehicles
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['hardware_ops', 'support']::app_role[]));

-- =====================
-- HARDWARE_DEVICES POLICIES
-- =====================
DROP POLICY IF EXISTS "System admin can manage all hardware" ON public.hardware_devices;
CREATE POLICY "System admin can manage all hardware" ON public.hardware_devices
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

DROP POLICY IF EXISTS "Hardware ops can manage hardware" ON public.hardware_devices;
CREATE POLICY "Hardware ops can manage hardware" ON public.hardware_devices
  FOR ALL USING (has_role(auth.uid(), 'hardware_ops'::app_role));

DROP POLICY IF EXISTS "Contract managers and support can view hardware" ON public.hardware_devices;
CREATE POLICY "Contract managers and support can view hardware" ON public.hardware_devices
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['contract_manager', 'support']::app_role[]));

-- =====================
-- VEHICLE_ATTRIBUTES POLICIES
-- =====================
DROP POLICY IF EXISTS "System admin can manage attributes" ON public.vehicle_attributes;
CREATE POLICY "System admin can manage attributes" ON public.vehicle_attributes
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can view attributes" ON public.vehicle_attributes;
CREATE POLICY "Authenticated can view attributes" ON public.vehicle_attributes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================
-- VEHICLE_ATTRIBUTE_LINKS POLICIES
-- =====================
DROP POLICY IF EXISTS "System admin can manage attribute links" ON public.vehicle_attribute_links;
CREATE POLICY "System admin can manage attribute links" ON public.vehicle_attribute_links
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

DROP POLICY IF EXISTS "Contract managers can manage attribute links" ON public.vehicle_attribute_links;
CREATE POLICY "Contract managers can manage attribute links" ON public.vehicle_attribute_links
  FOR ALL USING (has_role(auth.uid(), 'contract_manager'::app_role));

DROP POLICY IF EXISTS "Hardware and support can view attribute links" ON public.vehicle_attribute_links;
CREATE POLICY "Hardware and support can view attribute links" ON public.vehicle_attribute_links
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['hardware_ops', 'support']::app_role[]));

-- =====================
-- COMPANY_CONTRACTS POLICIES
-- =====================
DROP POLICY IF EXISTS "System admin can manage contracts" ON public.company_contracts;
CREATE POLICY "System admin can manage contracts" ON public.company_contracts
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

DROP POLICY IF EXISTS "Contract managers can manage contracts" ON public.company_contracts;
CREATE POLICY "Contract managers can manage contracts" ON public.company_contracts
  FOR ALL USING (has_role(auth.uid(), 'contract_manager'::app_role));

DROP POLICY IF EXISTS "Hardware and support can view contracts" ON public.company_contracts;
CREATE POLICY "Hardware and support can view contracts" ON public.company_contracts
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['hardware_ops', 'support']::app_role[]));

-- =====================
-- AUDIT_LOGS POLICIES
-- =====================
DROP POLICY IF EXISTS "System admin can view all audit logs" ON public.audit_logs;
CREATE POLICY "System admin can view all audit logs" ON public.audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'system_admin'::app_role));

DROP POLICY IF EXISTS "Contract managers can view audit logs" ON public.audit_logs;
CREATE POLICY "Contract managers can view audit logs" ON public.audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'contract_manager'::app_role));

DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================
-- COMPANY_MEMBERS POLICIES
-- =====================
DROP POLICY IF EXISTS "System admin can manage company members" ON public.company_members;
CREATE POLICY "System admin can manage company members" ON public.company_members
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

DROP POLICY IF EXISTS "Contract managers can manage company members" ON public.company_members;
CREATE POLICY "Contract managers can manage company members" ON public.company_members
  FOR ALL USING (has_role(auth.uid(), 'contract_manager'::app_role));

DROP POLICY IF EXISTS "Users can view own membership" ON public.company_members;
CREATE POLICY "Users can view own membership" ON public.company_members
  FOR SELECT USING (auth.uid() = user_id);

-- Update handle_new_user trigger to use new default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Give new users support role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'support');
  
  RETURN NEW;
END;
$$;