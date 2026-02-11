
-- The CASCADE already ran successfully and dropped the old functions + their dependent policies.
-- Now we just need to recreate the policies that were dropped.
-- Some policies survived because they didn't reference the old functions.
-- Use DROP IF EXISTS + CREATE to handle both cases.

-- hardware_devices: drop surviving policy, then recreate
DROP POLICY IF EXISTS "Managers can view hardware of their companies" ON public.hardware_devices;
CREATE POLICY "Managers can view hardware of their companies" ON public.hardware_devices FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())) OR vehicle_id IN (SELECT v.id FROM vehicles v WHERE v.company_id IN (SELECT get_user_company_ids(auth.uid()))));

-- companies: surviving policy
DROP POLICY IF EXISTS "Members can view their companies" ON public.companies;
CREATE POLICY "Members can view their companies" ON public.companies FOR SELECT USING (id IN (SELECT get_user_company_ids(auth.uid())));

-- company_contracts: surviving policy
DROP POLICY IF EXISTS "Managers can view their company contracts" ON public.company_contracts;
CREATE POLICY "Managers can view their company contracts" ON public.company_contracts FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- company_members: surviving policies
DROP POLICY IF EXISTS "Users can view own membership" ON public.company_members;
CREATE POLICY "Users can view own membership" ON public.company_members FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own membership" ON public.company_members;

-- user_roles: surviving policy
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- profiles: surviving policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- vehicles: surviving policy
DROP POLICY IF EXISTS "Drivers can view their assigned vehicle" ON public.vehicles;
CREATE POLICY "Drivers can view their assigned vehicle" ON public.vehicles FOR SELECT USING (assigned_driver_id = auth.uid());

-- Now recreate ALL the policies that were dropped by CASCADE

-- audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Contract managers can view audit logs" ON public.audit_logs;
CREATE POLICY "Contract managers can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "Managers can view audit logs for their data" ON public.audit_logs;
CREATE POLICY "Managers can view audit logs for their data" ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'manager') AND table_name = ANY(ARRAY['companies','vehicles','hardware_devices']) AND record_id IN (
  SELECT id FROM companies WHERE id IN (SELECT get_user_company_ids(auth.uid()))
  UNION SELECT id FROM vehicles WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  UNION SELECT id FROM hardware_devices WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
));
DROP POLICY IF EXISTS "System admin can view all audit logs" ON public.audit_logs;
CREATE POLICY "System admin can view all audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'system_admin'));

