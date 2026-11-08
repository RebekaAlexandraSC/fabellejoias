import { StockManager } from "@/components/stock/stock-manager";
import { createClient } from "@/lib/supabase/server";
import { listarProdutosAtivos } from "@/lib/stock-products";
import { listarTodos } from "@/lib/listar-todos";
import { prepararProdutoEstoque } from "@/lib/stock-prices";
export default async function StockPage({ searchParams }) {
  const parametros = await searchParams;
  const supabase = await createClient();
  const [produtos, produtosEntrada, clientes] = await Promise.all([
    listarTodos(() => supabase.from("produtos").select("id,referencia,descricao,imagem_url,quantidade_estoque,ativo,entradas_estoque(id,custo_unitario,preco_sugerido,quantidade_disponivel,data_entrada)").eq("ativo",true).gt("quantidade_estoque",0).order("referencia").order("id")),
    listarProdutosAtivos(supabase),
    listarTodos(() => supabase.from("clientes").select("id,nome,telefone,observacao").eq("ativo",true).order("nome").order("id")),
  ]);
  return <StockManager products={produtos.data.map(prepararProdutoEstoque)} produtosEntrada={produtosEntrada.data}
    clientesCatalogo={clientes.data}
    erroClientesCatalogo={clientes.error ? "Não foi possível carregar as clientes. Atualize a página para tentar novamente." : ""}
    erroCarregamento={produtos.error ? "Não foi possível carregar o estoque. Atualize a página para tentar novamente." : ""}
    erroProdutosEntrada={produtosEntrada.error ? "Não foi possível carregar os produtos para registrar entradas. Atualize a página para tentar novamente." : ""}
    buscaInicial={typeof parametros?.busca === "string" ? parametros.busca : ""} />;
}
