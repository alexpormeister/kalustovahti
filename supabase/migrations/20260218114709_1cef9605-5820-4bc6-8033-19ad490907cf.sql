
-- 1. Company attributes table (like vehicle_attributes / driver_attributes)
CREATE TABLE public.company_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view company attributes" ON public.company_attributes FOR SELECT USING (true);
CREATE POLICY "System admin can manage company attributes" ON public.company_attributes FOR ALL USING (has_role(auth.uid(), 'system_admin'::text));
CREATE POLICY "Admins can manage company attributes" ON public.company_attributes FOR ALL USING (has_role(auth.uid(), 'admin'::text));

-- 2. Company attribute links table
CREATE TABLE public.company_attribute_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.company_attributes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, attribute_id)
);

ALTER TABLE public.company_attribute_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view company attribute links" ON public.company_attribute_links FOR SELECT USING (true);
CREATE POLICY "System admin can manage company attribute links" ON public.company_attribute_links FOR ALL USING (has_role(auth.uid(), 'system_admin'::text));
CREATE POLICY "Admins can manage company attribute links" ON public.company_attribute_links FOR ALL USING (has_role(auth.uid(), 'admin'::text));
CREATE POLICY "Contract managers can manage company attribute links" ON public.company_attribute_links FOR ALL USING (has_role(auth.uid(), 'contract_manager'::text));
CREATE POLICY "Page permission users can manage company attribute links" ON public.company_attribute_links FOR ALL 
  USING ((SELECT can_edit FROM get_user_page_permission(auth.uid(), 'autoilijat') LIMIT 1) = true)
  WITH CHECK ((SELECT can_edit FROM get_user_page_permission(auth.uid(), 'autoilijat') LIMIT 1) = true);

-- 3. Shared attachments table (admin-managed template files)
CREATE TABLE public.shared_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  scope TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID
);

ALTER TABLE public.shared_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view shared attachments" ON public.shared_attachments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System admin can manage shared attachments" ON public.shared_attachments FOR ALL USING (has_role(auth.uid(), 'system_admin'::text));

-- 4. Storage bucket for shared attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('shared-attachments', 'shared-attachments', false);

CREATE POLICY "Authenticated can view shared attachment files" ON storage.objects FOR SELECT USING (bucket_id = 'shared-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "System admin can manage shared attachment files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shared-attachments' AND public.has_role(auth.uid(), 'system_admin'::text));
CREATE POLICY "System admin can delete shared attachment files" ON storage.objects FOR DELETE USING (bucket_id = 'shared-attachments' AND public.has_role(auth.uid(), 'system_admin'::text));

-- 5. Add audit triggers for new tables
CREATE TRIGGER audit_company_attributes AFTER INSERT OR UPDATE OR DELETE ON public.company_attributes FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();
CREATE TRIGGER audit_company_attribute_links AFTER INSERT OR UPDATE OR DELETE ON public.company_attribute_links FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();
CREATE TRIGGER audit_shared_attachments AFTER INSERT OR UPDATE OR DELETE ON public.shared_attachments FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

