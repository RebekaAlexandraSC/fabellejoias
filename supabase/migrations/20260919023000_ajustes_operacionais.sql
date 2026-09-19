-- Remove a regra de vencimento mínimo e adiciona exclusões seguras.
drop trigger if exists validar_primeiro_vencimento_venda on public.parcelas;

drop function if exists public.validar_primeiro_vencimento_venda ();

create or replace function public.excluir_venda (p_venda_id uuid) returns void language plpgsql security definer
set
  search_path = public as $$
declare v_user_id uuid := auth.uid(); v_item record; v_alocacao record; v_anterior integer; v_posterior integer;
begin
  if v_user_id is null then raise exception 'É necessário estar autenticada'; end if;
  if not exists (select 1 from public.vendas where id = p_venda_id and user_id = v_user_id) then raise exception 'Venda não encontrada'; end if;
  for v_item in select id, produto_id, quantidade from public.itens_venda where venda_id = p_venda_id loop
    for v_alocacao in select entrada_estoque_id, quantidade from public.alocacoes_estoque where item_venda_id = v_item.id loop
      update public.entradas_estoque set quantidade_disponivel = quantidade_disponivel + v_alocacao.quantidade where id = v_alocacao.entrada_estoque_id;
    end loop;
    update public.produtos set quantidade_estoque = quantidade_estoque + v_item.quantidade where id = v_item.produto_id returning quantidade_estoque - v_item.quantidade, quantidade_estoque into v_anterior, v_posterior;
    insert into public.movimentacoes_estoque(user_id, produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, motivo, referencia_id) values(v_user_id, v_item.produto_id, 'ajuste_entrada', v_item.quantidade, v_anterior, v_posterior, 'Exclusão de venda', p_venda_id);
  end loop;
  delete from public.vendas where id = p_venda_id and user_id = v_user_id;
end; $$;

create or replace function public.excluir_entrada_estoque (p_entrada_id uuid) returns void language plpgsql security definer
set
  search_path = public as $$
declare v_user_id uuid := auth.uid(); v_entrada record; v_anterior integer;
begin
  if v_user_id is null then raise exception 'É necessário estar autenticada'; end if;
  select * into v_entrada from public.entradas_estoque where id = p_entrada_id and user_id = v_user_id for update;
  if not found then raise exception 'Entrada não encontrada'; end if;
  if v_entrada.quantidade_disponivel <> v_entrada.quantidade then raise exception 'Esta entrada já foi parcialmente utilizada em uma venda e não pode ser excluída'; end if;
  select quantidade_estoque into v_anterior from public.produtos where id = v_entrada.produto_id for update;
  delete from public.entradas_estoque where id = p_entrada_id;
  update public.produtos set quantidade_estoque = v_anterior - v_entrada.quantidade where id = v_entrada.produto_id;
  insert into public.movimentacoes_estoque(user_id, produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, motivo, referencia_id) values(v_user_id, v_entrada.produto_id, 'ajuste_saida', v_entrada.quantidade, v_anterior, v_anterior - v_entrada.quantidade, 'Exclusão de entrada', p_entrada_id);
end; $$;

create or replace function public.editar_entrada_estoque (
  p_entrada_id uuid,
  p_custo_unitario numeric,
  p_preco_sugerido numeric,
  p_data_entrada date,
  p_observacao text default null
) returns void language plpgsql security definer
set
  search_path = public as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'É necessário estar autenticada'; end if;
  update public.entradas_estoque set custo_unitario = p_custo_unitario, preco_sugerido = p_preco_sugerido, data_entrada = p_data_entrada, observacao = nullif(btrim(p_observacao), '') where id = p_entrada_id and user_id = v_user_id and quantidade_disponivel = quantidade;
  if not found then raise exception 'A entrada não foi encontrada ou já foi utilizada em uma venda'; end if;
end; $$;

revoke all on function public.excluir_venda (uuid),
public.excluir_entrada_estoque (uuid),
public.editar_entrada_estoque (uuid, numeric, numeric, date, text)
from
  public;

grant
execute on function public.excluir_venda (uuid),
public.excluir_entrada_estoque (uuid),
public.editar_entrada_estoque (uuid, numeric, numeric, date, text) to authenticated;
