
CREATE TABLE public.zara_mod_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id bigint NOT NULL,
  bot_token text NOT NULL DEFAULT '',
  strictness text NOT NULL DEFAULT 'strict',
  blacklisted_words text[] NOT NULL DEFAULT '{}',
  whitelisted_words text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chat_id, bot_token)
);

ALTER TABLE public.zara_mod_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access mod config"
ON public.zara_mod_config
FOR ALL
TO public
USING (true)
WITH CHECK (true);
