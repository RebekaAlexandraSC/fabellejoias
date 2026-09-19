-- Permite escolher livremente a data da primeira parcela.
create or replace function public.registrar_venda (
  p_cliente_id uuid,
  p_itens jsonb,
  p_quantidade_parcelas integer default 1,
  p_data_venda date default current_date,
  p_primeiro_vencimento date default null,
  p_observacao text default null
) returns uuid language plpgsql security definer
set
  search_path = public as $$
declare
  v_user_id uuid := auth.uid(); v_venda_id uuid; v_item_id uuid; v_total numeric(12,2) := 0;
  v_item record; v_produto record; v_lote record; v_restante integer; v_usar integer; v_anterior integer; v_posterior integer;
  v_valor_parcela numeric(12,2); v_numero integer;
begin
  if v_user_id is null then raise exception 'É necessário estar autenticada'; end if;
  if p_quantidade_parcelas is null or p_quantidade_parcelas < 1 then raise exception 'Quantidade de parcelas inválida'; end if;
  if p_itens is null or jsonb_array_length(p_itens) = 0 then raise exception 'Inclua ao menos um item na venda'; end if;
  if not exists (select 1 from public.clientes where id = p_cliente_id and user_id = v_user_id and ativo) then raise exception 'Cliente não encontrada'; end if;
  for v_item in select * from jsonb_to_recordset(p_itens) as x(produto_id uuid, quantidade integer, preco_unitario numeric) loop
    if v_item.quantidade is null or v_item.quantidade < 1 or v_item.preco_unitario is null or v_item.preco_unitario < 0 then raise exception 'Item de venda inválido'; end if;
    select * into v_produto from public.produtos where id = v_item.produto_id and user_id = v_user_id and ativo for update;
    if not found then raise exception 'Produto não encontrado'; end if;
    if v_produto.quantidade_estoque < v_item.quantidade then raise exception 'Estoque insuficiente para %', v_produto.referencia; end if;
    v_total := v_total + (v_item.quantidade * v_item.preco_unitario);
  end loop;
  if p_primeiro_vencimento is null then p_primeiro_vencimento := p_data_venda; end if;
  insert into public.vendas(user_id, cliente_id, valor_total, quantidade_parcelas, data_venda, observacao) values(v_user_id, p_cliente_id, round(v_total,2), p_quantidade_parcelas, p_data_venda, nullif(btrim(p_observacao), '')) returning id into v_venda_id;
  for v_item in select * from jsonb_to_recordset(p_itens) as x(produto_id uuid, quantidade integer, preco_unitario numeric) loop
    insert into public.itens_venda(user_id,venda_id,produto_id,quantidade,preco_unitario) values(v_user_id,v_venda_id,v_item.produto_id,v_item.quantidade,v_item.preco_unitario) returning id into v_item_id;
    v_restante := v_item.quantidade;
    for v_lote in select * from public.entradas_estoque where produto_id=v_item.produto_id and user_id=v_user_id and quantidade_disponivel>0 order by data_entrada,id for update loop
      exit when v_restante=0; v_usar:=least(v_restante,v_lote.quantidade_disponivel);
      update public.entradas_estoque set quantidade_disponivel=quantidade_disponivel-v_usar where id=v_lote.id;
      insert into public.alocacoes_estoque(user_id,item_venda_id,entrada_estoque_id,quantidade,custo_unitario) values(v_user_id,v_item_id,v_lote.id,v_usar,v_lote.custo_unitario); v_restante:=v_restante-v_usar;
    end loop;
    update public.produtos set quantidade_estoque=quantidade_estoque-v_item.quantidade where id=v_item.produto_id returning quantidade_estoque+v_item.quantidade,quantidade_estoque into v_anterior,v_posterior;
    insert into public.movimentacoes_estoque(user_id,produto_id,tipo,quantidade,quantidade_anterior,quantidade_posterior,motivo,referencia_id) values(v_user_id,v_item.produto_id,'venda',v_item.quantidade,v_anterior,v_posterior,'Venda',v_venda_id);
  end loop;
  v_valor_parcela:=round(v_total/p_quantidade_parcelas,2);
  for v_numero in 1..p_quantidade_parcelas loop
    insert into public.parcelas(user_id,venda_id,numero,valor,data_vencimento) values(v_user_id,v_venda_id,v_numero,case when v_numero=p_quantidade_parcelas then round(v_total-v_valor_parcela*(p_quantidade_parcelas-1),2) else v_valor_parcela end,p_primeiro_vencimento+((v_numero-1)*interval '1 month'));
  end loop;
  return v_venda_id;
end; $$;
