export function calcularItensPorPagina(alturaDisponivel, alturaLinha) {
  return Math.max(1, Math.floor(Math.max(0, alturaDisponivel) / Math.max(1, alturaLinha)));
}
export function paginar(itens, pagina, tamanho) {
  const totalPaginas = Math.max(1, Math.ceil(itens.length / tamanho));
  const paginaAtual = Math.max(1, Math.min(pagina, totalPaginas));
  return { totalPaginas, paginaAtual, itens: itens.slice((paginaAtual - 1) * tamanho, paginaAtual * tamanho) };
}
export function normalizarBusca(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}
export function saldoPendente(parcelas = []) {
  return (parcelas || []).reduce((saldo, parcela) => parcela.data_pagamento == null ? saldo + Math.round(Number(parcela.valor || 0) * 100) : saldo, 0) / 100;
}
