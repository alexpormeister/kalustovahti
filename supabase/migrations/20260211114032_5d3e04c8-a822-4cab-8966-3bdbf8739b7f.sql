-- Remove the static check constraint on device_type since device types are now dynamic
ALTER TABLE public.hardware_devices DROP CONSTRAINT IF EXISTS hardware_devices_device_type_check;