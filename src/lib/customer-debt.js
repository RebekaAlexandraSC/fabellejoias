export function agruparDebitosPorCliente(parcelas) {
  const grupos = new Map();
  for (const parcela of parcelas) {
    const clienteId = parcela.vendas?.cliente_id;
    if (!clienteId) continue;
    let grupo = grupos.get(clienteId);
    if (!grupo) {
      grupo = { id: clienteId, cliente_id: clienteId, valor: 0, centavos: 0, data_vencimento: parcela.data_vencimento, vendas: parcela.vendas, quantidade_debitos: 0 };
      grupos.set(clienteId, grupo);
    }
    grupo.centavos += Math.round(Number(parcela.valor) * 100);
    grupo.quantidade_debitos++;
    if (parcela.data_vencimento < grupo.data_vencimento) grupo.data_vencimento = parcela.data_vencimento;
    grupo.valor = grupo.centavos / 100;
  }
  return [...grupos.values()].sort((a,b) => a.data_vencimento.localeCompare(b.data_vencimento) || a.id.localeCompare(b.id));
}
