CREATE TABLE IF NOT EXISTS public.zara_user_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_telegram_user_id bigint NOT NULL,
  owner_first_name text DEFAULT 'User',
  bot_token text NOT NULL UNIQUE,
  bot_username text,
  bot_display_name text DEFAULT 'Zara Clone',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zara_user_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access user bots"
ON public.zara_user_bots
FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_zara_user_bots_owner ON public.zara_user_bots(owner_telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_zara_user_bots_active ON public.zara_user_bots(is_active);