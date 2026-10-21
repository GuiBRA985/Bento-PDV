-- Execute no SQL Editor do Supabase. Não exponha SERVICE_ROLE no navegador.
create extension if not exists pgcrypto;
create table if not exists public.publico_pedidos (
 id uuid primary key default gen_random_uuid(),
 criado_em timestamptz not null default now(),
 nome text not null, tipo text not null check(tipo in ('gps','estacionado')),
 veiculo jsonb, lat double precision, lng double precision,
 gps_atualizado_em timestamptz, itens jsonb not null,
 total_centavos integer not null check(total_centavos>0),
 status text not null default 'aguardando_pix'
 check(status in ('aguardando_pix','pago','preparo','pronto','entregue','cancelado')),
 txid text unique
);
alter table public.publico_pedidos enable row level security;
-- Nenhuma política pública: acesso apenas pelo backend com service role.
