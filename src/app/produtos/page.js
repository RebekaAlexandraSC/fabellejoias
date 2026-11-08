import { StockManager } from "@/components/stock/stock-manager";
import { createClient } from "@/lib/supabase/server";
import { listarTodos } from "@/lib/listar-todos";
export default async function ProductsPage() {
  const supabase = await createClient();
  const [produtos, categorias] = await Promise.all([
    listarTodos(() => supabase.from("produtos").select("id,referencia,descricao,categoria_id,imagem_url,quantidade_estoque,estoque_minimo,ativo,categorias(nome)").order("referencia").order("id")),
    listarTodos(() => supabase.from("categorias").select("id,nome,descricao,ativo").order("nome").order("id")),
  ]);
  return <StockManager modo="produtos" products={produtos.data} categories={categorias.data}
    erroCarregamento={produtos.error || categorias.error ? "Não foi possível carregar todos os cadastros. Atualize a página para tentar novamente." : ""} />;
}
