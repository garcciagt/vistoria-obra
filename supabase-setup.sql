-- ============================================================
-- PASSO 1: Execute este SQL no Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → colar e rodar)
-- ============================================================

-- 1. Habilitar UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela de vistorias (com user_id)
create table if not exists vistorias (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 3. Tabela de formulários (com user_id e token automático)
create table if not exists formularios (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text unique not null default replace(uuid_generate_v4()::text, '-', ''),
  tipo text not null check (tipo in ('vistoria', 'projeto')),
  cliente_nome text not null,
  status text not null default 'pendente' check (status in ('pendente', 'preenchido')),
  respostas jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. Índices
create index if not exists idx_vistorias_user on vistorias(user_id);
create index if not exists idx_formularios_user on formularios(user_id);
create index if not exists idx_formularios_token on formularios(token);

-- 5. Habilitar RLS
alter table vistorias enable row level security;
alter table formularios enable row level security;

-- 6. Policies para vistorias — cada usuário vê só os seus
create policy "vistorias_select" on vistorias for select using (auth.uid() = user_id);
create policy "vistorias_insert" on vistorias for insert with check (auth.uid() = user_id);
create policy "vistorias_update" on vistorias for update using (auth.uid() = user_id);
create policy "vistorias_delete" on vistorias for delete using (auth.uid() = user_id);

-- 7. Policies para formulários — cada usuário gerencia os seus
create policy "formularios_select" on formularios for select using (auth.uid() = user_id);
create policy "formularios_insert" on formularios for insert with check (auth.uid() = user_id);
create policy "formularios_update" on formularios for update using (auth.uid() = user_id);
create policy "formularios_delete" on formularios for delete using (auth.uid() = user_id);

-- 8. Policy pública para clientes preencherem formulários pelo token (sem login)
create policy "formularios_public_read_by_token" on formularios
  for select using (true);  -- o token funciona como segredo

create policy "formularios_public_update_by_token" on formularios
  for update using (status = 'pendente')
  with check (status = 'preenchido');
