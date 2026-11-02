export async function reabrirParcela(supabase, parcela) {
  const { error } = await supabase.rpc("desfazer_baixa_parcela", { p_parcela_id: parcela.id, p_tipo: parcela.tipo });
  if (error) {
    if (["PGRST202", "42883"].includes(error.code)) throw new Error("A função de desfazer baixa ainda não está disponível no Supabase. Execute o arquivo ativar-desfazer-baixa.sql no SQL Editor e tente novamente.");
    if (["42501", "PGRST301", "PGRST302"].includes(error.code)) throw new Error("Sua sessão não tem permissão para desfazer esta baixa. Entre novamente e tente outra vez.");
    throw new Error("Não foi possível desfazer a baixa. A parcela pode ter sido alterada. Atualize a página e tente novamente.");
  }
  const tabela = parcela.tipo === "receive" ? "parcelas" : "parcelas_saidas";
  const { data, error: erroConsulta } = await supabase.from(tabela).select("id, data_pagamento, forma_pagamento").eq("id", parcela.id).maybeSingle();
  if (erroConsulta || !data || data.data_pagamento !== null || data.forma_pagamento !== null) {
    throw new Error("Não foi possível confirmar que a parcela voltou a ficar pendente. Atualize a página para conferir antes de tentar novamente.");
  }
}
