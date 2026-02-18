
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
  new_json JSONB;
  old_json JSONB;
BEGIN
  new_json := to_jsonb(NEW);
  IF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    desc_text := CASE TG_TABLE_NAME
      WHEN 'drivers' THEN 'Kuljettaja #' || COALESCE(new_json->>'driver_number', '?') || ' (' || COALESCE(new_json->>'full_name', '?') || ') luotu'
      WHEN 'vehicles' THEN 'Auto #' || COALESCE(new_json->>'vehicle_number', '?') || ' (' || COALESCE(new_json->>'registration_number', '?') || ') luotu'
      WHEN 'companies' THEN 'Yritys "' || COALESCE(new_json->>'name', '?') || '" luotu'
      WHEN 'hardware_devices' THEN 'Laite ' || COALESCE(new_json->>'serial_number', '?') || ' (' || COALESCE(new_json->>'device_type', '?') || ') luotu'
      WHEN 'quality_incidents' THEN 'Laatupoikkeama luotu: ' || LEFT(COALESCE(new_json->>'description', '?'), 60)
      WHEN 'company_documents' THEN 'Yritysdokumentti lisätty: ' || COALESCE(new_json->>'file_name', '?')
      WHEN 'driver_documents' THEN 'Kuljettajadokumentti lisätty: ' || COALESCE(new_json->>'file_name', '?')
      WHEN 'document_types' THEN 'Dokumenttityyppi "' || COALESCE(new_json->>'name', '?') || '" luotu'
      WHEN 'device_types' THEN 'Laitetyyppi "' || COALESCE(new_json->>'display_name', new_json->>'name', '?') || '" luotu'
      WHEN 'fleets' THEN 'Fleet "' || COALESCE(new_json->>'name', '?') || '" luotu'
      WHEN 'municipalities' THEN 'Kunta "' || COALESCE(new_json->>'name', '?') || '" lisätty'
      WHEN 'vehicle_attributes' THEN 'Ajoneuvoattribuutti "' || COALESCE(new_json->>'name', '?') || '" luotu'
      WHEN 'driver_attributes' THEN 'Kuljettaja-attribuutti "' || COALESCE(new_json->>'name', '?') || '" luotu'
      WHEN 'company_attributes' THEN 'Autoilija-attribuutti "' || COALESCE(new_json->>'name', '?') || '" luotu'
      WHEN 'shared_attachments' THEN 'Jaettu liite "' || COALESCE(new_json->>'name', '?') || '" lisätty'
      WHEN 'roles' THEN 'Rooli "' || COALESCE(new_json->>'display_name', new_json->>'name', '?') || '" luotu'
      WHEN 'user_roles' THEN 'Käyttäjärooli "' || COALESCE(new_json->>'role', '?') || '" asetettu'
      WHEN 'vehicle_fleet_links' THEN 'Auto liitetty fleettiin'
      WHEN 'vehicle_attribute_links' THEN 'Attribuutti liitetty autoon'
      WHEN 'driver_attribute_links' THEN 'Attribuutti liitetty kuljettajaan'
      WHEN 'company_attribute_links' THEN 'Attribuutti liitetty autoilijaan'
      WHEN 'company_contracts' THEN 'Sopimus lisätty: ' || COALESCE(new_json->>'file_name', '?')
      WHEN 'device_links' THEN 'Laitelinkki luotu'
      ELSE 'Uusi tietue luotu tauluun ' || TG_TABLE_NAME
    END;
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, description)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'create', TG_TABLE_NAME, (new_json->>'id')::uuid, new_json, desc_text);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    changed_cols := ARRAY[]::TEXT[];
    FOR k IN SELECT key FROM jsonb_each(new_json)
    LOOP
      IF k NOT IN ('updated_at', 'created_at') AND
         (old_json ->> k IS DISTINCT FROM new_json ->> k) THEN
        changed_cols := array_append(changed_cols, k);
      END IF;
    END LOOP;
    
    desc_text := CASE TG_TABLE_NAME
      WHEN 'drivers' THEN 'Kuljettaja #' || COALESCE(new_json->>'driver_number', '?') || ' päivitetty'
      WHEN 'vehicles' THEN 'Auto #' || COALESCE(new_json->>'vehicle_number', '?') || ' (' || COALESCE(new_json->>'registration_number', '?') || ') päivitetty'
      WHEN 'companies' THEN 'Yritys "' || COALESCE(new_json->>'name', '?') || '" päivitetty'
      WHEN 'hardware_devices' THEN 'Laite ' || COALESCE(new_json->>'serial_number', '?') || ' päivitetty'
      WHEN 'quality_incidents' THEN 'Laatupoikkeama päivitetty: ' || LEFT(COALESCE(new_json->>'description', '?'), 40)
      WHEN 'company_documents' THEN 'Yritysdokumentti päivitetty: ' || COALESCE(new_json->>'file_name', '?')
      WHEN 'driver_documents' THEN 'Kuljettajadokumentti päivitetty: ' || COALESCE(new_json->>'file_name', '?')
      WHEN 'document_types' THEN 'Dokumenttityyppi "' || COALESCE(new_json->>'name', '?') || '" päivitetty'
      WHEN 'device_types' THEN 'Laitetyyppi "' || COALESCE(new_json->>'display_name', new_json->>'name', '?') || '" päivitetty'
      WHEN 'shared_attachments' THEN 'Jaettu liite "' || COALESCE(new_json->>'name', '?') || '" päivitetty'
      WHEN 'roles' THEN 'Rooli "' || COALESCE(new_json->>'display_name', '?') || '" päivitetty'
      WHEN 'profiles' THEN 'Profiili päivitetty'
      ELSE TG_TABLE_NAME || ' päivitetty'
    END;
    
    IF array_length(changed_cols, 1) > 0 THEN
      desc_text := desc_text || ' (' || array_to_string(changed_cols, ', ') || ')';
    END IF;
    
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data, description)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'update', TG_TABLE_NAME, (new_json->>'id')::uuid, old_json, new_json, desc_text);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    desc_text := CASE TG_TABLE_NAME
      WHEN 'drivers' THEN 'Kuljettaja #' || COALESCE(old_json->>'driver_number', '?') || ' (' || COALESCE(old_json->>'full_name', '?') || ') poistettu'
      WHEN 'vehicles' THEN 'Auto #' || COALESCE(old_json->>'vehicle_number', '?') || ' (' || COALESCE(old_json->>'registration_number', '?') || ') poistettu'
      WHEN 'companies' THEN 'Yritys "' || COALESCE(old_json->>'name', '?') || '" poistettu'
      WHEN 'hardware_devices' THEN 'Laite ' || COALESCE(old_json->>'serial_number', '?') || ' poistettu'
      WHEN 'quality_incidents' THEN 'Laatupoikkeama poistettu'
      WHEN 'company_documents' THEN 'Yritysdokumentti poistettu: ' || COALESCE(old_json->>'file_name', '?')
      WHEN 'driver_documents' THEN 'Kuljettajadokumentti poistettu: ' || COALESCE(old_json->>'file_name', '?')
      WHEN 'document_types' THEN 'Dokumenttityyppi "' || COALESCE(old_json->>'name', '?') || '" poistettu'
      WHEN 'shared_attachments' THEN 'Jaettu liite "' || COALESCE(old_json->>'name', '?') || '" poistettu'
      WHEN 'vehicle_attribute_links' THEN 'Attribuutti poistettu autolta'
      WHEN 'driver_attribute_links' THEN 'Attribuutti poistettu kuljettajalta'
      WHEN 'company_attribute_links' THEN 'Attribuutti poistettu autoilijalta'
      ELSE TG_TABLE_NAME || ' tietue poistettu'
    END;
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, description)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'delete', TG_TABLE_NAME, (old_json->>'id')::uuid, old_json, desc_text);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;
