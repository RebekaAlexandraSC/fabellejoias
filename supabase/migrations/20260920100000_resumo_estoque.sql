create or replace function public.obter_resumo_estoque()
returns table (total_pecas bigint, produtos_estoque_baixo bigint)
language sql stable security invoker set search_path = public as $$
  select coalesce(sum(quantidade_estoque), 0), count(*) filter (where quantidade_estoque <= estoque_minimo)
  from public.produtos where user_id = auth.uid() and ativo = true;
$$;
grant execute on function public.obter_resumo_estoque() to authenticated;
