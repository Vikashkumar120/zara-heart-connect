
CREATE TABLE public.zara_game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  first_name TEXT NOT NULL DEFAULT 'Unknown',
  game_type TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_scores_chat ON public.zara_game_scores(chat_id);
CREATE INDEX idx_game_scores_user ON public.zara_game_scores(telegram_user_id);

ALTER TABLE public.zara_game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON public.zara_game_scores
  FOR ALL USING (true) WITH CHECK (true);
