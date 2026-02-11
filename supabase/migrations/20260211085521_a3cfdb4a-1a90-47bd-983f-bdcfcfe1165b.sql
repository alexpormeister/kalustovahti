
-- Create vehicle_fleet_links for many-to-many relationship
CREATE TABLE public.vehicle_fleet_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  fleet_id UUID NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, fleet_id)
);

ALTER TABLE public.vehicle_fleet_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view vehicle fleet links" ON public.vehicle_fleet_links FOR SELECT USING (true);
CREATE POLICY "Admin can manage vehicle fleet links" ON public.vehicle_fleet_links FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "Manager can manage vehicle fleet links" ON public.vehicle_fleet_links FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing fleet_id data to the new link table
INSERT INTO public.vehicle_fleet_links (vehicle_id, fleet_id)
SELECT id, fleet_id FROM public.vehicles WHERE fleet_id IS NOT NULL;

-- Remove seeded municipalities data
DELETE FROM public.municipalities;

-- Drop fleet_id column from vehicles (no longer needed with many-to-many)
ALTER TABLE public.vehicles DROP COLUMN fleet_id;
