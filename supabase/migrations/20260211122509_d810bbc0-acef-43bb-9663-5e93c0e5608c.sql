-- Add yllapito and roolit page permissions for all existing roles that don't have them yet
INSERT INTO public.role_page_permissions (role_id, page_key, can_view, can_edit)
SELECT r.id, 'yllapito', false, false
FROM public.roles r
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_page_permissions rpp
  WHERE rpp.role_id = r.id AND rpp.page_key = 'yllapito'
);

INSERT INTO public.role_page_permissions (role_id, page_key, can_view, can_edit)
SELECT r.id, 'roolit', false, false
FROM public.roles r
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_page_permissions rpp
  WHERE rpp.role_id = r.id AND rpp.page_key = 'roolit'
);

-- Remove obsolete varustelu permissions
DELETE FROM public.role_page_permissions WHERE page_key = 'varustelu';