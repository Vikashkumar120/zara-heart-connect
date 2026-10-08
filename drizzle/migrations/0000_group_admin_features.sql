-- Group admin toolkit: per-group switches, bio-filter whitelist, bot message tracking (for /cleanbot)
ALTER TABLE public.zara_mod_config
  ADD COLUMN IF NOT EXISTS antiflood_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS antilink boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bioremove boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS antiforward boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS join_remove boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.zara_group_approved (
  chat_id bigint NOT NULL,
  bot_token text NOT NULL DEFAULT '',
  telegram_user_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, bot_token, telegram_user_id)
);
ALTER TABLE public.zara_group_approved ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access group approved" ON public.zara_group_approved
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.zara_bot_msgs (
  chat_id bigint NOT NULL,
  bot_token text NOT NULL DEFAULT '',
  message_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, bot_token, message_id)
);
ALTER TABLE public.zara_bot_msgs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access bot msgs" ON public.zara_bot_msgs
  FOR ALL TO public USING (true) WITH CHECK (true);