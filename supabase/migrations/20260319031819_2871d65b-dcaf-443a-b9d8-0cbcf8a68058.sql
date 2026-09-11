
-- Rename delegado to policia_civil
ALTER TYPE public.user_role RENAME VALUE 'delegado' TO 'policia_civil';

-- Add new police roles
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'policia_militar';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'policia_federal';

-- Convert any existing investigador roles to policia_civil
UPDATE public.user_roles SET role = 'policia_civil' WHERE role = 'investigador';

-- Update cargo_historico too
UPDATE public.cargo_historico SET role = 'policia_civil' WHERE role = 'investigador';
