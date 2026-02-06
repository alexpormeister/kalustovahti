-- Hardware inventory table for payment terminals, SIM cards, tablets
CREATE TABLE public.hardware_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_type TEXT NOT NULL CHECK (device_type IN ('payment_terminal', 'sim_card', 'tablet', 'other')),
  serial_number TEXT NOT NULL,
  sim_number TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'installed', 'maintenance', 'decommissioned')),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit trail table for tracking changes
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contract attachments table for companies
CREATE TABLE public.company_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  contract_status TEXT NOT NULL DEFAULT 'active' CHECK (contract_status IN ('active', 'expired', 'pending', 'terminated')),
  valid_from DATE,
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add contact_person and contract_status to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'active' CHECK (contract_status IN ('active', 'expired', 'pending', 'terminated'));

-- Enable RLS on new tables
ALTER TABLE public.hardware_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_contracts ENABLE ROW LEVEL SECURITY;

-- Hardware devices policies
CREATE POLICY "Admins can manage all hardware" ON public.hardware_devices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view hardware of their companies" ON public.hardware_devices
  FOR SELECT USING (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
    OR vehicle_id IN (
      SELECT v.id FROM vehicles v WHERE v.company_id IN (SELECT get_user_company_ids(auth.uid()))
    )
  );

CREATE POLICY "Managers can manage hardware of their companies" ON public.hardware_devices
  FOR ALL USING (
    has_role(auth.uid(), 'manager'::app_role) AND (
      company_id IN (SELECT get_user_company_ids(auth.uid()))
      OR vehicle_id IN (
        SELECT v.id FROM vehicles v WHERE v.company_id IN (SELECT get_user_company_ids(auth.uid()))
      )
    )
  );

-- Audit logs policies (only admins and managers can view)
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view audit logs for their data" ON public.audit_logs
  FOR SELECT USING (
    has_role(auth.uid(), 'manager'::app_role) AND (
      table_name IN ('companies', 'vehicles', 'hardware_devices') AND
      record_id IN (
        SELECT id FROM companies WHERE id IN (SELECT get_user_company_ids(auth.uid()))
        UNION
        SELECT id FROM vehicles WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
        UNION
        SELECT id FROM hardware_devices WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
      )
    )
  );

-- Anyone authenticated can insert audit logs (for their actions)
CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Company contracts policies
CREATE POLICY "Admins can manage all contracts" ON public.company_contracts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view their company contracts" ON public.company_contracts
  FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Managers can manage their company contracts" ON public.company_contracts
  FOR ALL USING (
    has_role(auth.uid(), 'manager'::app_role) AND
    company_id IN (SELECT get_user_company_ids(auth.uid()))
  );

-- Add triggers for updated_at
CREATE TRIGGER update_hardware_devices_updated_at
  BEFORE UPDATE ON public.hardware_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_contracts_updated_at
  BEFORE UPDATE ON public.company_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit log function
CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, description)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), 'Uusi tietue luotu');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data, description)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), 'Tietue päivitetty');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, description)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), 'Tietue poistettu');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Add audit triggers to main tables
CREATE TRIGGER audit_companies_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_vehicles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_hardware_devices_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.hardware_devices
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();