-- Estoque de semijoias — schema inicial seguro (Supabase / PostgreSQL)
-- Esta migração cria a estrutura, regras de integridade e RLS.
-- As operações que alteram estoque, vendem e fazem FIFO ficam para a próxima migração.
create extension if not exists pgcrypto;

create extension if not exists pg_trgm;

-- A aplicação é preparada para mais de uma conta, mesmo que inicialmente exista uma só.
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, nome)
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  telefone text,
  observacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  referencia text not null check (btrim(referencia) <> ''),
  descricao text,
  categoria_id uuid,
  quantidade_estoque integer not null default 0 check (quantidade_estoque >= 0),
  estoque_minimo integer not null default 0 check (estoque_minimo >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, referencia),
  foreign key (categoria_id) references public.categorias (id) on delete set null
);

create table public.entradas_estoque (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  quantidade_disponivel integer not null check (quantidade_disponivel between 0 and quantidade),
  custo_unitario numeric(12, 2) not null check (custo_unitario >= 0),
  preco_sugerido numeric(12, 2) not null check (preco_sugerido >= 0),
  data_entrada date not null default current_date,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  valor_total numeric(12, 2) not null check (valor_total > 0),
  quantidade_parcelas integer not null check (quantidade_parcelas > 0),
  data_venda date not null default current_date,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.itens_venda (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  venda_id uuid not null references public.vendas (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(12, 2) not null check (preco_unitario >= 0),
  subtotal numeric(12, 2) generated always as (round(quantidade * preco_unitario, 2)) stored,
  created_at timestamptz not null default now()
);

create table public.alocacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  item_venda_id uuid not null references public.itens_venda (id) on delete cascade,
  entrada_estoque_id uuid not null references public.entradas_estoque (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  -- Snapshot: preserva o custo mesmo se o lote for corrigido no futuro.
  custo_unitario numeric(12, 2) not null check (custo_unitario >= 0),
  created_at timestamptz not null default now(),
  unique (item_venda_id, entrada_estoque_id)
);

create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  venda_id uuid not null references public.vendas (id) on delete cascade,
  numero integer not null check (numero > 0),
  valor numeric(12, 2) not null check (valor > 0),
  data_vencimento date not null,
  data_pagamento date,
  forma_pagamento text check (
    forma_pagamento is null
    or forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito')
  ),
  observacao text,
  created_at timestamptz not null default now(),
  unique (venda_id, numero),
  -- Não existe valor_pago: uma parcela é quitada inteira ou continua pendente.
  check (
    (
      data_pagamento is null
      and forma_pagamento is null
    )
    or (
      data_pagamento is not null
      and forma_pagamento is not null
    )
  )
);

create table public.saidas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  descricao text not null check (btrim(descricao) <> ''),
  categoria text not null check (
    categoria in (
      'compra_mercadoria',
      'embalagem',
      'frete',
      'taxa',
      'marketing',
      'outros'
    )
  ),
  valor_total numeric(12, 2) not null check (valor_total > 0),
  quantidade_parcelas integer not null check (quantidade_parcelas > 0),
  data_saida date not null default current_date,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parcelas_saidas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  saida_id uuid not null references public.saidas (id) on delete cascade,
  numero integer not null check (numero > 0),
  valor numeric(12, 2) not null check (valor > 0),
  data_vencimento date not null,
  data_pagamento date,
  forma_pagamento text check (
    forma_pagamento is null
    or forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito')
  ),
  observacao text,
  created_at timestamptz not null default now(),
  unique (saida_id, numero),
  check (
    (
      data_pagamento is null
      and forma_pagamento is null
    )
    or (
      data_pagamento is not null
      and forma_pagamento is not null
    )
  )
);

create table public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  tipo text not null check (
    tipo in (
      'entrada',
      'venda',
      'ajuste_entrada',
      'ajuste_saida'
    )
  ),
  quantidade integer not null check (quantidade > 0),
  quantidade_anterior integer not null check (quantidade_anterior >= 0),
  quantidade_posterior integer not null check (quantidade_posterior >= 0),
  motivo text,
  referencia_id uuid,
  data_movimentacao timestamptz not null default now(),
  check (
    (
      tipo in ('entrada', 'ajuste_entrada')
      and quantidade_posterior = quantidade_anterior + quantidade
    )
    or (
      tipo in ('venda', 'ajuste_saida')
      and quantidade_posterior = quantidade_anterior - quantidade
    )
  )
);

-- Busca de vendas por cliente: filtra clientes pelo nome e une em vendas por cliente_id.
create index idx_clientes_nome_busca on public.clientes using gin (nome gin_trgm_ops);

create index idx_produtos_categoria on public.produtos (categoria_id);

