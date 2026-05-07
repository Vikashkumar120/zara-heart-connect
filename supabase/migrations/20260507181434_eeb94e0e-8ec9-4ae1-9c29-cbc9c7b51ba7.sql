CREATE TABLE IF NOT EXISTS public.zara_user_model (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  chat_id bigint,
  bot_token text DEFAULT '',
  model text NOT NULL,
  scope text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS zara_user_model_uniq
  ON public.zara_user_model (telegram_user_id, COALESCE(chat_id, 0), COALESCE(bot_token, ''));
ALTER TABLE public.zara_user_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access user model" ON public.zara_user_model FOR ALL USING (true) WITH CHECK (true);