export function prepararProdutoEstoque({ entradas_estoque = [], ...produto }) {
  const disponiveis = entradas_estoque.filter((entrada) => Number(entrada.quantidade_disponivel) > 0).sort((a,b) => a.data_entrada.localeCompare(b.data_entrada) || a.id.localeCompare(b.id));
  const precos = entradas_estoque.map((entrada) => entrada.preco_sugerido == null ? NaN : Number(entrada.preco_sugerido)).filter(Number.isFinite);
  return { ...produto, custo_unitario: disponiveis[0]?.custo_unitario ?? null, valor_venda: precos.length ? Math.max(...precos) : null };
}