-- companies
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
CREATE POLICY "Admins can manage all companies" ON public.companies FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Contract managers can manage companies" ON public.companies;
CREATE POLICY "Contract managers can manage companies" ON public.companies FOR ALL USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "Hardware and support can view companies" ON public.companies;
CREATE POLICY "Hardware and support can view companies" ON public.companies FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['hardware_ops','support']));
DROP POLICY IF EXISTS "Managers can update their companies" ON public.companies;
CREATE POLICY "Managers can update their companies" ON public.companies FOR UPDATE USING (id IN (SELECT get_user_company_ids(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
DROP POLICY IF EXISTS "System admin can manage all companies" ON public.companies;
CREATE POLICY "System admin can manage all companies" ON public.companies FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- company_contracts
DROP POLICY IF EXISTS "Admins can manage all contracts" ON public.company_contracts;
CREATE POLICY "Admins can manage all contracts" ON public.company_contracts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Contract managers can manage contracts" ON public.company_contracts;
CREATE POLICY "Contract managers can manage contracts" ON public.company_contracts FOR ALL USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "Hardware and support can view contracts" ON public.company_contracts;
CREATE POLICY "Hardware and support can view contracts" ON public.company_contracts FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['hardware_ops','support']));
DROP POLICY IF EXISTS "Managers can manage their company contracts" ON public.company_contracts;
CREATE POLICY "Managers can manage their company contracts" ON public.company_contracts FOR ALL USING (public.has_role(auth.uid(), 'manager') AND company_id IN (SELECT get_user_company_ids(auth.uid())));
DROP POLICY IF EXISTS "System admin can manage contracts" ON public.company_contracts;
CREATE POLICY "System admin can manage contracts" ON public.company_contracts FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- company_documents
DROP POLICY IF EXISTS "Contract managers can manage documents" ON public.company_documents;
CREATE POLICY "Contract managers can manage documents" ON public.company_documents FOR ALL USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "Hardware and support can view documents" ON public.company_documents;
CREATE POLICY "Hardware and support can view documents" ON public.company_documents FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['hardware_ops','support']));
DROP POLICY IF EXISTS "Managers can manage their company documents" ON public.company_documents;
CREATE POLICY "Managers can manage their company documents" ON public.company_documents FOR ALL USING (public.has_role(auth.uid(), 'manager') AND company_id IN (SELECT get_user_company_ids(auth.uid())));
DROP POLICY IF EXISTS "System admin can manage all documents" ON public.company_documents;
CREATE POLICY "System admin can manage all documents" ON public.company_documents FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- company_members
DROP POLICY IF EXISTS "Admins can manage all company members" ON public.company_members;
CREATE POLICY "Admins can manage all company members" ON public.company_members FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Contract managers can manage company members" ON public.company_members;
CREATE POLICY "Contract managers can manage company members" ON public.company_members FOR ALL USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "Managers can manage members of their companies" ON public.company_members;
CREATE POLICY "Managers can manage members of their companies" ON public.company_members FOR ALL USING (company_id IN (SELECT get_user_company_ids(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
DROP POLICY IF EXISTS "System admin can manage company members" ON public.company_members;
CREATE POLICY "System admin can manage company members" ON public.company_members FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- device_types
DROP POLICY IF EXISTS "Admins can delete device types" ON public.device_types;
CREATE POLICY "Admins can delete device types" ON public.device_types FOR DELETE USING (public.has_role(auth.uid(), 'system_admin'));
DROP POLICY IF EXISTS "Admins can insert device types" ON public.device_types;
CREATE POLICY "Admins can insert device types" ON public.device_types FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'system_admin'));
DROP POLICY IF EXISTS "Admins can update device types" ON public.device_types;
CREATE POLICY "Admins can update device types" ON public.device_types FOR UPDATE USING (public.has_role(auth.uid(), 'system_admin'));

-- driver_attributes
DROP POLICY IF EXISTS "Admins can delete driver attributes" ON public.driver_attributes;
CREATE POLICY "Admins can delete driver attributes" ON public.driver_attributes FOR DELETE USING (public.has_role(auth.uid(), 'system_admin'));
DROP POLICY IF EXISTS "Admins can insert driver attributes" ON public.driver_attributes;
CREATE POLICY "Admins can insert driver attributes" ON public.driver_attributes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'system_admin'));
DROP POLICY IF EXISTS "Admins can update driver attributes" ON public.driver_attributes;
CREATE POLICY "Admins can update driver attributes" ON public.driver_attributes FOR UPDATE USING (public.has_role(auth.uid(), 'system_admin'));

