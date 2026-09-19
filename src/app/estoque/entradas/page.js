import { EntryManager } from "@/components/stock/entry-manager";
import { createClient } from "@/lib/supabase/server";
export default async function EntriesPage() {
  const supabase = await createClient();
  const [{ data: entradas, error }, { data: produtos }] = await Promise.all([
    supabase
      .from("entradas_estoque")
      .select(
        "id,produto_id,quantidade,quantidade_disponivel,custo_unitario,preco_sugerido,data_entrada,observacao",
      )
      .order("data_entrada", { ascending: false }),
    supabase.from("produtos").select("id,referencia,descricao"),
  ]);

  const produtosPorId = new Map(
    (produtos || []).filter(Boolean).map((produto) => [produto.id, produto]),
  );

  const entradasNormalizadas = (entradas || [])
    .filter((entrada) => entrada?.id)
    .map((entrada) => ({
      ...entrada,
      produto: produtosPorId.get(entrada.produto_id) || null,
    }));

  return (
    <EntryManager
      entries={entradasNormalizadas}
      erroCarregamento={error?.message || ""}
    />
  );
}
