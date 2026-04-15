
CREATE TABLE public.lobbies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'HTML/CSS/JS',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view own lobbies" ON public.lobbies
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Admins view all lobbies" ON public.lobbies
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers insert own lobbies" ON public.lobbies
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers update own lobbies" ON public.lobbies
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers delete own lobbies" ON public.lobbies
  FOR DELETE USING (auth.uid() = teacher_id);

CREATE POLICY "Authenticated users view active lobbies" ON public.lobbies
  FOR SELECT USING (status = 'active');
