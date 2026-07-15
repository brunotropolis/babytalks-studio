-- ============================================================
--  Baby Talks Studio — schema de postagem IG (@babytalks.evento)
--  Roda no projeto Supabase ofertas-beta (qkherjtsvakmpkxebuwy).
--  Tabelas com prefixo bt_ pra não colidir com o resto.
--  Acesso só via service_role no servidor Next.js (sem client-side).
-- ============================================================

-- Config chave/valor (token IG, user id, controle de refresh do token)
create table if not exists public.bt_ig_config (
  chave       text primary key,
  valor       text,
  atualizado_em timestamptz not null default now()
);

-- Fila / histórico de posts
create table if not exists public.bt_ig_posts (
  id             uuid primary key default gen_random_uuid(),
  criado_em      timestamptz not null default now(),
  agendado_para  timestamptz,                 -- null = publicar agora
  status         text not null default 'rascunho'
                 check (status in ('rascunho','agendado','publicando','publicado','erro')),
  tipo           text not null
                 check (tipo in ('imagem','carrossel','reels')),
  legenda        text default '',
  colaboradores  text[] default '{}',          -- usernames dos collabs (máx 3)
  compartilhar_feed boolean default true,      -- reels: também no feed
  cover_url      text,                         -- reels: capa
  midia          jsonb not null default '[]',  -- [{url, tipo:'imagem'|'video'}]
  ig_creation_id text,                         -- container id da Graph API
  ig_media_id    text,                         -- id do post publicado
  permalink      text,
  erro           text,
  tentativas     int not null default 0,
  publicado_em   timestamptz
);

create index if not exists bt_ig_posts_fila_idx
  on public.bt_ig_posts (status, agendado_para);

-- RLS: fechada. Só service_role (servidor) acessa.
alter table public.bt_ig_config enable row level security;
alter table public.bt_ig_posts  enable row level security;
-- (sem policies = ninguém além do service_role lê/escreve)
