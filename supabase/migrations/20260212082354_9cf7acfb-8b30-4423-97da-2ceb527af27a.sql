
-- 1. Add permission-based SELECT policies for data tables
-- This allows any role with the correct page permission to view data

-- Companies: anyone with 'autoilijat' view permission can see
CREATE POLICY "Page permission users can view companies"
  ON public.companies FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'autoilijat') LIMIT 1) = true
  );

-- Vehicles: anyone with 'kalusto' view permission can see
CREATE POLICY "Page permission users can view vehicles"
  ON public.vehicles FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kalusto') LIMIT 1) = true
  );

-- Drivers: anyone with 'kuljettajat' view permission can see
CREATE POLICY "Page permission users can view drivers"
  ON public.drivers FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kuljettajat') LIMIT 1) = true
  );

-- Hardware: anyone with 'laitteet' view permission can see
CREATE POLICY "Page permission users can view hardware"
  ON public.hardware_devices FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'laitteet') LIMIT 1) = true
  );

-- Quality incidents: anyone with 'laadunvalvonta' view permission can see
CREATE POLICY "Page permission users can view quality incidents"
  ON public.quality_incidents FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'laadunvalvonta') LIMIT 1) = true
  );

-- Document types, company documents, driver documents
CREATE POLICY "Page permission users can view document types"
  ON public.document_types FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'dokumentit') LIMIT 1) = true
  );

CREATE POLICY "Page permission users can view company documents"
  ON public.company_documents FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'dokumentit') LIMIT 1) = true
  );

CREATE POLICY "Page permission users can view driver documents"
  ON public.driver_documents FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'dokumentit') LIMIT 1) = true
  );

-- Fleets
CREATE POLICY "Page permission users can view fleets"
  ON public.fleets FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kalusto') LIMIT 1) = true
  );

-- Vehicle/driver attributes and links
CREATE POLICY "Page permission users can view vehicle attributes"
  ON public.vehicle_attributes FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kalusto') LIMIT 1) = true
  );

CREATE POLICY "Page permission users can view driver attributes"
  ON public.driver_attributes FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kuljettajat') LIMIT 1) = true
  );

CREATE POLICY "Page permission users can view vehicle attribute links"
  ON public.vehicle_attribute_links FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kalusto') LIMIT 1) = true
  );

CREATE POLICY "Page permission users can view driver attribute links"
  ON public.driver_attribute_links FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kuljettajat') LIMIT 1) = true
  );

CREATE POLICY "Page permission users can view vehicle fleet links"
  ON public.vehicle_fleet_links FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kalusto') LIMIT 1) = true
  );

-- 2. Add raportit page_key to all roles that don't have it
INSERT INTO public.role_page_permissions (role_id, page_key, can_view, can_edit)
SELECT r.id, 'raportit', false, false
FROM public.roles r
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_page_permissions rpp
  WHERE rpp.role_id = r.id AND rpp.page_key = 'raportit'
);

-- 3. Add edit permission policies for users with page edit permissions
CREATE POLICY "Page permission users can edit companies"
  ON public.companies FOR ALL
  USING (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'autoilijat') LIMIT 1) = true
  )
  WITH CHECK (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'autoilijat') LIMIT 1) = true
  );

CREATE POLICY "Page permission users can edit vehicles"
  ON public.vehicles FOR ALL
  USING (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'kalusto') LIMIT 1) = true
  )
  WITH CHECK (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'kalusto') LIMIT 1) = true
  );

CREATE POLICY "Page permission users can edit drivers"
  ON public.drivers FOR ALL
  USING (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'kuljettajat') LIMIT 1) = true
  )
  WITH CHECK (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'kuljettajat') LIMIT 1) = true
  );

CREATE POLICY "Page permission users can edit hardware"
  ON public.hardware_devices FOR ALL
  USING (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'laitteet') LIMIT 1) = true
  )
  WITH CHECK (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'laitteet') LIMIT 1) = true
  );

CREATE POLICY "Page permission users can edit quality incidents"
  ON public.quality_incidents FOR ALL
  USING (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'laadunvalvonta') LIMIT 1) = true
  )
  WITH CHECK (
    (SELECT can_edit FROM public.get_user_page_permission(auth.uid(), 'laadunvalvonta') LIMIT 1) = true
  );
