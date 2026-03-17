
-- Add new roles to the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'presidente_tribunal';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'desembargador';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'investigador';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'presidente_oab';
