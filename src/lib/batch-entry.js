import { converterMoedaParaNumero } from "./money";
export function prepararEntradas(itens, produtos) {
  if (!itens.length) throw new Error("Adicione pelo menos um produto à entrada.");
  return itens.map((item, indice) => {
    const numero = indice + 1;
    if (!produtos.some((produto) => produto.id === item.produto_id)) throw new Error(`Selecione um produto válido no item ${numero}.`);
    const quantidade = Number(item.quantidade);
    if (!Number.isSafeInteger(quantidade) || quantidade < 1) throw new Error(`Informe uma quantidade inteira maior que zero no item ${numero}.`);
    const custo = converterMoedaParaNumero(item.custo_unitario);
    const preco = converterMoedaParaNumero(item.preco_sugerido);
    if (String(item.custo_unitario).trim() === "" || String(item.preco_sugerido).trim() === "" || !Number.isFinite(custo) || !Number.isFinite(preco) || custo < 0 || preco < 0) throw new Error(`Informe custo e preço sugerido válidos no item ${numero}.`);
    return { produto_id: item.produto_id, quantidade, custo_unitario: custo, preco_sugerido: preco, observacao: String(item.observacao || "").trim() || null };
  });
}
