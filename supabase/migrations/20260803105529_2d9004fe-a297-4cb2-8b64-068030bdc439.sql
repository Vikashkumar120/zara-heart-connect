CREATE TABLE public.zara_dl_links (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  telegram_user_id BIGINT,
  chat_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.zara_dl_links TO service_role;

ALTER TABLE public.zara_dl_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no client access to download links"
ON public.zara_dl_links FOR SELECT TO authenticated USING (false);