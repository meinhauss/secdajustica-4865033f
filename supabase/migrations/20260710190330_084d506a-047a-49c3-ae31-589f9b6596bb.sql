ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_dm_enabled BOOLEAN NOT NULL DEFAULT true;