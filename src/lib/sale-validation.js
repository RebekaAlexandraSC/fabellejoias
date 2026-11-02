export function validarEstoqueVenda(itens, produtos) {
  const quantidades = new Map();
  for (const item of itens) {
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1) return "Informe uma quantidade inteira maior que zero para cada produto.";
    quantidades.set(item.produto_id, (quantidades.get(item.produto_id) || 0) + item.quantidade);
  }
  for (const [id, quantidade] of quantidades) {
    const produto = produtos.find((item) => item.id === id);
    if (!produto) return "Um dos produtos não está mais disponível. Atualize a página e selecione os itens novamente.";
    const disponivel = Number(produto.quantidade_estoque || 0);
    if (quantidade > disponivel) {
      return `Estoque insuficiente para o produto ${produto.referencia}. Você adicionou ${quantidade} ${quantidade === 1 ? "unidade" : "unidades"}, mas ${disponivel === 0 ? "não há unidades disponíveis" : `há ${disponivel === 1 ? "apenas 1 unidade disponível" : `apenas ${disponivel} unidades disponíveis`}`}. Reduza a quantidade ou registre uma nova entrada no estoque. Itens repetidos são somados.`;
    }
  }
  return "";
}
export function mensagemErroVenda(error) {
  const texto = String(error?.message || "");
  if (/produtos_quantidade_estoque_check|estoque insuficiente|saldo insuficiente/i.test(texto)) {
    return "Não foi possível concluir a venda porque não há estoque suficiente para um dos produtos. Confira as quantidades, incluindo os itens repetidos. Se o estoque mudou, atualize a página antes de tentar novamente.";
  }
  if (/produto não encontrado/i.test(texto)) return "Um dos produtos não está mais disponível. Atualize a página e selecione os itens novamente.";
  if (/cliente não encontrada/i.test(texto)) return "Esta cliente não está mais disponível. Atualize a página e selecione a cliente novamente.";
  if (/autenticad/i.test(texto)) return "Sua sessão expirou. Entre novamente para registrar a venda.";
  if (/parcelas inválida/i.test(texto)) return "Informe uma quantidade de parcelas válida, maior que zero.";
  return "Não foi possível registrar a venda. Seus dados foram mantidos. Tente novamente em instantes.";
}
