
-- Create audit triggers for all key tables
CREATE TRIGGER audit_vehicles
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_drivers
  AFTER INSERT OR UPDATE OR DELETE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_hardware_devices
  AFTER INSERT OR UPDATE OR DELETE ON public.hardware_devices
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_fleets
  AFTER INSERT OR UPDATE OR DELETE ON public.fleets
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_vehicle_attributes
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_attributes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_driver_attributes
  AFTER INSERT OR UPDATE OR DELETE ON public.driver_attributes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_vehicle_attribute_links
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_attribute_links
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_driver_attribute_links
  AFTER INSERT OR UPDATE OR DELETE ON public.driver_attribute_links
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_vehicle_fleet_links
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_fleet_links
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_device_types
  AFTER INSERT OR UPDATE OR DELETE ON public.device_types
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_document_types
  AFTER INSERT OR UPDATE OR DELETE ON public.document_types
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_company_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.company_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_driver_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.driver_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_company_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.company_contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_quality_incidents
  AFTER INSERT OR UPDATE OR DELETE ON public.quality_incidents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_municipalities
  AFTER INSERT OR UPDATE OR DELETE ON public.municipalities
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

CREATE TRIGGER audit_role_page_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_page_permissions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();
