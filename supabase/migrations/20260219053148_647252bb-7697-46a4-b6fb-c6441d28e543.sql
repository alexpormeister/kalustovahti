
-- Create api_keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  label TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{"read_drivers": true, "read_vehicles": true}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only system_admin can manage api_keys
CREATE POLICY "System admin can manage api keys"
ON public.api_keys
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::text))
WITH CHECK (has_role(auth.uid(), 'system_admin'::text));

-- Users with yllapito edit can manage api keys
CREATE POLICY "Yllapito edit can manage api keys"
ON public.api_keys
FOR ALL
USING ((SELECT get_user_page_permission.can_edit FROM get_user_page_permission(auth.uid(), 'yllapito'::text) LIMIT 1) = true)
WITH CHECK ((SELECT get_user_page_permission.can_edit FROM get_user_page_permission(auth.uid(), 'yllapito'::text) LIMIT 1) = true);

-- Add audit trigger
CREATE TRIGGER audit_api_keys
AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

-- Create hash function for API keys (uses pgcrypto)
CREATE OR REPLACE FUNCTION public.hash_api_key(plain_key TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'extensions'
AS $$
  SELECT encode(digest(plain_key, 'sha256'), 'hex')
$$;

-- Function to validate API key and return company_id (for edge function use)
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash TEXT)
RETURNS TABLE(api_key_id UUID, company_id UUID, permissions JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, company_id, permissions
  FROM public.api_keys
  WHERE key_hash = p_key_hash
$$;

-- Update last_used_at when API key is used
CREATE OR REPLACE FUNCTION public.touch_api_key(p_key_hash TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.api_keys SET last_used_at = now() WHERE key_hash = p_key_hash
$$;
