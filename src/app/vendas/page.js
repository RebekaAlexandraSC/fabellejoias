import { GerenciadorVendas } from "@/components/sales/sales-manager";
import { createClient } from "@/lib/supabase/server";

export default async function PaginaVendas() {
  const supabase = await createClient();
  const [{ data: customers }, { data: products }, { data: sales }] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("produtos")
        .select("id, referencia, descricao, quantidade_estoque")
        .eq("ativo", true)
        .gt("quantidade_estoque", 0)
        .order("referencia"),
      supabase
        .from("vendas")
        .select("id, valor_total, data_venda, clientes(nome)")
        .order("data_venda", { ascending: false })
        .limit(10),
    ]);
  return (
    <GerenciadorVendas
      customers={customers || []}
      products={products || []}
      sales={sales || []}
    />
  );
}
