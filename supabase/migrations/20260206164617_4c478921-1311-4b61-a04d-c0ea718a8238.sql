-- Create separate drivers table for driver data (not users)
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  driver_license_valid_until DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_drivers_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger
CREATE TRIGGER drivers_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_change();

-- RLS Policies
CREATE POLICY "System admin full access to drivers"
ON public.drivers FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "Contract managers can manage drivers"
ON public.drivers FOR ALL
USING (has_role(auth.uid(), 'contract_manager'::app_role));

CREATE POLICY "Hardware ops can view drivers"
ON public.drivers FOR SELECT
USING (has_role(auth.uid(), 'hardware_ops'::app_role));

CREATE POLICY "Support can view drivers"
ON public.drivers FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

-- Update vehicles table to reference new drivers table
ALTER TABLE public.vehicles 
DROP CONSTRAINT IF EXISTS vehicles_assigned_driver_id_fkey;

ALTER TABLE public.vehicles
ADD CONSTRAINT vehicles_assigned_driver_id_fkey 
FOREIGN KEY (assigned_driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;

-- Update quality_incidents to reference new drivers table
ALTER TABLE public.quality_incidents 
DROP CONSTRAINT IF EXISTS quality_incidents_driver_id_fkey;

ALTER TABLE public.quality_incidents
ADD CONSTRAINT quality_incidents_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_drivers_company ON public.drivers(company_id);
CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_drivers_number ON public.drivers(driver_number);