-- Reabre o valor efetivamente registrado na parcela, sem alterar as demais.
BEGIN;
CREATE OR REPLACE FUNCTION public.desfazer_baixa_parcela(p_parcela_id uuid, p_tipo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE usuario uuid := auth.uid();
BEGIN
  IF usuario IS NULL THEN RAISE EXCEPTION 'Entre novamente para desfazer a baixa.'; END IF;
  IF p_tipo = 'receive' THEN
    UPDATE public.parcelas SET data_pagamento = NULL, forma_pagamento = NULL
    WHERE id = p_parcela_id AND user_id = usuario AND data_pagamento IS NOT NULL;
  ELSIF p_tipo = 'pay' THEN
    UPDATE public.parcelas_saidas SET data_pagamento = NULL, forma_pagamento = NULL
    WHERE id = p_parcela_id AND user_id = usuario AND data_pagamento IS NOT NULL;
  ELSE
    RAISE EXCEPTION 'Tipo de parcela invalido.';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'A parcela nao foi encontrada ou sua baixa ja foi desfeita.'; END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.desfazer_baixa_parcela(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.desfazer_baixa_parcela(uuid, text) TO authenticated;
COMMIT;
