-- Schema inicial do Trevolt no Supabase.
--
-- Quem acessa: só o servidor do Next (rota /api), com a chave secreta (service role), que ignora o RLS.
-- O navegador usa a chave publicável apenas para o login (Supabase Auth). Por isso todas as tabelas têm
-- RLS ligado e nenhuma policy: pela API pública (anon/authenticated) nada é lido nem gravado.
--
-- Perfis: ficam em auth.users.raw_app_meta_data->>'perfil' ('varejista' | 'consumidor'). O app_metadata só
-- é alterado pela chave secreta, então ninguém se promove a varejista criando a própria conta.

-- ---------- Faturas confirmadas pelo consumidor (as da base sintética continuam nas fixtures) ----------
create table public.faturas (
  id          text primary key check (id ~ '^up-'),
  dados       jsonb not null,                    -- objeto Fatura (src/lib/types.ts), sem o id
  usuario_id  uuid references auth.users (id) on delete set null,
  criado_em   timestamptz not null default now()
);
comment on table public.faturas is 'Faturas enviadas e confirmadas pelo consumidor (POST /faturas/confirmar).';

-- ---------- Casos de migração (console do fornecedor) ----------
create sequence public.casos_numero_seq;

create table public.casos (
  id                          text primary key default ('caso-' || lpad(nextval('public.casos_numero_seq')::text, 3, '0')),
  cliente                     text not null,
  segmento                    text not null,
  uf                          char(2) not null,
  etapa                       text not null check (etapa in ('simulado', 'ciencia_pendente', 'aguardando_aprovacao', 'documentacao', 'formalizado', 'escalado_humano')),
  criado_em                   date not null default current_date,
  economia_liquida_mensal_rs  numeric(12, 2) not null default 0,
  oferta_id                   text,
  risco_desistencia           text not null default 'baixo' check (risco_desistencia in ('baixo', 'medio', 'alto')),
  motivo_risco                text,
  proxima_acao                text not null,
  alerta_beneficio            boolean not null default false,
  ciencia                     jsonb,             -- { itens[], registrada_em, hash }
  aprovado_por                jsonb,             -- { operador, em }
  recibo_id                   text,
  fatura_id                   text,
  usuario_id                  uuid references auth.users (id) on delete set null,
  atualizado_em               timestamptz not null default now()
);
alter sequence public.casos_numero_seq owned by public.casos.id;
create index casos_criado_em_idx on public.casos (criado_em desc);
create index casos_etapa_idx on public.casos (etapa);
comment on table public.casos is 'Pedidos de migração; a aprovação é sempre de uma pessoa (HITL).';

-- ---------- Cadastro da comercializadora varejista (uma por instalação) ----------
create table public.varejista (
  id             smallint primary key default 1 check (id = 1),
  dados          jsonb not null,                 -- objeto Varejista (src/lib/varejista.ts)
  cadastrado_em  timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

-- ---------- Trilha de evidências (ciência de riscos, aprovação, cadastro) ----------
create table public.evidencias (
  id          bigint generated always as identity primary key,
  em          timestamptz not null default now(),
  tipo        text not null check (tipo in ('fatura_confirmada', 'ciencia', 'aprovacao_humana', 'cadastro_varejista')),
  ref         text not null,
  dados       jsonb not null default '{}'::jsonb,
  usuario_id  uuid references auth.users (id) on delete set null
);
create index evidencias_ref_idx on public.evidencias (ref);

-- ---------- atualizado_em automático ----------
create function public.tocar_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;
create trigger casos_atualizado_em before update on public.casos
  for each row execute function public.tocar_atualizado_em();
create trigger varejista_atualizado_em before update on public.varejista
  for each row execute function public.tocar_atualizado_em();

-- ---------- RLS: ligado em tudo, sem policies (acesso só pelo servidor) ----------
alter table public.faturas    enable row level security;
alter table public.casos      enable row level security;
alter table public.varejista  enable row level security;
alter table public.evidencias enable row level security;

revoke all on public.faturas, public.casos, public.varejista, public.evidencias from anon, authenticated;
revoke all on sequence public.casos_numero_seq from anon, authenticated;
