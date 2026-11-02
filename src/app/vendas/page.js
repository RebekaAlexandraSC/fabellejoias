import { GerenciadorVendas } from "@/components/sales/sales-manager";
import { createClient } from "@/lib/supabase/server";

import { listarTodos } from "@/lib/listar-todos";
export default async function PaginaVendas() {
  const supabase = await createClient();
  const [{ data: customers }, { data: products }, { data: sales, error: salesError }] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("id, nome, observacao")
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
      listarTodos(() => supabase
        .from("vendas")
        .select("id, cliente_id, valor_total, data_venda, clientes(id, nome, observacao), parcelas(valor, data_pagamento)")
        .order("data_venda", { ascending: false })
        .order("id")),
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
      erroCarregamento={salesError ? "Não foi possível carregar o histórico de vendas. Atualize a página para tentar novamente." : ""}
    />
  );
}
