create or replace function public.excluir_saida(p_saida_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.parcelas_saidas where saida_id = p_saida_id and data_pagamento is not null) then raise exception 'Não é possível excluir uma saída com parcela já paga'; end if;
  delete from public.saidas where id = p_saida_id and user_id = auth.uid();
end; $$;
grant execute on function public.excluir_saida(uuid) to authenticated;