-- 6. Improved audit log trigger with meaningful descriptions
CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  desc_text TEXT;
  changed_cols TEXT[];
  k TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Build a meaningful creation description
    desc_text := CASE TG_TABLE_NAME
      WHEN 'drivers' THEN 'Kuljettaja #' || COALESCE(NEW.driver_number, '?') || ' (' || COALESCE(NEW.full_name, '?') || ') luotu'
      WHEN 'vehicles' THEN 'Auto #' || COALESCE(NEW.vehicle_number, '?') || ' (' || COALESCE(NEW.registration_number, '?') || ') luotu'
      WHEN 'companies' THEN 'Yritys "' || COALESCE(NEW.name, '?') || '" luotu'
      WHEN 'hardware_devices' THEN 'Laite ' || COALESCE(NEW.serial_number, '?') || ' (' || COALESCE(NEW.device_type, '?') || ') luotu'
      WHEN 'quality_incidents' THEN 'Laatupoikkeama luotu: ' || LEFT(COALESCE(NEW.description, '?'), 60)
      WHEN 'company_documents' THEN 'Yritysdokumentti lisätty: ' || COALESCE(NEW.file_name, '?')
      WHEN 'driver_documents' THEN 'Kuljettajadokumentti lisätty: ' || COALESCE(NEW.file_name, '?')
      WHEN 'document_types' THEN 'Dokumenttityyppi "' || COALESCE(NEW.name, '?') || '" luotu'
      WHEN 'device_types' THEN 'Laitetyyppi "' || COALESCE(NEW.display_name, NEW.name, '?') || '" luotu'
      WHEN 'fleets' THEN 'Fleet "' || COALESCE(NEW.name, '?') || '" luotu'
      WHEN 'municipalities' THEN 'Kunta "' || COALESCE(NEW.name, '?') || '" lisätty'
      WHEN 'vehicle_attributes' THEN 'Ajoneuvoattribuutti "' || COALESCE(NEW.name, '?') || '" luotu'
      WHEN 'driver_attributes' THEN 'Kuljettaja-attribuutti "' || COALESCE(NEW.name, '?') || '" luotu'
      WHEN 'company_attributes' THEN 'Autoilija-attribuutti "' || COALESCE(NEW.name, '?') || '" luotu'
      WHEN 'shared_attachments' THEN 'Jaettu liite "' || COALESCE(NEW.name, '?') || '" lisätty'
      WHEN 'roles' THEN 'Rooli "' || COALESCE(NEW.display_name, NEW.name, '?') || '" luotu'
      WHEN 'user_roles' THEN 'Käyttäjärooli "' || COALESCE(NEW.role, '?') || '" asetettu'
      WHEN 'vehicle_fleet_links' THEN 'Auto liitetty fleettiin'
      WHEN 'vehicle_attribute_links' THEN 'Attribuutti liitetty autoon'
      WHEN 'driver_attribute_links' THEN 'Attribuutti liitetty kuljettajaan'
      WHEN 'company_attribute_links' THEN 'Attribuutti liitetty autoilijaan'
      WHEN 'company_contracts' THEN 'Sopimus lisätty: ' || COALESCE(NEW.file_name, '?')
      WHEN 'device_links' THEN 'Laitelinkki luotu'
      ELSE 'Uusi tietue luotu tauluun ' || TG_TABLE_NAME
    END;
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, description)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), desc_text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Find changed columns
    changed_cols := ARRAY[]::TEXT[];
    FOR k IN SELECT key FROM jsonb_each(to_jsonb(NEW))
    LOOP
      IF k NOT IN ('updated_at', 'created_at') AND
         (to_jsonb(OLD) ->> k IS DISTINCT FROM to_jsonb(NEW) ->> k) THEN
        changed_cols := array_append(changed_cols, k);
      END IF;
    END LOOP;
    
    desc_text := CASE TG_TABLE_NAME
      WHEN 'drivers' THEN 'Kuljettaja #' || COALESCE(NEW.driver_number, '?') || ' päivitetty'
      WHEN 'vehicles' THEN 'Auto #' || COALESCE(NEW.vehicle_number, '?') || ' (' || COALESCE(NEW.registration_number, '?') || ') päivitetty'
      WHEN 'companies' THEN 'Yritys "' || COALESCE(NEW.name, '?') || '" päivitetty'
      WHEN 'hardware_devices' THEN 'Laite ' || COALESCE(NEW.serial_number, '?') || ' päivitetty'
      WHEN 'quality_incidents' THEN 'Laatupoikkeama päivitetty: ' || LEFT(COALESCE(NEW.description, '?'), 40)
      WHEN 'company_documents' THEN 'Yritysdokumentti päivitetty: ' || COALESCE(NEW.file_name, '?')
      WHEN 'driver_documents' THEN 'Kuljettajadokumentti päivitetty: ' || COALESCE(NEW.file_name, '?')
      WHEN 'document_types' THEN 'Dokumenttityyppi "' || COALESCE(NEW.name, '?') || '" päivitetty'
      WHEN 'device_types' THEN 'Laitetyyppi "' || COALESCE(NEW.display_name, NEW.name, '?') || '" päivitetty'
      WHEN 'roles' THEN 'Rooli "' || COALESCE(NEW.display_name, '?') || '" päivitetty'
      WHEN 'profiles' THEN 'Profiili päivitetty'
      ELSE TG_TABLE_NAME || ' päivitetty'
    END;
    
    IF array_length(changed_cols, 1) > 0 THEN
      desc_text := desc_text || ' (' || array_to_string(changed_cols, ', ') || ')';
    END IF;
    
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data, description)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), desc_text);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    desc_text := CASE TG_TABLE_NAME
      WHEN 'drivers' THEN 'Kuljettaja #' || COALESCE(OLD.driver_number, '?') || ' (' || COALESCE(OLD.full_name, '?') || ') poistettu'
      WHEN 'vehicles' THEN 'Auto #' || COALESCE(OLD.vehicle_number, '?') || ' (' || COALESCE(OLD.registration_number, '?') || ') poistettu'
      WHEN 'companies' THEN 'Yritys "' || COALESCE(OLD.name, '?') || '" poistettu'
      WHEN 'hardware_devices' THEN 'Laite ' || COALESCE(OLD.serial_number, '?') || ' poistettu'
      WHEN 'quality_incidents' THEN 'Laatupoikkeama poistettu'
      WHEN 'company_documents' THEN 'Yritysdokumentti poistettu: ' || COALESCE(OLD.file_name, '?')
      WHEN 'driver_documents' THEN 'Kuljettajadokumentti poistettu: ' || COALESCE(OLD.file_name, '?')
      WHEN 'document_types' THEN 'Dokumenttityyppi "' || COALESCE(OLD.name, '?') || '" poistettu'
      WHEN 'vehicle_attribute_links' THEN 'Attribuutti poistettu autolta'
      WHEN 'driver_attribute_links' THEN 'Attribuutti poistettu kuljettajalta'
      WHEN 'company_attribute_links' THEN 'Attribuutti poistettu autoilijalta'
      WHEN 'shared_attachments' THEN 'Jaettu liite "' || COALESCE(OLD.name, '?') || '" poistettu'
      ELSE TG_TABLE_NAME || ' tietue poistettu'
    END;
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, description)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), desc_text);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;
