-- Registra varias entradas com a mesma data em uma unica transacao.
BEGIN;
CREATE OR REPLACE FUNCTION public.registrar_entradas_estoque(p_data_entrada date, p_itens jsonb)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE usuario uuid := auth.uid(); item record; ids uuid[] := ARRAY[]::uuid[]; entrada_id uuid;
BEGIN
  IF usuario IS NULL THEN RAISE EXCEPTION 'Entre novamente para registrar as entradas.'; END IF;
  IF p_data_entrada IS NULL THEN RAISE EXCEPTION 'Informe a data da entrada.'; END IF;
  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' THEN RAISE EXCEPTION 'Informe uma lista de produtos valida.'; END IF;
  IF jsonb_array_length(p_itens) = 0 THEN RAISE EXCEPTION 'Adicione pelo menos um produto.'; END IF;

  -- Ordem fixa dos bloqueios para lotes com produtos em ordens diferentes.
  PERFORM p.id FROM public.produtos p
  WHERE p.id IN (SELECT (i->>'produto_id')::uuid FROM jsonb_array_elements(p_itens) i)
    AND p.user_id = usuario AND p.ativo
  ORDER BY p.id FOR UPDATE;

  FOR item IN SELECT * FROM jsonb_to_recordset(p_itens) AS i(produto_id uuid, quantidade numeric, custo_unitario numeric, preco_sugerido numeric, observacao text)
  LOOP
    IF item.quantidade IS NULL OR item.quantidade < 1 OR item.quantidade <> trunc(item.quantidade) OR item.quantidade > 2147483647 THEN
      RAISE EXCEPTION 'Informe quantidades inteiras maiores que zero.';
    END IF;
    IF item.custo_unitario IS NULL OR item.preco_sugerido IS NULL OR item.custo_unitario < 0 OR item.preco_sugerido < 0
      OR item.custo_unitario::text IN ('NaN','Infinity','-Infinity') OR item.preco_sugerido::text IN ('NaN','Infinity','-Infinity') THEN
      RAISE EXCEPTION 'Informe custo e preco sugerido validos.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.produtos p WHERE p.id = item.produto_id AND p.user_id = usuario AND p.ativo) THEN
      RAISE EXCEPTION 'Um dos produtos nao esta disponivel. Atualize a lista e selecione novamente.';
    END IF;
    entrada_id := public.registrar_entrada_estoque(item.produto_id, item.quantidade::integer, item.custo_unitario, item.preco_sugerido, p_data_entrada, item.observacao);
    ids := array_append(ids, entrada_id);
  END LOOP;
  RETURN ids;
END;
$function$;
REVOKE ALL ON FUNCTION public.registrar_entradas_estoque(date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_entradas_estoque(date, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
