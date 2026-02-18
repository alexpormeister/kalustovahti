
-- Fix document permissions: Allow users with 'dokumentit' page edit permission to manage documents

-- Company documents: Add INSERT/UPDATE/DELETE for page permission users
CREATE POLICY "Page permission users can manage company documents"
  ON public.company_documents
  FOR ALL
  USING (
    (SELECT get_user_page_permission.can_edit
     FROM get_user_page_permission(auth.uid(), 'dokumentit'::text) get_user_page_permission(can_view, can_edit)
     LIMIT 1) = true
  )
  WITH CHECK (
    (SELECT get_user_page_permission.can_edit
     FROM get_user_page_permission(auth.uid(), 'dokumentit'::text) get_user_page_permission(can_view, can_edit)
     LIMIT 1) = true
  );

-- Driver documents: Add INSERT/UPDATE/DELETE for page permission users
CREATE POLICY "Page permission users can manage driver documents"
  ON public.driver_documents
  FOR ALL
  USING (
    (SELECT get_user_page_permission.can_edit
     FROM get_user_page_permission(auth.uid(), 'dokumentit'::text) get_user_page_permission(can_view, can_edit)
     LIMIT 1) = true
  )
  WITH CHECK (
    (SELECT get_user_page_permission.can_edit
     FROM get_user_page_permission(auth.uid(), 'dokumentit'::text) get_user_page_permission(can_view, can_edit)
     LIMIT 1) = true
  );

-- Storage: Allow page permission users to manage company-documents bucket
CREATE POLICY "Page permission users can upload company documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'company-documents' AND
    (SELECT get_user_page_permission.can_edit
     FROM public.get_user_page_permission(auth.uid(), 'dokumentit'::text) get_user_page_permission(can_view, can_edit)
     LIMIT 1) = true
  );

CREATE POLICY "Page permission users can view company documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'company-documents' AND
    (SELECT get_user_page_permission.can_view
     FROM public.get_user_page_permission(auth.uid(), 'dokumentit'::text) get_user_page_permission(can_view, can_edit)
     LIMIT 1) = true
  );

CREATE POLICY "Page permission users can delete company documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'company-documents' AND
    (SELECT get_user_page_permission.can_edit
     FROM public.get_user_page_permission(auth.uid(), 'dokumentit'::text) get_user_page_permission(can_view, can_edit)
     LIMIT 1) = true
  );

-- Storage: Allow page permission users to manage driver-documents bucket
CREATE POLICY "Page permission users can upload driver documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'driver-documents' AND
    (SELECT get_user_page_permission.can_edit
     FROM public.get_user_page_permission(auth.uid(), 'dokumentit'::text) get_user_page_permission(can_view, can_edit)
     LIMIT 1) = true
  );

CREATE POLICY "Page permission users can view driver documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'driver-documents' AND
    (SELECT get_user_page_permission.can_view
     FROM public.get_user_page_permission(auth.uid(), 'dokumentit'::text) get_user_page_permission(can_view, can_edit)
     LIMIT 1) = true
  );

CREATE POLICY "Page permission users can delete driver documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'driver-documents' AND
    (SELECT get_user_page_permission.can_edit
     FROM public.get_user_page_permission(auth.uid(), 'dokumentit'::text) get_user_page_permission(can_view, can_edit)
     LIMIT 1) = true
  );

-- Update get_driver_ssn to include more info in audit log (user name, driver number)
CREATE OR REPLACE FUNCTION public.get_driver_ssn(p_driver_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  encrypted_ssn text;
  result text;
  uid uuid;
  v_user_name text;
  v_driver_number text;
  v_driver_name text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  -- Get user name
  SELECT full_name INTO v_user_name FROM profiles WHERE id = uid;
  
  -- Get driver info
  SELECT driver_number, full_name INTO v_driver_number, v_driver_name FROM drivers WHERE id = p_driver_id;
  
  SELECT ssn_encrypted INTO encrypted_ssn FROM drivers WHERE id = p_driver_id;
  IF encrypted_ssn IS NULL OR encrypted_ssn = '' THEN RETURN NULL; END IF;
  result := decrypt_ssn(encrypted_ssn);
  
  INSERT INTO ssn_view_logs (driver_id, viewed_by) VALUES (p_driver_id, uid);
  INSERT INTO audit_logs (user_id, action, table_name, record_id, description, new_data)
  VALUES (uid, 'view_ssn', 'drivers', p_driver_id, 
    'HETU-tiedon katselu: ' || COALESCE(v_user_name, 'Tuntematon') || ' katsoi kuljettajan #' || COALESCE(v_driver_number, '?') || ' (' || COALESCE(v_driver_name, '?') || ') HETU-tiedon',
    jsonb_build_object('viewer_name', v_user_name, 'driver_number', v_driver_number, 'driver_name', v_driver_name));
  RETURN result;
END;
$function$;
