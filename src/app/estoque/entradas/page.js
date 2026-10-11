import { EntryManager } from "@/components/stock/entry-manager";
import { createClient } from "@/lib/supabase/server";
export default async function EntriesPage() {
  const supabase = await createClient();
  const { data: entradas, error } = await supabase
    .from("entradas_estoque")
    .select(
      "id,produto_id,quantidade,quantidade_disponivel,custo_unitario,preco_sugerido,data_entrada,observacao,produtos(referencia,descricao)",
    )
    .order("data_entrada", { ascending: false });

  const entradasNormalizadas = (entradas || [])
    .filter((entrada) => entrada?.id)
    .map((entrada) => ({
      ...entrada,
      produto: entrada.produtos || null,
    }));

  return (
    <EntryManager
      entries={entradasNormalizadas}
      erroCarregamento={error?.message || ""}
    />
  );
}
