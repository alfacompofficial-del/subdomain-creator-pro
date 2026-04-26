-- Lobby chat messages
CREATE TABLE IF NOT EXISTS public.lobby_chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  message text NOT NULL,
  is_teacher boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lobby_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat messages viewable by authenticated users"
  ON public.lobby_chat_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Chat messages can be inserted by authenticated users"
  ON public.lobby_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chat messages can be deleted by owner"
  ON public.lobby_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Homework submissions table
CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id uuid NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text,
  comment text,
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  grade integer,
  teacher_comment text,
  UNIQUE(homework_id, student_id)
);

ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submissions viewable by authenticated users"
  ON public.homework_submissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students can insert their own submissions"
  ON public.homework_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own submissions"
  ON public.homework_submissions FOR UPDATE TO authenticated
  USING (auth.uid() = student_id);
