-- 1. Таблица для ответов на домашние задания
CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id uuid default gen_random_uuid() primary key,
  homework_id uuid references public.homeworks(id) on delete cascade not null,
  student_id uuid references auth.users not null,
  html_code text,
  css_code text,
  js_code text,
  python_code text,
  status text default 'pending', -- 'pending', 'graded'
  grade integer,
  feedback text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(homework_id, student_id) -- Один студент = один ответ на одно ДЗ
);

ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submissions viewable by student and teacher" 
ON public.homework_submissions FOR SELECT TO authenticated 
USING (
  student_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.homeworks WHERE id = homework_id AND created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'owner'))
);

CREATE POLICY "Submissions insertable by student" 
ON public.homework_submissions FOR INSERT TO authenticated 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Submissions updatable by student or teacher" 
ON public.homework_submissions FOR UPDATE TO authenticated 
USING (
  student_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.homeworks WHERE id = homework_id AND created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'owner'))
);


-- 2. Таблица для сообщений чата в лобби
CREATE TABLE IF NOT EXISTS public.lobby_messages (
  id uuid default gen_random_uuid() primary key,
  lobby_id uuid references public.lobbies(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.lobby_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lobby messages viewable by everyone" 
ON public.lobby_messages FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Lobby messages insertable by authenticated" 
ON public.lobby_messages FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Включаем публикацию изменений для Realtime для таблицы lobby_messages
ALTER PUBLICATION supabase_realtime ADD TABLE lobby_messages;
