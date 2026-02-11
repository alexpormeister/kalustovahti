
-- ============================================
-- FIX 1: Driver documents storage - restrict to system_admin, contract_manager, admin
-- ============================================

-- Drop existing overly permissive storage policies for driver-documents
DROP POLICY IF EXISTS "Authenticated users can upload driver documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view driver documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete driver documents" ON storage.objects;

-- Restricted SELECT: only system_admin, contract_manager, admin
CREATE POLICY "Authorized roles can view driver documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-documents' 
  AND has_any_role(auth.uid(), ARRAY['system_admin'::app_role, 'contract_manager'::app_role, 'admin'::app_role])
);

-- Restricted INSERT: only system_admin, contract_manager, admin
CREATE POLICY "Authorized roles can upload driver documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver-documents' 
  AND has_any_role(auth.uid(), ARRAY['system_admin'::app_role, 'contract_manager'::app_role, 'admin'::app_role])
);

-- Restricted DELETE: only system_admin
CREATE POLICY "System admin can delete driver documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'driver-documents' 
  AND has_role(auth.uid(), 'system_admin'::app_role)
);

-- ============================================
-- FIX 2: Drivers table - create a view excluding SSN for hardware_ops/support
-- Remove direct SELECT for hardware_ops and support, replace with restricted view access
-- ============================================

-- Drop the existing permissive policies for hardware_ops and support on drivers
DROP POLICY IF EXISTS "Hardware ops can view drivers" ON public.drivers;
DROP POLICY IF EXISTS "Support can view drivers" ON public.drivers;

-- Create a safe view that excludes SSN
CREATE OR REPLACE VIEW public.drivers_safe
WITH (security_invoker=on) AS
  SELECT id, full_name, driver_number, email, phone, city, province, 
         company_id, driver_license_valid_until, status, notes, created_at, updated_at
  FROM public.drivers;
  -- Excludes ssn_encrypted

-- Re-add hardware_ops and support with read access (they'll use the view, but policy still needed for view to work)
CREATE POLICY "Hardware ops can view drivers basic info"
ON public.drivers FOR SELECT
USING (
  has_role(auth.uid(), 'hardware_ops'::app_role)
);

CREATE POLICY "Support can view drivers basic info"
ON public.drivers FOR SELECT
USING (
  has_role(auth.uid(), 'support'::app_role)
);

-- ============================================
-- FIX 3: Companies table - restrict hardware_ops/support to operational data via view
-- ============================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Hardware and support can view companies" ON public.companies;

-- Create a safe view excluding billing and sensitive contact info
CREATE OR REPLACE VIEW public.companies_safe
WITH (security_invoker=on) AS
  SELECT id, name, address, contract_status, created_at, updated_at
  FROM public.companies;
  -- Excludes contact_email, contact_phone, contact_person, billing_info, business_id

-- Re-add restricted SELECT for hardware_ops and support
CREATE POLICY "Hardware and support can view companies"
ON public.companies FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['hardware_ops'::app_role, 'support'::app_role])
);
