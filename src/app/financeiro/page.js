import { FinanceManager } from "@/components/finance/finance-manager";
import { createClient } from "@/lib/supabase/server";

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
  ] = await Promise.all([
    supabase
      .from("parcelas")
      .select("id, valor, data_vencimento, vendas(clientes(nome, telefone))")
      .is("data_pagamento", null)
      .order("data_vencimento")
      .limit(20),
    supabase
      .from("parcelas_saidas")
      .select("id, valor, data_vencimento, saidas(descricao)")
      .is("data_pagamento", null)
      .order("data_vencimento")
      .limit(20),
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
  ]);
  return (
    <FinanceManager
      receivables={receivables || []}
      payables={payables || []}
      saidas={saidas || []}
      contasRecebidas={received || []}
      contasPagas={paid || []}
    />
  );
}
