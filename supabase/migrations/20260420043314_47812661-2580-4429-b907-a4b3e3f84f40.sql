-- Moderation warnings tracking
CREATE TABLE public.zara_mod_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  first_name TEXT DEFAULT 'User',
  bot_token TEXT,
  warning_count INTEGER NOT NULL DEFAULT 0,
  mute_count INTEGER NOT NULL DEFAULT 0,
  ban_count INTEGER NOT NULL DEFAULT 0,
  last_reason TEXT,
  last_warned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chat_id, telegram_user_id, bot_token)
);

CREATE INDEX idx_zara_mod_warnings_lookup ON public.zara_mod_warnings (chat_id, telegram_user_id);

ALTER TABLE public.zara_mod_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access mod warnings"
ON public.zara_mod_warnings FOR ALL USING (true) WITH CHECK (true);

-- Moderation event log (for /modstats)
CREATE TABLE public.zara_mod_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  first_name TEXT DEFAULT 'User',
  bot_token TEXT,
  event_type TEXT NOT NULL,    -- 'warn' | 'mute' | 'ban' | 'delete' | 'flood' | 'scam' | 'abuse' | 'spam'
  reason TEXT,
  message_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zara_mod_events_chat ON public.zara_mod_events (chat_id, created_at DESC);

ALTER TABLE public.zara_mod_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access mod events"
ON public.zara_mod_events FOR ALL USING (true) WITH CHECK (true);

-- Recent message buffer for flood detection (auto-cleaned)
CREATE TABLE public.zara_msg_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  bot_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zara_msg_buffer_lookup ON public.zara_msg_buffer (chat_id, telegram_user_id, created_at DESC);

ALTER TABLE public.zara_msg_buffer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access msg buffer"
ON public.zara_msg_buffer FOR ALL USING (true) WITH CHECK (true);