-- Таблица для хранения глобальных настроек приложения (ключи API и т.п.)
-- Доступна для чтения всем (anon), но писать могут только аутентифицированные пользователи.

create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

-- Разрешаем всем читать (чтобы все пользователи могли получить Gemini-ключ)
alter table public.app_config enable row level security;

create policy "anyone can read config"
  on public.app_config for select
  using (true);

-- Только аутентифицированные пользователи могут записывать/обновлять
create policy "authenticated can upsert config"
  on public.app_config for all
  using (auth.role() = 'authenticated');
