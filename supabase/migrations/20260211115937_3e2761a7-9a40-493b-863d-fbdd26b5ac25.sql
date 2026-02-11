-- Add updated_at triggers only where missing (use IF NOT EXISTS pattern with DROP IF EXISTS)
DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hardware_devices_updated_at ON public.hardware_devices;
CREATE TRIGGER update_hardware_devices_updated_at BEFORE UPDATE ON public.hardware_devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();