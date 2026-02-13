
-- Encryption key storage
CREATE TABLE IF NOT EXISTS public._encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value text NOT NULL
);
ALTER TABLE public._encryption_keys ENABLE ROW LEVEL SECURITY;

INSERT INTO public._encryption_keys (key_name, key_value) 
VALUES ('ssn_key', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key_name) DO NOTHING;

-- Encrypt function using extensions schema
CREATE OR REPLACE FUNCTION public.encrypt_ssn(plaintext text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE k text;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN RETURN plaintext; END IF;
  SELECT key_value INTO k FROM public._encryption_keys WHERE key_name = 'ssn_key';
  RETURN encode(pgp_sym_encrypt(plaintext, k), 'base64');
END;
$$;

-- Decrypt function
CREATE OR REPLACE FUNCTION public.decrypt_ssn(encrypted text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE k text;
BEGIN
  IF encrypted IS NULL OR encrypted = '' THEN RETURN encrypted; END IF;
  SELECT key_value INTO k FROM public._encryption_keys WHERE key_name = 'ssn_key';
  RETURN pgp_sym_decrypt(decode(encrypted, 'base64'), k);
EXCEPTION WHEN OTHERS THEN RETURN encrypted;
END;
$$;

-- Public: get decrypted SSN with auth + logging
CREATE OR REPLACE FUNCTION public.get_driver_ssn(p_driver_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  encrypted_ssn text;
  result text;
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT ssn_encrypted INTO encrypted_ssn FROM drivers WHERE id = p_driver_id;
  IF encrypted_ssn IS NULL OR encrypted_ssn = '' THEN RETURN NULL; END IF;
  result := decrypt_ssn(encrypted_ssn);
  INSERT INTO ssn_view_logs (driver_id, viewed_by) VALUES (p_driver_id, uid);
  INSERT INTO audit_logs (user_id, action, table_name, record_id, description)
  VALUES (uid, 'view_ssn', 'drivers', p_driver_id, 'HETU-tiedon katselu');
  RETURN result;
END;
$$;

-- Revoke internal functions from regular users
REVOKE EXECUTE ON FUNCTION public.encrypt_ssn FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_ssn FROM anon, authenticated;

-- Auto-encrypt trigger
CREATE OR REPLACE FUNCTION public.auto_encrypt_ssn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NEW.ssn_encrypted IS NOT NULL AND NEW.ssn_encrypted != '' AND length(NEW.ssn_encrypted) < 30 THEN
    NEW.ssn_encrypted := public.encrypt_ssn(NEW.ssn_encrypted);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_ssn_trigger ON public.drivers;
CREATE TRIGGER encrypt_ssn_trigger BEFORE INSERT OR UPDATE OF ssn_encrypted ON public.drivers
FOR EACH ROW EXECUTE FUNCTION auto_encrypt_ssn();

-- Encrypt existing plaintext
UPDATE public.drivers SET ssn_encrypted = public.encrypt_ssn(ssn_encrypted)
WHERE ssn_encrypted IS NOT NULL AND ssn_encrypted != '' AND length(ssn_encrypted) < 30;

-- Fix role permissions for non-admin users
CREATE POLICY "Users with roolit edit can manage page permissions"
  ON public.role_page_permissions FOR ALL
  USING ((SELECT can_edit FROM get_user_page_permission(auth.uid(), 'roolit') LIMIT 1) = true)
  WITH CHECK ((SELECT can_edit FROM get_user_page_permission(auth.uid(), 'roolit') LIMIT 1) = true);

CREATE POLICY "Users with roolit edit can manage roles"
  ON public.roles FOR ALL
  USING ((SELECT can_edit FROM get_user_page_permission(auth.uid(), 'roolit') LIMIT 1) = true)
  WITH CHECK ((SELECT can_edit FROM get_user_page_permission(auth.uid(), 'roolit') LIMIT 1) = true);
