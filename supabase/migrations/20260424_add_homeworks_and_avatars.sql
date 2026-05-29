-- Migrations for Homework and Avatars
CREATE TABLE IF NOT EXISTS public.homeworks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users not null
);

-- RLS (Row Level Security)
ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;

-- Учителя могут создавать и редактировать задания
-- Разрешаем просматривать задания всем авторизованным пользователям
CREATE POLICY "Homeworks are viewable by authenticated users" ON public.homeworks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Homeworks can be created by authenticated users" ON public.homeworks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Homeworks can be updated by owner" ON public.homeworks FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Homeworks can be deleted by owner" ON public.homeworks FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Create a storage bucket for avatars if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar." ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Users can update their own avatar." ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Users can delete their own avatar." ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

-- Добавляем недостающие колонки в таблицу profiles, если их там не было
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS bio text;
