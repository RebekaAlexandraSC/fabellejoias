import { StockManager } from "@/components/stock/stock-manager";
import { createClient } from "@/lib/supabase/server";

const ITENS_POR_PAGINA = 50;

export default async function StockPage({ searchParams }) {
  const parametros = await searchParams;
  const paginaSolicitada = Number(parametros?.pagina || 1);
  const pagina =
    Number.isInteger(paginaSolicitada) && paginaSolicitada > 0
      ? paginaSolicitada
      : 1;
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const supabase = await createClient();
  const [{ data: products, count }, { data: categories }, { data: resumoEstoque }] = await Promise.all([
    supabase
      .from("produtos")
      .select(
        "id, referencia, descricao, categoria_id, imagem_url, quantidade_estoque, estoque_minimo, ativo, categorias(nome)",
        { count: "exact" },
      )
      .order("referencia")
      .range(inicio, inicio + ITENS_POR_PAGINA - 1),
    supabase
      .from("categorias")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome"),
    supabase.rpc("obter_resumo_estoque"),
  ]);

  return (
    <StockManager
      products={products || []}
      categories={categories || []}
      paginaAtual={pagina}
      totalProdutos={count || 0}
      itensPorPagina={ITENS_POR_PAGINA}
      resumoEstoque={resumoEstoque?.[0] || null}
    />
  );
}
