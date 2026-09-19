import { CustomerManager } from "@/components/customers/customer-manager";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("clientes")
    .select("id, nome, telefone, observacao, ativo, created_at")
    .order("nome");
  return <CustomerManager customers={customers || []} />;
}
