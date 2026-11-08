export function resumirMovimentacao(vendas, parcelas) {
  const centavos = (valor) => Math.round(Number(valor || 0) * 100);
  const pendencias = new Map();
  let recebidos = 0;
  let aberto = 0;
  for (const parcela of parcelas) {
    if (parcela.data_pagamento == null) {
      aberto += centavos(parcela.valor);
      pendencias.set(parcela.venda_id, (pendencias.get(parcela.venda_id) || 0) + centavos(parcela.valor));
    } else recebidos += centavos(parcela.valor);
  }
  return {
    totalVendas: vendas.reduce((total, venda) => total + centavos(venda.valor_total), 0) / 100,
    totalRecebido: recebidos / 100,
    saldoAberto: aberto / 100,
    vendas: vendas.map((venda) => ({ ...venda, saldoAberto: (pendencias.get(venda.id) || 0) / 100 })),
    pagamentos: parcelas.filter((parcela) => parcela.data_pagamento != null).sort((a,b) => b.data_pagamento.localeCompare(a.data_pagamento) || a.id.localeCompare(b.id)),
  };
}
