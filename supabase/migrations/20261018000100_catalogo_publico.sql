-- Catalogo publico Fabelle. Execute no SQL Editor do mesmo projeto do aplicativo.
BEGIN;
CREATE TABLE IF NOT EXISTS public.catalogos_publicos (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.catalogos_publicos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalogos_publicos FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.obter_ou_criar_catalogo()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE usuario uuid := auth.uid(); link_token uuid;
BEGIN
  IF usuario IS NULL THEN RAISE EXCEPTION 'Autenticacao necessaria'; END IF;
  INSERT INTO public.catalogos_publicos(user_id) VALUES (usuario)
  ON CONFLICT(user_id) DO NOTHING;
  SELECT token INTO link_token FROM public.catalogos_publicos WHERE user_id = usuario;
  RETURN link_token;
END;
$function$;
REVOKE ALL ON FUNCTION public.obter_ou_criar_catalogo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_ou_criar_catalogo() TO authenticated;

CREATE OR REPLACE FUNCTION public.consultar_catalogo(p_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT jsonb_build_object('produtos', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', p.id, 'referencia', p.referencia, 'descricao', p.descricao,
      'imagem_url', p.imagem_url,
      'valor_venda', (SELECT max(e.preco_sugerido) FROM public.entradas_estoque e
        WHERE e.produto_id = p.id AND e.user_id = c.user_id)
    ) ORDER BY p.referencia, p.id)
    FROM public.produtos p
    WHERE p.user_id = c.user_id AND p.ativo AND p.quantidade_estoque > 0
  ), '[]'::jsonb))
  FROM public.catalogos_publicos c WHERE c.token = p_token;
$function$;
REVOKE ALL ON FUNCTION public.consultar_catalogo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_catalogo(uuid) TO anon, authenticated;
COMMIT;
