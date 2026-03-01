CREATE TABLE public.zara_group_chats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id bigint NOT NULL UNIQUE,
  chat_title text NOT NULL DEFAULT 'Unknown',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.zara_group_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON public.zara_group_chats AS RESTRICTIVE FOR ALL USING (true) WITH CHECK (true);