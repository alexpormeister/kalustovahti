
-- Add location fields to drivers
ALTER TABLE public.drivers ADD COLUMN province text;
ALTER TABLE public.drivers ADD COLUMN city text;

-- Add encrypted SSN (HETU) to drivers  
ALTER TABLE public.drivers ADD COLUMN ssn_encrypted text;

-- Create storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for driver documents
CREATE POLICY "Authenticated users can upload driver documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'driver-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view driver documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete driver documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'driver-documents' AND auth.uid() IS NOT NULL);

-- Create audit log for HETU views
CREATE TABLE IF NOT EXISTS public.ssn_view_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  viewed_by uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ssn_view_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can view SSN logs"
ON public.ssn_view_logs FOR SELECT
USING (public.has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "Authenticated can insert SSN view logs"
ON public.ssn_view_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update sample drivers with location data
UPDATE public.drivers SET province = 'Uusimaa', city = 'Helsinki' WHERE driver_number = 'K001';
UPDATE public.drivers SET province = 'Uusimaa', city = 'Espoo' WHERE driver_number = 'K002';
UPDATE public.drivers SET province = 'Uusimaa', city = 'Vantaa' WHERE driver_number = 'K003';
UPDATE public.drivers SET province = 'Pirkanmaa', city = 'Tampere' WHERE driver_number = 'K004';
UPDATE public.drivers SET province = 'Varsinais-Suomi', city = 'Turku' WHERE driver_number = 'K005';
UPDATE public.drivers SET province = 'Pohjois-Pohjanmaa', city = 'Oulu' WHERE driver_number = 'K006';
UPDATE public.drivers SET province = 'Lappi', city = 'Rovaniemi' WHERE driver_number = 'K007';
UPDATE public.drivers SET province = 'Päijät-Häme', city = 'Lahti' WHERE driver_number = 'K008';
UPDATE public.drivers SET province = 'Keski-Suomi', city = 'Jyväskylä' WHERE driver_number = 'K009';
UPDATE public.drivers SET province = 'Pohjois-Savo', city = 'Kuopio' WHERE driver_number = 'K010';
