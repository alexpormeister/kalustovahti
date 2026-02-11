
-- Create fleets table
CREATE TABLE public.fleets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view fleets" ON public.fleets FOR SELECT USING (true);
CREATE POLICY "System admin can manage fleets" ON public.fleets FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "Contract managers can manage fleets" ON public.fleets FOR ALL USING (has_role(auth.uid(), 'contract_manager'::app_role));

-- Add fleet_id to vehicles
ALTER TABLE public.vehicles ADD COLUMN fleet_id UUID REFERENCES public.fleets(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_fleets_updated_at
  BEFORE UPDATE ON public.fleets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
