create or replace function public.quitar_parcela(
  p_parcela_id uuid,
  p_data_pagamento date,
  p_forma_pagamento text,
  p_valor_pago numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tabela text;
  v_coluna_relacao text;
  v_relacao_id uuid;
  v_valor_original numeric(12, 2);
  v_valor_pago numeric(12, 2);
  v_saldo_total numeric(12, 2);
  v_saldo_restante numeric(12, 2);
  v_data_vencimento date;
  v_quantidade_restante integer;
  v_numero_parcela integer;
  v_indice integer := 0;
  v_valor_parcela numeric(12, 2);
  v_parcela record;
begin
  if v_user_id is null then
    raise exception 'É necessário estar autenticada';
  end if;

  select valor, venda_id, data_vencimento
  into v_valor_original, v_relacao_id, v_data_vencimento
  from public.parcelas
  where id = p_parcela_id
    and user_id = v_user_id
    and data_pagamento is null
  for update;

  if found then
    v_tabela := 'parcelas';
    v_coluna_relacao := 'venda_id';
  else
    select valor, saida_id, data_vencimento
    into v_valor_original, v_relacao_id, v_data_vencimento
    from public.parcelas_saidas
    where id = p_parcela_id
      and user_id = v_user_id
      and data_pagamento is null
    for update;

    if not found then
      raise exception 'Parcela não encontrada ou já quitada';
    end if;

    v_tabela := 'parcelas_saidas';
    v_coluna_relacao := 'saida_id';
  end if;

  execute format(
    'select coalesce(sum(valor), 0) from public.%I where %I = $1 and data_pagamento is null',
    v_tabela,
    v_coluna_relacao
  )
  into v_saldo_total
  using v_relacao_id;

  v_valor_pago := coalesce(p_valor_pago, v_valor_original);

  if v_valor_pago <= 0 or v_valor_pago > v_saldo_total then
    raise exception 'O valor informado excede o saldo pendente de R$ %.', v_saldo_total;
  end if;

  execute format(
    'update public.%I set valor = $1, data_pagamento = $2, forma_pagamento = $3 where id = $4',
    v_tabela
  )
  using
    v_valor_pago,
    coalesce(p_data_pagamento, current_date),
    p_forma_pagamento,
    p_parcela_id;

  if v_valor_pago = v_valor_original then
    return;
  end if;

  v_saldo_restante := v_saldo_total - v_valor_pago;

  execute format(
    'select count(*) from public.%I where %I = $1 and data_pagamento is null',
    v_tabela,
    v_coluna_relacao
  )
  into v_quantidade_restante
  using v_relacao_id;

  if v_saldo_restante = 0 then
    execute format(
      'delete from public.%I where %I = $1 and data_pagamento is null',
      v_tabela,
      v_coluna_relacao
    )
    using v_relacao_id;
    return;
  end if;

  if v_quantidade_restante = 0 then
    execute format(
      'select coalesce(max(numero), 0) + 1 from public.%I where %I = $1',
      v_tabela,
      v_coluna_relacao
    )
    into v_numero_parcela
    using v_relacao_id;

    execute format(
      'insert into public.%I (user_id, %I, numero, valor, data_vencimento) values ($1, $2, $3, $4, $5)',
      v_tabela,
      v_coluna_relacao
    )
    using
      v_user_id,
      v_relacao_id,
      v_numero_parcela,
      v_saldo_restante,
      v_data_vencimento + interval '1 month';
    return;
  end if;

  v_valor_parcela := round(v_saldo_restante / v_quantidade_restante, 2);

  for v_parcela in execute format(
    'select id from public.%I where %I = $1 and data_pagamento is null order by data_vencimento, numero',
    v_tabela,
    v_coluna_relacao
  ) using v_relacao_id
  loop
    v_indice := v_indice + 1;

    execute format('update public.%I set valor = $1 where id = $2', v_tabela)
    using
      case
        when v_indice = v_quantidade_restante
          then v_saldo_restante - (v_valor_parcela * (v_quantidade_restante - 1))
        else v_valor_parcela
      end,
      v_parcela.id;
  end loop;
end;
$$;

grant execute on function public.quitar_parcela(uuid, date, text, numeric) to authenticated;