create index idx_entradas_fifo on public.entradas_estoque (produto_id, data_entrada, id)
where
  quantidade_disponivel > 0;

create index idx_vendas_cliente_data on public.vendas (cliente_id, data_venda desc);

create index idx_vendas_data on public.vendas (data_venda desc);

create index idx_itens_venda_venda on public.itens_venda (venda_id);

create index idx_itens_venda_produto on public.itens_venda (produto_id);

create index idx_alocacoes_item on public.alocacoes_estoque (item_venda_id);

create index idx_alocacoes_entrada on public.alocacoes_estoque (entrada_estoque_id);

create index idx_parcelas_vencimento on public.parcelas (data_vencimento)
where
  data_pagamento is null;

create index idx_parcelas_saidas_vencimento on public.parcelas_saidas (data_vencimento)
where
  data_pagamento is null;

create index idx_movimentacoes_produto_data on public.movimentacoes_estoque (produto_id, data_movimentacao desc);

-- Regra que não cabe em CHECK, pois compara parcela e venda.
create or replace function public.validar_primeiro_vencimento_venda () returns trigger language plpgsql
set
  search_path = public as $$
declare
  venda_data date;
begin
  select data_venda into venda_data from public.vendas where id = new.venda_id;
  if venda_data is null then
    raise exception 'Venda não encontrada para a parcela';
  end if;
  if new.numero = 1 and new.data_vencimento < venda_data + 30 then
    raise exception 'A primeira parcela deve vencer no mínimo 30 dias após a venda';
  end if;
  return new;
end;
$$;

create trigger validar_primeiro_vencimento_venda
before insert or update of venda_id,
numero,
data_vencimento on public.parcelas for each row
execute function public.validar_primeiro_vencimento_venda ();

create or replace function public.atualizar_updated_at () returns trigger language plpgsql
set
  search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger categorias_updated_at
before update on public.categorias for each row
execute function public.atualizar_updated_at ();

create trigger clientes_updated_at
before update on public.clientes for each row
execute function public.atualizar_updated_at ();

create trigger produtos_updated_at
before update on public.produtos for each row
execute function public.atualizar_updated_at ();

create trigger entradas_updated_at
before update on public.entradas_estoque for each row
execute function public.atualizar_updated_at ();

create trigger vendas_updated_at
before update on public.vendas for each row
execute function public.atualizar_updated_at ();

create trigger saidas_updated_at
before update on public.saidas for each row
execute function public.atualizar_updated_at ();

-- RLS: os cadastros são manipuláveis pela própria conta. Os lançamentos operacionais
-- são inicialmente somente leitura no cliente; a próxima migração usará RPCs transacionais.
alter table public.categorias enable row level security;

alter table public.clientes enable row level security;

alter table public.produtos enable row level security;

alter table public.entradas_estoque enable row level security;

alter table public.movimentacoes_estoque enable row level security;

alter table public.vendas enable row level security;

alter table public.itens_venda enable row level security;

alter table public.alocacoes_estoque enable row level security;

alter table public.parcelas enable row level security;

alter table public.saidas enable row level security;

alter table public.parcelas_saidas enable row level security;

create policy "owner manages categorias" on public.categorias for all to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "owner manages clientes" on public.clientes for all to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "owner manages produtos" on public.produtos for all to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "owner reads entradas" on public.entradas_estoque for
select
  to authenticated using (user_id = auth.uid ());

create policy "owner reads movimentacoes" on public.movimentacoes_estoque for
select
  to authenticated using (user_id = auth.uid ());

create policy "owner reads vendas" on public.vendas for
select
  to authenticated using (user_id = auth.uid ());

create policy "owner reads itens" on public.itens_venda for
select
  to authenticated using (user_id = auth.uid ());

create policy "owner reads alocacoes" on public.alocacoes_estoque for
select
  to authenticated using (user_id = auth.uid ());

create policy "owner reads parcelas" on public.parcelas for
select
  to authenticated using (user_id = auth.uid ());

create policy "owner reads saidas" on public.saidas for
select
  to authenticated using (user_id = auth.uid ());

create policy "owner reads parcelas saidas" on public.parcelas_saidas for
select
  to authenticated using (user_id = auth.uid ());

-- A API pública não deve inserir/alterar diretamente os livros operacionais.
revoke insert,
update,
delete on public.entradas_estoque,
public.movimentacoes_estoque,
public.vendas,
public.itens_venda,
public.alocacoes_estoque,
public.parcelas,
public.saidas,
public.parcelas_saidas
from
  anon,
  authenticated;

-- Não há função de FIFO nesta etapa. A próxima migração criará RPCs atômicas para:
-- entrada, ajuste, venda + alocação FIFO + parcelas, saída + parcelas e quitação integral.
