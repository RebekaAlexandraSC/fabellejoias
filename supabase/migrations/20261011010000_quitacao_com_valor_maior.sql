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
  v_valor_original numeric(12, 2);
  v_valor_pago numeric(12, 2);
  v_valor_restante numeric(12, 2);
  v_valor_excedente numeric(12, 2);
  v_saldo_total numeric(12, 2);
  v_data_vencimento date;
  v_venda_id uuid;
  v_saida_id uuid;
  v_quantidade_restante integer;
  v_numero_parcela integer;
  v_indice integer := 0;
  v_acrescimo_base numeric(12, 2);
  v_acrescimo numeric(12, 2);
  v_parcela record;
begin
  if v_user_id is null then
    raise exception 'É necessário estar autenticada';
  end if;

  select valor, venda_id, data_vencimento
  into v_valor_original, v_venda_id, v_data_vencimento
  from public.parcelas
  where id = p_parcela_id
    and user_id = v_user_id
    and data_pagamento is null
  for update;

  if found then
    select coalesce(sum(valor), 0)
    into v_saldo_total
    from public.parcelas
    where venda_id = v_venda_id
      and data_pagamento is null;

    v_valor_pago := coalesce(p_valor_pago, v_valor_original);

    if v_valor_pago <= 0 or v_valor_pago > v_saldo_total then
      raise exception 'O valor informado excede o saldo pendente de R$ %.', v_saldo_total;
    end if;

    if v_valor_pago >= v_valor_original then
      v_valor_excedente := v_valor_pago - v_valor_original;

      update public.parcelas
      set valor = v_valor_pago,
          data_pagamento = coalesce(p_data_pagamento, current_date),
          forma_pagamento = p_forma_pagamento
      where id = p_parcela_id;

      for v_parcela in
        select id, valor
        from public.parcelas
        where venda_id = v_venda_id
          and data_pagamento is null
        order by data_vencimento, numero
      loop
        exit when v_valor_excedente <= 0;

        if v_valor_excedente >= v_parcela.valor then
          v_valor_excedente := v_valor_excedente - v_parcela.valor;
          delete from public.parcelas where id = v_parcela.id;
        else
          update public.parcelas
          set valor = valor - v_valor_excedente
          where id = v_parcela.id;
          v_valor_excedente := 0;
        end if;
      end loop;

      return;
    end if;

    v_valor_restante := v_valor_original - v_valor_pago;

    update public.parcelas
    set valor = v_valor_pago,
        data_pagamento = coalesce(p_data_pagamento, current_date),
        forma_pagamento = p_forma_pagamento
    where id = p_parcela_id;

    select count(*)
    into v_quantidade_restante
    from public.parcelas
    where venda_id = v_venda_id
      and data_pagamento is null;

    if v_quantidade_restante = 0 then
      select coalesce(max(numero), 0) + 1
      into v_numero_parcela
      from public.parcelas
      where venda_id = v_venda_id;

      insert into public.parcelas(
        user_id,
        venda_id,
        numero,
        valor,
        data_vencimento
      )
      values (
        v_user_id,
        v_venda_id,
        v_numero_parcela,
        v_valor_restante,
        v_data_vencimento + interval '1 month'
      );
    else
      v_acrescimo_base := round(v_valor_restante / v_quantidade_restante, 2);

      for v_parcela in
        select id
        from public.parcelas
        where venda_id = v_venda_id
          and data_pagamento is null
        order by data_vencimento, numero
      loop
        v_indice := v_indice + 1;
        v_acrescimo := case
          when v_indice = v_quantidade_restante
            then v_valor_restante - (v_acrescimo_base * (v_quantidade_restante - 1))
          else v_acrescimo_base
        end;

        update public.parcelas
        set valor = valor + v_acrescimo
        where id = v_parcela.id;
      end loop;
    end if;

    return;
  end if;

  select valor, saida_id, data_vencimento
  into v_valor_original, v_saida_id, v_data_vencimento
  from public.parcelas_saidas
  where id = p_parcela_id
    and user_id = v_user_id
    and data_pagamento is null
  for update;

  if not found then
    raise exception 'Parcela não encontrada ou já quitada';
  end if;

  select coalesce(sum(valor), 0)
  into v_saldo_total
  from public.parcelas_saidas
  where saida_id = v_saida_id
    and data_pagamento is null;

  v_valor_pago := coalesce(p_valor_pago, v_valor_original);

  if v_valor_pago <= 0 or v_valor_pago > v_saldo_total then
    raise exception 'O valor informado excede o saldo pendente de R$ %.', v_saldo_total;
  end if;

  if v_valor_pago >= v_valor_original then
    v_valor_excedente := v_valor_pago - v_valor_original;

    update public.parcelas_saidas
    set valor = v_valor_pago,
        data_pagamento = coalesce(p_data_pagamento, current_date),
        forma_pagamento = p_forma_pagamento
    where id = p_parcela_id;

    for v_parcela in
      select id, valor
      from public.parcelas_saidas
      where saida_id = v_saida_id
        and data_pagamento is null
      order by data_vencimento, numero
    loop
      exit when v_valor_excedente <= 0;

      if v_valor_excedente >= v_parcela.valor then
        v_valor_excedente := v_valor_excedente - v_parcela.valor;
        delete from public.parcelas_saidas where id = v_parcela.id;
      else
        update public.parcelas_saidas
        set valor = valor - v_valor_excedente
        where id = v_parcela.id;
        v_valor_excedente := 0;
      end if;
    end loop;

    return;
  end if;

  v_valor_restante := v_valor_original - v_valor_pago;

  update public.parcelas_saidas
  set valor = v_valor_pago,
      data_pagamento = coalesce(p_data_pagamento, current_date),
      forma_pagamento = p_forma_pagamento
  where id = p_parcela_id;

  select count(*)
  into v_quantidade_restante
  from public.parcelas_saidas
  where saida_id = v_saida_id
    and data_pagamento is null;

  if v_quantidade_restante = 0 then
    select coalesce(max(numero), 0) + 1
    into v_numero_parcela
    from public.parcelas_saidas
    where saida_id = v_saida_id;

    insert into public.parcelas_saidas(
      user_id,
      saida_id,
      numero,
      valor,
      data_vencimento
    )
    values (
      v_user_id,
      v_saida_id,
      v_numero_parcela,
      v_valor_restante,
      v_data_vencimento + interval '1 month'
    );
  else
    v_acrescimo_base := round(v_valor_restante / v_quantidade_restante, 2);

    for v_parcela in
      select id
      from public.parcelas_saidas
      where saida_id = v_saida_id
        and data_pagamento is null
      order by data_vencimento, numero
    loop
      v_indice := v_indice + 1;
      v_acrescimo := case
        when v_indice = v_quantidade_restante
          then v_valor_restante - (v_acrescimo_base * (v_quantidade_restante - 1))
        else v_acrescimo_base
      end;

      update public.parcelas_saidas
      set valor = valor + v_acrescimo
      where id = v_parcela.id;
    end loop;
  end if;
end;
$$;

grant execute on function public.quitar_parcela(uuid, date, text, numeric) to authenticated;
