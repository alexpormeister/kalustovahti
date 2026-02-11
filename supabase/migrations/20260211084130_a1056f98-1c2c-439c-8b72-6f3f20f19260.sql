
-- Create municipalities table
CREATE TABLE public.municipalities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  province TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view municipalities" ON public.municipalities FOR SELECT USING (true);
CREATE POLICY "System admin can manage municipalities" ON public.municipalities FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Seed with common Finnish municipalities
INSERT INTO public.municipalities (name, province) VALUES
  ('Helsinki', 'Uusimaa'), ('Espoo', 'Uusimaa'), ('Vantaa', 'Uusimaa'),
  ('Tampere', 'Pirkanmaa'), ('Turku', 'Varsinais-Suomi'), ('Oulu', 'Pohjois-Pohjanmaa'),
  ('Rovaniemi', 'Lappi'), ('Lahti', 'Päijät-Häme'), ('Jyväskylä', 'Keski-Suomi'),
  ('Kuopio', 'Pohjois-Savo'), ('Joensuu', 'Pohjois-Karjala'), ('Pori', 'Satakunta'),
  ('Hämeenlinna', 'Kanta-Häme'), ('Vaasa', 'Pohjanmaa'), ('Seinäjoki', 'Etelä-Pohjanmaa'),
  ('Kokkola', 'Keski-Pohjanmaa'), ('Kajaani', 'Kainuu'), ('Mikkeli', 'Etelä-Savo'),
  ('Kouvola', 'Kymenlaakso'), ('Lappeenranta', 'Etelä-Karjala');

-- Add city to vehicles
ALTER TABLE public.vehicles ADD COLUMN city TEXT;
