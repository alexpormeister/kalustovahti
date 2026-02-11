
-- Device types (customizable by admin)
CREATE TABLE public.device_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  has_sim BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.device_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view device types" ON public.device_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert device types" ON public.device_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Admins can update device types" ON public.device_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Admins can delete device types" ON public.device_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- Seed default device types
INSERT INTO public.device_types (name, display_name, has_sim, sort_order) VALUES
('payment_terminal', 'Maksupääte', false, 1),
('sim_card', 'SIM-kortti', true, 2),
('tablet', 'Tabletti', true, 3),
('other', 'Muu laite', false, 4);

-- Device links (link devices together)
CREATE TABLE public.device_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_device_id UUID REFERENCES public.hardware_devices(id) ON DELETE CASCADE NOT NULL,
  target_device_id UUID REFERENCES public.hardware_devices(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_device_id, target_device_id),
  CHECK (source_device_id != target_device_id)
);

ALTER TABLE public.device_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view device links" ON public.device_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert device links" ON public.device_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update device links" ON public.device_links FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete device links" ON public.device_links FOR DELETE TO authenticated USING (true);

-- Driver documents
CREATE TABLE public.driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  document_type_id UUID REFERENCES public.document_types(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT DEFAULT 'application/pdf',
  valid_from DATE,
  valid_until DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view driver documents" ON public.driver_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert driver documents" ON public.driver_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update driver documents" ON public.driver_documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete driver documents" ON public.driver_documents FOR DELETE TO authenticated USING (true);

-- Driver attributes
CREATE TABLE public.driver_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.driver_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view driver attributes" ON public.driver_attributes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert driver attributes" ON public.driver_attributes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Admins can update driver attributes" ON public.driver_attributes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Admins can delete driver attributes" ON public.driver_attributes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- Driver attribute links
CREATE TABLE public.driver_attribute_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  attribute_id UUID REFERENCES public.driver_attributes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id, attribute_id)
);

ALTER TABLE public.driver_attribute_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view driver attribute links" ON public.driver_attribute_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert driver attribute links" ON public.driver_attribute_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update driver attribute links" ON public.driver_attribute_links FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete driver attribute links" ON public.driver_attribute_links FOR DELETE TO authenticated USING (true);

-- Add scope to document_types (company or driver)
ALTER TABLE public.document_types ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'company';

-- Add driver contract document type
INSERT INTO public.document_types (name, is_required, description, scope) 
VALUES ('Kuljettajasopimus', false, 'Kuljettajan henkilökohtainen sopimus', 'driver');

-- Triggers
CREATE TRIGGER update_device_types_updated_at BEFORE UPDATE ON public.device_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_driver_documents_updated_at BEFORE UPDATE ON public.driver_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
