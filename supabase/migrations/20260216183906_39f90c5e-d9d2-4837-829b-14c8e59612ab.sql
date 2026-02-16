
CREATE TABLE public.zara_user_modes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'roast',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.zara_user_modes ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to read/write via service role
CREATE POLICY "Allow all for service role" ON public.zara_user_modes
  FOR ALL USING (true) WITH CHECK (true);
