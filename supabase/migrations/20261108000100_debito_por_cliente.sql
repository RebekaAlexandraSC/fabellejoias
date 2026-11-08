-- Recebimento por cliente: baixa o valor recebido e transfere o saldo ao mes seguinte.
BEGIN;
CREATE OR REPLACE FUNCTION public.receber_debito_cliente(p_cliente_id uuid, p_valor_pago numeric, p_data_pagamento date, p_forma_pagamento text DEFAULT 'pix')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  usuario uuid := auth.uid(); ids uuid[] := ARRAY[]::uuid[]; registro record;
  total numeric(12,2); restante numeric(12,2); aplicado numeric(12,2);
  proximo_vencimento date; proximo_numero integer;
BEGIN
  IF usuario IS NULL THEN RAISE EXCEPTION 'Entre novamente para registrar o recebimento.'; END IF;
  IF p_data_pagamento IS NULL THEN RAISE EXCEPTION 'Informe a data do pagamento.'; END IF;
  IF p_valor_pago IS NULL OR p_valor_pago <= 0 OR p_valor_pago::text IN ('NaN','Infinity','-Infinity') OR round(p_valor_pago,2) <> p_valor_pago THEN RAISE EXCEPTION 'Informe um valor recebido valido, com ate duas casas decimais.'; END IF;
  IF p_forma_pagamento IS NULL OR p_forma_pagamento NOT IN ('pix','dinheiro','debito','credito') THEN RAISE EXCEPTION 'Forma de pagamento invalida.'; END IF;
  PERFORM 1 FROM public.clientes WHERE id=p_cliente_id AND user_id=usuario FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente nao encontrada.'; END IF;
  FOR registro IN
    SELECT p.id FROM public.parcelas p JOIN public.vendas v ON v.id=p.venda_id
    WHERE p.user_id=usuario AND v.user_id=usuario AND v.cliente_id=p_cliente_id AND p.data_pagamento IS NULL
    ORDER BY p.id FOR UPDATE OF p
  LOOP ids := array_append(ids, registro.id); END LOOP;
  SELECT coalesce(sum(valor),0) INTO total FROM public.parcelas WHERE id=ANY(ids);
  IF total <= 0 THEN RAISE EXCEPTION 'Esta cliente nao possui debito pendente. Atualize a pagina.'; END IF;
  IF p_valor_pago > total THEN RAISE EXCEPTION 'O valor recebido ultrapassa o saldo de R$ %. Atualize a pagina e confira o valor.',total; END IF;
  -- PostgreSQL ajusta automaticamente dias inexistentes no mes seguinte.
  proximo_vencimento := (p_data_pagamento + interval '1 month')::date;
  restante := p_valor_pago;
  FOR registro IN SELECT * FROM public.parcelas WHERE id=ANY(ids) ORDER BY data_vencimento, created_at, id
  LOOP
    IF restante > 0 THEN
      aplicado := least(restante, registro.valor);
      UPDATE public.parcelas SET valor=aplicado, data_pagamento=p_data_pagamento, forma_pagamento=p_forma_pagamento WHERE id=registro.id;
      IF aplicado < registro.valor THEN
        SELECT coalesce(max(numero),0)+1 INTO proximo_numero FROM public.parcelas WHERE venda_id=registro.venda_id;
        INSERT INTO public.parcelas(user_id,venda_id,numero,valor,data_vencimento,observacao)
        VALUES(usuario,registro.venda_id,proximo_numero,registro.valor-aplicado,proximo_vencimento,registro.observacao);
      END IF;
      restante := restante-aplicado;
    ELSE
      UPDATE public.parcelas SET data_vencimento=proximo_vencimento WHERE id=registro.id;
    END IF;
  END LOOP;
END;
$function$;
REVOKE ALL ON FUNCTION public.receber_debito_cliente(uuid,numeric,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receber_debito_cliente(uuid,numeric,date,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
