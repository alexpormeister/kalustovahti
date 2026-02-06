-- Add new enum values to existing enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'system_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'contract_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'hardware_ops';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support';