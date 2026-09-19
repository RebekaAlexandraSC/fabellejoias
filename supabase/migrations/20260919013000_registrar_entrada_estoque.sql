-- Registra uma entrada de estoque de forma atômica.
-- A função é SECURITY DEFINER porque as tabelas operacionais não aceitam
-- alterações diretas pelo cliente. A conta autenticada só pode afetar seu produto.
create or replace function public.registrar_entrada_estoque (
  p_produto_id uuid,
  p_quantidade integer,
  p_custo_unitario numeric,
  p_preco_sugerido numeric,
  p_data_entrada date default current_date,
  p_observacao text default null
) returns uuid language plpgsql security definer
set
  search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_quantidade_anterior integer;
  v_entrada_id uuid;
begin
  if v_user_id is null then
    raise exception 'É necessário estar autenticada para registrar uma entrada';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'A quantidade deve ser maior que zero';
  end if;

  if p_custo_unitario is null or p_custo_unitario < 0 or p_preco_sugerido is null or p_preco_sugerido < 0 then
    raise exception 'Custo e preço sugerido devem ser valores válidos';
  end if;

  select quantidade_estoque into v_quantidade_anterior
  from public.produtos
  where id = p_produto_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Produto não encontrado';
  end if;

  insert into public.entradas_estoque (
    user_id, produto_id, quantidade, quantidade_disponivel,
    custo_unitario, preco_sugerido, data_entrada, observacao
  ) values (
    v_user_id, p_produto_id, p_quantidade, p_quantidade,
    p_custo_unitario, p_preco_sugerido, coalesce(p_data_entrada, current_date), nullif(btrim(p_observacao), '')
  ) returning id into v_entrada_id;

  update public.produtos
  set quantidade_estoque = v_quantidade_anterior + p_quantidade
  where id = p_produto_id;

  insert into public.movimentacoes_estoque (
    user_id, produto_id, tipo, quantidade, quantidade_anterior,
    quantidade_posterior, motivo, referencia_id
  ) values (
    v_user_id, p_produto_id, 'entrada', p_quantidade, v_quantidade_anterior,
    v_quantidade_anterior + p_quantidade, 'Entrada de estoque', v_entrada_id
  );

  return v_entrada_id;
end;
$$;

revoke all on function public.registrar_entrada_estoque (uuid, integer, numeric, numeric, date, text)
from
  public;

grant
execute on function public.registrar_entrada_estoque (uuid, integer, numeric, numeric, date, text) to authenticated;
