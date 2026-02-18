
-- Linkitystaulut: mitkä jaetut liitteet on valittu kullekin kuljettajalle/yritykselle
CREATE TABLE public.driver_shared_attachment_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  shared_attachment_id UUID NOT NULL REFERENCES public.shared_attachments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_id, shared_attachment_id)
);

CREATE TABLE public.company_shared_attachment_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shared_attachment_id UUID NOT NULL REFERENCES public.shared_attachments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, shared_attachment_id)
);

-- RLS
ALTER TABLE public.driver_shared_attachment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_shared_attachment_links ENABLE ROW LEVEL SECURITY;

-- Driver links policies
CREATE POLICY "Authenticated can view driver shared attachment links" ON public.driver_shared_attachment_links FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can manage driver shared attachment links" ON public.driver_shared_attachment_links FOR ALL USING (has_any_role(auth.uid(), ARRAY['system_admin','admin','contract_manager']));
CREATE POLICY "Page permission users can manage driver shared attachment links" ON public.driver_shared_attachment_links FOR ALL USING ((SELECT can_edit FROM get_user_page_permission(auth.uid(), 'kuljettajat') LIMIT 1) = true) WITH CHECK ((SELECT can_edit FROM get_user_page_permission(auth.uid(), 'kuljettajat') LIMIT 1) = true);

-- Company links policies
CREATE POLICY "Authenticated can view company shared attachment links" ON public.company_shared_attachment_links FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can manage company shared attachment links" ON public.company_shared_attachment_links FOR ALL USING (has_any_role(auth.uid(), ARRAY['system_admin','admin','contract_manager']));
CREATE POLICY "Page permission users can manage company shared attachment links" ON public.company_shared_attachment_links FOR ALL USING ((SELECT can_edit FROM get_user_page_permission(auth.uid(), 'autoilijat') LIMIT 1) = true) WITH CHECK ((SELECT can_edit FROM get_user_page_permission(auth.uid(), 'autoilijat') LIMIT 1) = true);
