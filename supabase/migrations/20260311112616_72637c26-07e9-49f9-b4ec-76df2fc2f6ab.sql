CREATE TABLE public.zara_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id BIGINT NOT NULL UNIQUE,
  channel_title TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.zara_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON public.zara_channels FOR ALL USING (true) WITH CHECK (true);