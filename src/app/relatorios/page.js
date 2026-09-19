import { createClient } from "@/lib/supabase/server";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function ReportsPage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const supabase = await createClient();
  const [
    { data: sales },
    { data: expenses },
    { data: paidReceivables },
    { data: paidPayables },
    { data: stock },
  ] = await Promise.all([
    supabase
      .from("vendas")
      .select("valor_total")
      .gte("data_venda", firstDay)
      .lte("data_venda", lastDay),
    supabase
      .from("saidas")
      .select("valor_total")
      .gte("data_saida", firstDay)
      .lte("data_saida", lastDay),
    supabase
      .from("parcelas")
      .select("valor")
      .gte("data_pagamento", firstDay)
      .lte("data_pagamento", lastDay),
    supabase
      .from("parcelas_saidas")
      .select("valor")
      .gte("data_pagamento", firstDay)
      .lte("data_pagamento", lastDay),
    supabase.from("produtos").select("quantidade_estoque").eq("ativo", true),
  ]);
  const sum = (rows) =>
    (rows || []).reduce((total, row) => total + Number(row.valor || 0), 0);
  const cards = [
    ["Faturamento", sum(sales), "Vendas realizadas no mês"],
    [
      "Entradas recebidas",
      sum(paidReceivables),
      "Parcelas efetivamente recebidas",
    ],
    ["Saídas pagas", sum(paidPayables), "Parcelas efetivamente pagas"],
    ["Despesas lançadas", sum(expenses), "Compromissos criados no mês"],
  ];
  const pieces = (stock || []).reduce(
    (total, product) => total + product.quantidade_estoque,
    0,
  );
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#9b6d64]">Análises</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#292524] sm:text-4xl">
          Relatórios
        </h1>
        <p className="mt-2 text-sm text-[#78716c]">
          Resumo financeiro e operacional do mês atual.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, value, detail]) => (
          <article
            key={title}
            className="rounded-2xl border border-[#ebe8e5] bg-white p-5 shadow-[0_2px_12px_rgba(41,37,36,0.03)]"
          >
            <p className="text-sm font-medium text-[#78716c]">{title}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[#292524]">
              {money.format(value)}
            </p>
            <p className="mt-3 text-xs text-[#9a9591]">{detail}</p>
          </article>
        ))}
      </section>
      <section className="mt-7 rounded-2xl border border-[#ebe8e5] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#292524]">Estoque atual</h2>
        <p className="mt-1 text-sm text-[#78716c]">
          Você possui{" "}
          <strong className="font-semibold text-[#57534e]">
            {pieces} peças
          </strong>{" "}
          disponíveis nas referências ativas.
        </p>
        <p className="mt-5 text-sm leading-6 text-[#78716c]">
          Os indicadores financeiros diferenciam vendas e despesas lançadas do
          dinheiro que realmente entrou ou saiu, com base nas parcelas quitadas.
        </p>
      </section>
    </div>
  );
}
