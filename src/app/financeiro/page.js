import { FinanceManager } from "@/components/finance/finance-manager";
import { createClient } from "@/lib/supabase/server";

export default async function FinancePage() {
  const supabase = await createClient();
  const [{ data: receivables }, { data: payables }] = await Promise.all([
    supabase
      .from("parcelas")
      .select("id, valor, data_vencimento, vendas(clientes(nome))")
      .is("data_pagamento", null)
      .order("data_vencimento")
      .limit(20),
    supabase
      .from("parcelas_saidas")
      .select("id, valor, data_vencimento, saidas(descricao)")
      .is("data_pagamento", null)
      .order("data_vencimento")
      .limit(20),
  ]);
  return (
    <FinanceManager receivables={receivables || []} payables={payables || []} />
  );
}
