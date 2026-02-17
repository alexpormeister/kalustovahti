
-- 1. Fix company-documents storage SELECT policy (restrict to authorized roles)
DROP POLICY IF EXISTS "Authenticated users can view company documents" ON storage.objects;
CREATE POLICY "Authorized roles can view company documents" 
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'company-documents' AND 
    public.has_any_role(auth.uid(), ARRAY['system_admin','contract_manager','admin'])
  );

-- 2. Fix _encryption_keys: deny all access (only SECURITY DEFINER functions should access)
CREATE POLICY "No direct access to encryption keys"
  ON public._encryption_keys FOR ALL
  USING (false);

-- 3. Tighten device_links policies (require authenticated + role check)
DROP POLICY IF EXISTS "Authenticated can insert device links" ON public.device_links;
DROP POLICY IF EXISTS "Authenticated can update device links" ON public.device_links;
DROP POLICY IF EXISTS "Authenticated can delete device links" ON public.device_links;

CREATE POLICY "Authorized users can insert device links"
  ON public.device_links FOR INSERT
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['system_admin','admin','hardware_ops','contract_manager'])
  );
CREATE POLICY "Authorized users can update device links"
  ON public.device_links FOR UPDATE
  USING (
    public.has_any_role(auth.uid(), ARRAY['system_admin','admin','hardware_ops','contract_manager'])
  );
CREATE POLICY "Authorized users can delete device links"
  ON public.device_links FOR DELETE
  USING (
    public.has_any_role(auth.uid(), ARRAY['system_admin','admin','hardware_ops','contract_manager'])
  );

-- 4. Tighten driver_attribute_links policies
DROP POLICY IF EXISTS "Authenticated can insert driver attribute links" ON public.driver_attribute_links;
DROP POLICY IF EXISTS "Authenticated can update driver attribute links" ON public.driver_attribute_links;
DROP POLICY IF EXISTS "Authenticated can delete driver attribute links" ON public.driver_attribute_links;

CREATE POLICY "Authorized users can insert driver attribute links"
  ON public.driver_attribute_links FOR INSERT
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['system_admin','admin','contract_manager'])
  );
CREATE POLICY "Authorized users can update driver attribute links"
  ON public.driver_attribute_links FOR UPDATE
  USING (
    public.has_any_role(auth.uid(), ARRAY['system_admin','admin','contract_manager'])
  );
CREATE POLICY "Authorized users can delete driver attribute links"
  ON public.driver_attribute_links FOR DELETE
  USING (
    public.has_any_role(auth.uid(), ARRAY['system_admin','admin','contract_manager'])
  );

-- 5. Tighten driver_documents policies
DROP POLICY IF EXISTS "Authenticated can insert driver documents" ON public.driver_documents;
DROP POLICY IF EXISTS "Authenticated can update driver documents" ON public.driver_documents;
DROP POLICY IF EXISTS "Authenticated can delete driver documents" ON public.driver_documents;

CREATE POLICY "Authorized users can insert driver documents"
  ON public.driver_documents FOR INSERT
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['system_admin','admin','contract_manager'])
  );
CREATE POLICY "Authorized users can update driver documents"
  ON public.driver_documents FOR UPDATE
  USING (
    public.has_any_role(auth.uid(), ARRAY['system_admin','admin','contract_manager'])
  );
CREATE POLICY "Authorized users can delete driver documents"
  ON public.driver_documents FOR DELETE
  USING (
    public.has_any_role(auth.uid(), ARRAY['system_admin','admin','contract_manager'])
  );