-- drivers
DROP POLICY IF EXISTS "Contract managers can manage drivers" ON public.drivers;
CREATE POLICY "Contract managers can manage drivers" ON public.drivers FOR ALL USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "Hardware ops can view drivers basic info" ON public.drivers;
CREATE POLICY "Hardware ops can view drivers basic info" ON public.drivers FOR SELECT USING (public.has_role(auth.uid(), 'hardware_ops'));
DROP POLICY IF EXISTS "Support can view drivers basic info" ON public.drivers;
CREATE POLICY "Support can view drivers basic info" ON public.drivers FOR SELECT USING (public.has_role(auth.uid(), 'support'));
DROP POLICY IF EXISTS "System admin full access to drivers" ON public.drivers;
CREATE POLICY "System admin full access to drivers" ON public.drivers FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- hardware_devices
DROP POLICY IF EXISTS "Admins can manage all hardware" ON public.hardware_devices;
CREATE POLICY "Admins can manage all hardware" ON public.hardware_devices FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Contract managers and support can view hardware" ON public.hardware_devices;
CREATE POLICY "Contract managers and support can view hardware" ON public.hardware_devices FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['contract_manager','support']));
DROP POLICY IF EXISTS "Hardware ops can manage hardware" ON public.hardware_devices;
CREATE POLICY "Hardware ops can manage hardware" ON public.hardware_devices FOR ALL USING (public.has_role(auth.uid(), 'hardware_ops'));
DROP POLICY IF EXISTS "Managers can manage hardware of their companies" ON public.hardware_devices;
CREATE POLICY "Managers can manage hardware of their companies" ON public.hardware_devices FOR ALL USING (public.has_role(auth.uid(), 'manager') AND (company_id IN (SELECT get_user_company_ids(auth.uid())) OR vehicle_id IN (SELECT v.id FROM vehicles v WHERE v.company_id IN (SELECT get_user_company_ids(auth.uid())))));
DROP POLICY IF EXISTS "System admin can manage all hardware" ON public.hardware_devices;
CREATE POLICY "System admin can manage all hardware" ON public.hardware_devices FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "System admin can manage all profiles" ON public.profiles;
CREATE POLICY "System admin can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- quality_incidents
DROP POLICY IF EXISTS "Contract managers can manage quality incidents" ON public.quality_incidents;
CREATE POLICY "Contract managers can manage quality incidents" ON public.quality_incidents FOR ALL USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "Hardware ops can view quality incidents" ON public.quality_incidents;
CREATE POLICY "Hardware ops can view quality incidents" ON public.quality_incidents FOR SELECT USING (public.has_role(auth.uid(), 'hardware_ops'));
DROP POLICY IF EXISTS "Support can view quality incidents" ON public.quality_incidents;
CREATE POLICY "Support can view quality incidents" ON public.quality_incidents FOR SELECT USING (public.has_role(auth.uid(), 'support'));
DROP POLICY IF EXISTS "System admin full access to quality incidents" ON public.quality_incidents;
CREATE POLICY "System admin full access to quality incidents" ON public.quality_incidents FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- role_page_permissions
DROP POLICY IF EXISTS "System admin can manage page permissions" ON public.role_page_permissions;
CREATE POLICY "System admin can manage page permissions" ON public.role_page_permissions FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- roles
DROP POLICY IF EXISTS "System admin can manage roles" ON public.roles;
CREATE POLICY "System admin can manage roles" ON public.roles FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "System admin can manage all roles" ON public.user_roles;
CREATE POLICY "System admin can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- vehicle_attribute_links
DROP POLICY IF EXISTS "Admins can manage attribute links" ON public.vehicle_attribute_links;
CREATE POLICY "Admins can manage attribute links" ON public.vehicle_attribute_links FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Contract managers can manage attribute links" ON public.vehicle_attribute_links;
CREATE POLICY "Contract managers can manage attribute links" ON public.vehicle_attribute_links FOR ALL USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "Hardware and support can view attribute links" ON public.vehicle_attribute_links;
CREATE POLICY "Hardware and support can view attribute links" ON public.vehicle_attribute_links FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['hardware_ops','support']));
DROP POLICY IF EXISTS "Managers can manage attribute links for their vehicles" ON public.vehicle_attribute_links;
CREATE POLICY "Managers can manage attribute links for their vehicles" ON public.vehicle_attribute_links FOR ALL USING (vehicle_id IN (SELECT v.id FROM vehicles v WHERE v.company_id IN (SELECT get_user_company_ids(auth.uid()))) AND public.has_role(auth.uid(), 'manager'));
DROP POLICY IF EXISTS "System admin can manage attribute links" ON public.vehicle_attribute_links;
CREATE POLICY "System admin can manage attribute links" ON public.vehicle_attribute_links FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- vehicle_attributes
DROP POLICY IF EXISTS "Admins can manage attributes" ON public.vehicle_attributes;
CREATE POLICY "Admins can manage attributes" ON public.vehicle_attributes FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "System admin can manage attributes" ON public.vehicle_attributes;
CREATE POLICY "System admin can manage attributes" ON public.vehicle_attributes FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- vehicle_fleet_links
DROP POLICY IF EXISTS "Admin can manage vehicle fleet links" ON public.vehicle_fleet_links;
CREATE POLICY "Admin can manage vehicle fleet links" ON public.vehicle_fleet_links FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));
DROP POLICY IF EXISTS "Manager can manage vehicle fleet links" ON public.vehicle_fleet_links;
CREATE POLICY "Manager can manage vehicle fleet links" ON public.vehicle_fleet_links FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- vehicles
DROP POLICY IF EXISTS "Admins can manage all vehicles" ON public.vehicles;
CREATE POLICY "Admins can manage all vehicles" ON public.vehicles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Contract managers can manage vehicles" ON public.vehicles;
CREATE POLICY "Contract managers can manage vehicles" ON public.vehicles FOR ALL USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "Hardware and support can view vehicles" ON public.vehicles;
CREATE POLICY "Hardware and support can view vehicles" ON public.vehicles FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['hardware_ops','support']));
DROP POLICY IF EXISTS "Managers can manage vehicles of their companies" ON public.vehicles;
CREATE POLICY "Managers can manage vehicles of their companies" ON public.vehicles FOR ALL USING (company_id IN (SELECT get_user_company_ids(auth.uid())) AND public.has_role(auth.uid(), 'manager'));
DROP POLICY IF EXISTS "System admin can manage all vehicles" ON public.vehicles;
CREATE POLICY "System admin can manage all vehicles" ON public.vehicles FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- fleets
DROP POLICY IF EXISTS "Contract managers can manage fleets" ON public.fleets;
CREATE POLICY "Contract managers can manage fleets" ON public.fleets FOR ALL USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "System admin can manage fleets" ON public.fleets;
CREATE POLICY "System admin can manage fleets" ON public.fleets FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- municipalities
DROP POLICY IF EXISTS "System admin can manage municipalities" ON public.municipalities;
CREATE POLICY "System admin can manage municipalities" ON public.municipalities FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- document_types
DROP POLICY IF EXISTS "Contract managers can manage document types" ON public.document_types;
CREATE POLICY "Contract managers can manage document types" ON public.document_types FOR ALL USING (public.has_role(auth.uid(), 'contract_manager'));
DROP POLICY IF EXISTS "System admin can manage document types" ON public.document_types;
CREATE POLICY "System admin can manage document types" ON public.document_types FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- ssn_view_logs
DROP POLICY IF EXISTS "System admins can view SSN logs" ON public.ssn_view_logs;
CREATE POLICY "System admins can view SSN logs" ON public.ssn_view_logs FOR SELECT USING (public.has_role(auth.uid(), 'system_admin'));

