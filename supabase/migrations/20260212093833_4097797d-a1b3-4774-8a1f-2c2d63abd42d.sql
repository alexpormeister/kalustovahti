-- Allow users with kayttajat page view permission to see all audit logs
CREATE POLICY "Users with kayttajat view can see audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    (SELECT can_view FROM public.get_user_page_permission(auth.uid(), 'kayttajat') LIMIT 1) = true
  );