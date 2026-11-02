import { FinanceManager } from "@/components/finance/finance-manager";
import { createClient } from "@/lib/supabase/server";

import { listarTodos } from "@/lib/listar-todos";
export default async function FinancePage() {
  const supabase = await createClient();
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const [
    { data: receivables },
    { data: payables },
    { data: saidas },
    { data: received },
    { data: paid },
    historicoRecebidas,
    historicoPagas,
  ] = await Promise.all([
    listarTodos(() => supabase
      .from("parcelas")
      .select("id, valor, data_vencimento, vendas(clientes(nome, telefone))")
      .is("data_pagamento", null)
      .order("data_vencimento").order("id")),
    listarTodos(() => supabase
      .from("parcelas_saidas")
      .select("id, valor, data_vencimento, saidas(descricao)")
      .is("data_pagamento", null)
      .order("data_vencimento").order("id")),
    supabase
      .from("saidas")
      .select(
        "id, descricao, categoria, valor_total, quantidade_parcelas, data_saida",
      )
      .order("data_saida", { ascending: false })
      .limit(50),
    supabase
      .from("parcelas")
      .select("id, valor")
      .gte("data_pagamento", primeiroDiaMes)
      .lte("data_pagamento", ultimoDiaMes),
    supabase
      .from("parcelas_saidas")
      .select("id, valor")
      .gte("data_pagamento", primeiroDiaMes)
      .lte("data_pagamento", ultimoDiaMes),
    listarTodos(() => supabase.from("parcelas")
      .select("id, numero, valor, data_vencimento, data_pagamento, vendas(clientes(nome))")
      .not("data_pagamento", "is", null).order("data_pagamento", { ascending: false }).order("id")),
    listarTodos(() => supabase.from("parcelas_saidas")
      .select("id, numero, valor, data_vencimento, data_pagamento, saidas(descricao)")
      .not("data_pagamento", "is", null).order("data_pagamento", { ascending: false }).order("id")),
  ]);
  return (
    <FinanceManager
      receivables={receivables || []}
      payables={payables || []}
      saidas={saidas || []}
      contasRecebidas={received || []}
      contasPagas={paid || []}
      historicoBaixas={[
        ...historicoRecebidas.data.map((item) => ({ ...item, tipo: "receive", nome: item.vendas?.clientes?.nome || "Cliente" })),
        ...historicoPagas.data.map((item) => ({ ...item, tipo: "pay", nome: item.saidas?.descricao || "Saída" })),
      ].sort((a, b) => b.data_pagamento.localeCompare(a.data_pagamento) || a.id.localeCompare(b.id))}
      erroHistorico={historicoRecebidas.error || historicoPagas.error ? "Não foi possível carregar todo o histórico de baixas. Atualize a página para tentar novamente." : ""}
    />
  );
}
