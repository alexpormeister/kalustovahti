-- Create enum for incident types
CREATE TYPE public.incident_type AS ENUM (
  'customer_complaint',
  'service_quality',
  'vehicle_condition',
  'driver_behavior',
  'safety_issue',
  'billing_issue',
  'other'
);

-- Create enum for incident status
CREATE TYPE public.incident_status AS ENUM (
  'new',
  'investigating',
  'resolved',
  'closed'
);

-- Create quality_incidents table
CREATE TABLE public.quality_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  incident_type incident_type NOT NULL,
  source TEXT,
  description TEXT NOT NULL,
  action_taken TEXT,
  status incident_status NOT NULL DEFAULT 'new',
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quality_incidents ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_quality_incidents_updated_at
BEFORE UPDATE ON public.quality_incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger
CREATE TRIGGER quality_incidents_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.quality_incidents
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_change();

-- RLS Policies
-- System admins can do everything
CREATE POLICY "System admin full access to quality incidents"
ON public.quality_incidents
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Contract managers can manage quality incidents
CREATE POLICY "Contract managers can manage quality incidents"
ON public.quality_incidents
FOR ALL
USING (has_role(auth.uid(), 'contract_manager'::app_role));

-- Hardware ops can view quality incidents
CREATE POLICY "Hardware ops can view quality incidents"
ON public.quality_incidents
FOR SELECT
USING (has_role(auth.uid(), 'hardware_ops'::app_role));

-- Support can view quality incidents
CREATE POLICY "Support can view quality incidents"
ON public.quality_incidents
FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));

-- Create index for faster queries
CREATE INDEX idx_quality_incidents_vehicle ON public.quality_incidents(vehicle_id);
CREATE INDEX idx_quality_incidents_driver ON public.quality_incidents(driver_id);
CREATE INDEX idx_quality_incidents_status ON public.quality_incidents(status);
CREATE INDEX idx_quality_incidents_date ON public.quality_incidents(incident_date);