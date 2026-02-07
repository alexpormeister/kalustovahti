-- Create document types table for required documents
CREATE TABLE public.document_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  validity_period_months INTEGER, -- How long the document is valid
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Policies for document_types
CREATE POLICY "Authenticated users can view document types"
  ON public.document_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System admin can manage document types"
  ON public.document_types FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "Contract managers can manage document types"
  ON public.document_types FOR ALL
  USING (has_role(auth.uid(), 'contract_manager'::app_role));

-- Create company documents table
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  valid_from DATE,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending', 'rejected')),
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by TEXT,
  signature_method TEXT, -- 'visma_sign', 'manual', etc.
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- Policies for company_documents
CREATE POLICY "System admin can manage all documents"
  ON public.company_documents FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "Contract managers can manage documents"
  ON public.company_documents FOR ALL
  USING (has_role(auth.uid(), 'contract_manager'::app_role));

CREATE POLICY "Managers can manage their company documents"
  ON public.company_documents FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role) 
    AND company_id IN (SELECT get_user_company_ids(auth.uid()))
  );

CREATE POLICY "Hardware and support can view documents"
  ON public.company_documents FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['hardware_ops'::app_role, 'support'::app_role]));

-- Insert default required document types
INSERT INTO public.document_types (name, description, is_required, validity_period_months) VALUES
  ('Autoilijasopimus', 'Taksikeskuksen ja autoilijan välinen sopimus', true, NULL),
  ('Vastuuvakuutus', 'Voimassa oleva vastuuvakuutustodistus', true, 12),
  ('YEL-todistus', 'Yrittäjän eläkevakuutustodistus', true, 12),
  ('Taksilupa', 'Voimassa oleva taksilupa', true, 60),
  ('Ajoneuvorekisteriote', 'Ajoneuvon rekisteröintitodistus', false, NULL),
  ('Katsastustodistus', 'Viimeisin katsastustodistus', false, 12);

-- Create storage bucket for company documents if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-documents', 
  'company-documents', 
  false, 
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company-documents bucket
CREATE POLICY "Authenticated users can view company documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Contract managers can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-documents' 
    AND has_any_role(auth.uid(), ARRAY['contract_manager'::app_role, 'system_admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Contract managers can update documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-documents' 
    AND has_any_role(auth.uid(), ARRAY['contract_manager'::app_role, 'system_admin'::app_role])
  );

CREATE POLICY "Contract managers can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-documents' 
    AND has_any_role(auth.uid(), ARRAY['contract_manager'::app_role, 'system_admin'::app_role])
  );

-- Trigger for updating updated_at
CREATE TRIGGER update_company_documents_updated_at
  BEFORE UPDATE ON public.company_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();