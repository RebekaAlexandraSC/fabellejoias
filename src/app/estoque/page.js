import { StockManager } from "@/components/stock/stock-manager";
import { createClient } from "@/lib/supabase/server";

export default async function StockPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("produtos")
      .select(
        "id, referencia, descricao, categoria_id, quantidade_estoque, estoque_minimo, ativo, categorias(nome)",
      )
      .order("referencia"),
    supabase
      .from("categorias")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome"),
  ]);

  return (
    <StockManager products={products || []} categories={categories || []} />
  );
}
