-- Добавляем колонку role в таблицу profiles, если её нет
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'student';

-- Назначаем Владельца и Учителя
UPDATE public.profiles
SET role = 'owner'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'alfacompofficial@gmail.com'
);

UPDATE public.profiles
SET role = 'teacher'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'idrisovjasur@gmail.com'
);
