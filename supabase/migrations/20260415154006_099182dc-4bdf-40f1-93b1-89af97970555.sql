
-- Sites table
CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  keywords TEXT,
  html_code TEXT,
  css_code TEXT,
  js_code TEXT,
  full_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sites" ON public.sites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sites" ON public.sites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sites" ON public.sites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sites" ON public.sites FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all sites" ON public.sites FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public view sites by subdomain" ON public.sites FOR SELECT USING (true);

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add is_active to lobbies (replace status)
ALTER TABLE public.lobbies ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Lobby participants
CREATE TABLE public.lobby_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  student_code TEXT NOT NULL DEFAULT '',
  is_online BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lobby_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own participation" ON public.lobby_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own participation" ON public.lobby_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own participation" ON public.lobby_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Teachers view lobby participants" ON public.lobby_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lobbies WHERE lobbies.id = lobby_participants.lobby_id AND lobbies.teacher_id = auth.uid()));
CREATE POLICY "Teachers update lobby participants" ON public.lobby_participants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.lobbies WHERE lobbies.id = lobby_participants.lobby_id AND lobbies.teacher_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_participants;

-- Lobby grades
CREATE TABLE public.lobby_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  grade INTEGER NOT NULL DEFAULT 5,
  comment TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lobby_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage grades" ON public.lobby_grades FOR ALL
  USING (EXISTS (SELECT 1 FROM public.lobbies WHERE lobbies.id = lobby_grades.lobby_id AND lobbies.teacher_id = auth.uid()));
CREATE POLICY "Students view own grades" ON public.lobby_grades FOR SELECT USING (auth.uid() = student_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_grades;

CREATE TRIGGER update_lobby_grades_updated_at BEFORE UPDATE ON public.lobby_grades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
