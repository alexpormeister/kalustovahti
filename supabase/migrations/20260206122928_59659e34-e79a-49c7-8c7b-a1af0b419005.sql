-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'driver');

-- Create user_roles table for RBAC
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'driver',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    driver_number TEXT UNIQUE,
    driver_license_valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_id TEXT UNIQUE, -- Y-tunnus
    address TEXT,
    billing_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create company_members to link users to companies
CREATE TABLE public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (company_id, user_id)
);

-- Enable RLS on company_members
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Create vehicle_attributes table (dynamic attributes)
CREATE TABLE public.vehicle_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vehicle_attributes
ALTER TABLE public.vehicle_attributes ENABLE ROW LEVEL SECURITY;

-- Create vehicles table
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT NOT NULL UNIQUE,
    vehicle_number TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    assigned_driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    payment_terminal_id TEXT,
    meter_serial_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'removed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Create vehicle_attribute_links (many-to-many)
CREATE TABLE public.vehicle_attribute_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    attribute_id UUID REFERENCES public.vehicle_attributes(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (vehicle_id, attribute_id)
);

-- Enable RLS on vehicle_attribute_links
ALTER TABLE public.vehicle_attribute_links ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is member of a company
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Create function to get user's company IDs
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_members
  WHERE user_id = _user_id
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for companies
CREATE POLICY "Admins can manage all companies"
    ON public.companies FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their companies"
    ON public.companies FOR SELECT
    USING (id IN (SELECT public.get_user_company_ids(auth.uid())));

CREATE POLICY "Managers can update their companies"
    ON public.companies FOR UPDATE
    USING (id IN (SELECT public.get_user_company_ids(auth.uid())) AND public.has_role(auth.uid(), 'manager'));

-- RLS Policies for company_members
CREATE POLICY "Admins can manage all company members"
    ON public.company_members FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can manage members of their companies"
    ON public.company_members FOR ALL
    USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())) AND public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view their own membership"
    ON public.company_members FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for vehicles
CREATE POLICY "Admins can manage all vehicles"
    ON public.vehicles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can manage vehicles of their companies"
    ON public.vehicles FOR ALL
    USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())) AND public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Drivers can view their assigned vehicle"
    ON public.vehicles FOR SELECT
    USING (assigned_driver_id = auth.uid());

-- RLS Policies for vehicle_attributes
CREATE POLICY "Anyone authenticated can view attributes"
    ON public.vehicle_attributes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage attributes"
    ON public.vehicle_attributes FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for vehicle_attribute_links
CREATE POLICY "Authenticated users can view attribute links"
    ON public.vehicle_attribute_links FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage attribute links"
    ON public.vehicle_attribute_links FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can manage attribute links for their vehicles"
    ON public.vehicle_attribute_links FOR ALL
    USING (
        vehicle_id IN (
            SELECT v.id FROM public.vehicles v
            WHERE v.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        ) AND public.has_role(auth.uid(), 'manager')
    );

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Give new users driver role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'driver');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default vehicle attributes
INSERT INTO public.vehicle_attributes (name, description) VALUES
    ('Sähköauto', 'Täyssähköinen ajoneuvo'),
    ('Paarivarustus', 'Ajoneuvo varustettu paarit kuljetusta varten'),
    ('Invahissi', 'Pyörätuolihissi tai -luiska'),
    ('Lemmikkiystävällinen', 'Sallitaan lemmikkieläimet'),
    ('Premium', 'Luksusluokan ajoneuvo'),
    ('XL', 'Tilava ajoneuvo suurille ryhmille');