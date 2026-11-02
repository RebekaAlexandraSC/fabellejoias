import { StockManager } from "@/components/stock/stock-manager";
import { createClient } from "@/lib/supabase/server";
import { listarProdutosAtivos } from "@/lib/stock-products";
import { listarTodos } from "@/lib/listar-todos";

export default async function StockPage({ searchParams }) {
  const parametros = await searchParams;
  const supabase = await createClient();
  const [produtos, categorias, resumo, produtosEntrada, clientes] = await Promise.all([
    listarTodos(() => supabase.from("produtos").select("id, referencia, descricao, categoria_id, imagem_url, quantidade_estoque, estoque_minimo, ativo, categorias(nome)").order("referencia").order("id")),
    supabase.from("categorias").select("id, nome").eq("ativo", true).order("nome"),
    supabase.rpc("obter_resumo_estoque"),
    listarProdutosAtivos(supabase),
    listarTodos(() => supabase.from("clientes").select("id,nome,telefone,observacao").eq("ativo", true).order("nome").order("id")),
  ]);
  return <StockManager products={produtos.data} categories={categorias.data || []}
    produtosEntrada={produtosEntrada.data}
    clientesCatalogo={clientes.data}
    erroClientesCatalogo={clientes.error ? "Não foi possível carregar as clientes. Atualize a página para tentar novamente." : ""}
    erroCarregamento={produtos.error ? "Não foi possível carregar os produtos. Atualize a página para tentar novamente." : ""}
    erroProdutosEntrada={produtosEntrada.error ? "Não foi possível carregar os produtos ativos para registrar entradas. Atualize a página para tentar novamente." : ""}
    totalProdutos={produtos.data.length} resumoEstoque={resumo.data?.[0] || null}
    buscaInicial={typeof parametros?.busca === "string" ? parametros.busca : ""} />;
}
