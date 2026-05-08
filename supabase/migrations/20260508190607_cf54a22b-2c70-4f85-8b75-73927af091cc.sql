-- Update the process number generation function to handle instances
CREATE OR REPLACE FUNCTION public.generate_processo_numero()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.instancia = 2 THEN
    -- 2nd instance processes usually end in .0000 (Tribunal)
    NEW.numero := LPAD(nextval('processo_numero_seq')::TEXT, 7, '0') || '-' || 
                  EXTRACT(YEAR FROM now())::TEXT || '.8.26.0000';
  ELSE
    -- 1st instance processes end in .0001 (Comarca da Capital)
    NEW.numero := LPAD(nextval('processo_numero_seq')::TEXT, 7, '0') || '-' || 
                  EXTRACT(YEAR FROM now())::TEXT || '.8.26.0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add custom party labels to the processos table
ALTER TABLE public.processos 
ADD COLUMN IF NOT EXISTS autor_label TEXT DEFAULT 'Autor',
ADD COLUMN IF NOT EXISTS reu_label TEXT DEFAULT 'Réu';

-- Update RLS if necessary (usually not needed if already enabled for the table)
-- But ensuring they are there for the new columns if specific policies existed
