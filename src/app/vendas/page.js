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
        .select(
          "id, referencia, descricao, quantidade_estoque, entradas_estoque(preco_sugerido, data_entrada, quantidade_disponivel)",
        )
        .eq("ativo", true)
        .gt("quantidade_estoque", 0)
        .order("referencia"),
      supabase
        .from("vendas")
        .select("id, valor_total, data_venda, clientes(nome)")
        .order("data_venda", { ascending: false })
        .limit(10),
    ]);
  const produtosComPrecoSugerido = (products || []).map(
    ({ entradas_estoque: entradas, ...produto }) => {
      const entradaMaisRecente = (entradas || [])
        .filter((entrada) => entrada.quantidade_disponivel > 0)
        .sort(
          (entradaA, entradaB) =>
            new Date(entradaB.data_entrada) - new Date(entradaA.data_entrada),
        )[0];

      return {
        ...produto,
        preco_sugerido: entradaMaisRecente?.preco_sugerido || null,
      };
    },
  );

  return (
    <GerenciadorVendas
      customers={customers || []}
      products={produtosComPrecoSugerido}
      sales={sales || []}
    />
  );
}