-- storage.objects
DROP POLICY IF EXISTS "System admin can delete driver documents" ON storage.objects;
CREATE POLICY "System admin can delete driver documents" ON storage.objects FOR DELETE USING (bucket_id = 'driver-documents' AND public.has_role(auth.uid(), 'system_admin'));
DROP POLICY IF EXISTS "Contract managers can upload documents" ON storage.objects;
CREATE POLICY "Contract managers can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-documents' AND public.has_any_role(auth.uid(), ARRAY['system_admin','contract_manager']));
DROP POLICY IF EXISTS "Contract managers can update documents" ON storage.objects;
CREATE POLICY "Contract managers can update documents" ON storage.objects FOR UPDATE USING (bucket_id = 'company-documents' AND public.has_any_role(auth.uid(), ARRAY['system_admin','contract_manager']));
DROP POLICY IF EXISTS "Contract managers can delete documents" ON storage.objects;
CREATE POLICY "Contract managers can delete documents" ON storage.objects FOR DELETE USING (bucket_id = 'company-documents' AND public.has_any_role(auth.uid(), ARRAY['system_admin','contract_manager']));
DROP POLICY IF EXISTS "Authorized roles can view driver documents" ON storage.objects;
CREATE POLICY "Authorized roles can view driver documents" ON storage.objects FOR SELECT USING (bucket_id = 'driver-documents' AND public.has_any_role(auth.uid(), ARRAY['system_admin','contract_manager','hardware_ops','support']));
DROP POLICY IF EXISTS "Authorized roles can upload driver documents" ON storage.objects;
CREATE POLICY "Authorized roles can upload driver documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'driver-documents' AND public.has_any_role(auth.uid(), ARRAY['system_admin','contract_manager']));
