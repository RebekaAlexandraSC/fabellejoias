import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

export default async function Home() {
  const dashboard = await getDashboardData();
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-[#9b6d64]">Visão geral</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#292524] sm:text-4xl">
            Olá, seja bem-vinda!
          </h1>
          <p className="mt-2 text-sm text-[#78716c]">
            Acompanhe o que acontece na sua loja hoje.
          </p>
        </div>
        <Link
          href="/vendas"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#855b53]"
        >
          <Icon name="plus" size={18} />
          Nova venda
        </Link>
      </header>

      <section
        aria-label="Resumo financeiro"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <DashboardCard
          title="Vendas do mês"
          value={currency.format(dashboard.salesThisMonth)}
          detail={`${dashboard.salesCount} ${dashboard.salesCount === 1 ? "venda registrada" : "vendas registradas"}`}
          icon="shoppingBag"
          tone="rose"
        />
        <DashboardCard
          title="A receber"
          value={currency.format(dashboard.receivable)}
          detail={`${dashboard.receivableCount} parcela${dashboard.receivableCount === 1 ? " pendente" : "s pendentes"}`}
          icon="wallet"
          tone="amber"
        />
        <DashboardCard
          title="A pagar"
          value={currency.format(dashboard.payable)}
          detail={`${dashboard.payableCount} parcela${dashboard.payableCount === 1 ? " pendente" : "s pendentes"}`}
          icon="receipt"
          tone="violet"
        />
        <DashboardCard
          title="Estoque"
          value={`${dashboard.stockQuantity} peças`}
          detail={
            dashboard.stockQuantity
              ? `${currency.format(dashboard.stockValue)} em custo`
              : "Cadastre suas primeiras peças"
          }
          icon="gem"
          tone="emerald"
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-[#ebe8e5] bg-white p-5 shadow-[0_2px_12px_rgba(41,37,36,0.03)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#292524]">
                Vendas recentes
              </h2>
              <p className="mt-1 text-sm text-[#78716c]">
                Suas últimas movimentações aparecerão aqui.
              </p>
            </div>
            <button className="text-sm font-semibold text-[#9b6d64] transition hover:text-[#75504a]">
              Ver todas
            </button>
          </div>
          {dashboard.recentSales.length ? (
            <div className="mt-6 divide-y divide-[#f1eeec]">
              {dashboard.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f8ece9] text-[#9b6d64]">
                      <Icon name="shoppingBag" size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#44403c]">
                        {sale.clientes?.nome || "Cliente não identificado"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#9a9591]">
                        {formatDate(sale.data_venda)}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-[#44403c]">
                    {currency.format(Number(sale.valor_total))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptySales />
          )}
        </div>

        <div className="rounded-2xl border border-[#ebe8e5] bg-white p-5 shadow-[0_2px_12px_rgba(41,37,36,0.03)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#292524]">Atenção</h2>
              <p className="mt-1 text-sm text-[#78716c]">
                Itens que precisam de cuidado.
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-[#fff5df] text-[#c58b2c]">
              <Icon name="bell" size={18} />
            </span>
          </div>
          <div className="mt-6 space-y-3">
            <Notice
              icon="box"
              title="Estoque baixo"
              text={
                dashboard.lowStockCount
                  ? `${dashboard.lowStockCount} produto${dashboard.lowStockCount > 1 ? "s precisam" : " precisa"} de reposição.`
                  : "Nenhum produto com alerta."
              }
              alert={dashboard.lowStockCount > 0}
            />
            <Notice
              icon="calendar"
              title="Contas vencidas"
              text={
                dashboard.overdueCount
                  ? `${dashboard.overdueCount} parcela${dashboard.overdueCount > 1 ? "s vencidas" : " vencida"} para acompanhar.`
                  : "Nenhuma parcela vencida."
              }
              alert={dashboard.overdueCount > 0}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptySales() {
  return (
    <div className="mt-8 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[#e7e2de] bg-[#fdfcfb] px-5 text-center">
      <span className="mb-3 grid size-11 place-items-center rounded-full bg-[#f7ebe8] text-[#9b6d64]">
        <Icon name="shoppingBag" size={21} />
      </span>
      <h3 className="font-semibold text-[#44403c]">Ainda não há vendas</h3>
      <p className="mt-1 max-w-xs text-sm leading-6 text-[#78716c]">
        Quando você registrar uma venda, ela aparecerá neste espaço.
      </p>
    </div>
  );
}

function Notice({ icon, title, text, alert = false }) {
  return (
    <div
      className={`flex gap-3 rounded-xl p-3.5 ${alert ? "bg-[#fff8ed]" : "bg-[#faf9f8]"}`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg bg-white shadow-sm ${alert ? "text-[#c58b2c]" : "text-[#9a817b]"}`}
      >
        <Icon name={icon} size={18} />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-[#57534e]">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-[#8a8581]">{text}</p>
      </div>
    </div>
  );
}

async function getDashboardData() {
  const supabase = await createClient();
  const today = new Date();
  const todayISO = formatISODate(today);
  const firstDay = formatISODate(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const lastDay = formatISODate(
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
  );
  const [
    sales,
    receivable,
    payable,
    products,
    inventoryLots,
    recentSales,
    overdueReceivable,
    overduePayable,
  ] = await Promise.all([
    supabase
      .from("vendas")
      .select("valor_total")
      .gte("data_venda", firstDay)
      .lte("data_venda", lastDay),
    supabase.from("parcelas").select("valor").is("data_pagamento", null),
    supabase.from("parcelas_saidas").select("valor").is("data_pagamento", null),
    supabase
      .from("produtos")
      .select("quantidade_estoque, estoque_minimo")
      .eq("ativo", true),
    supabase
      .from("entradas_estoque")
      .select("quantidade_disponivel, custo_unitario")
      .gt("quantidade_disponivel", 0),
    supabase
      .from("vendas")
      .select("id, valor_total, data_venda, clientes(nome)")
      .order("data_venda", { ascending: false })
      .limit(5),
    supabase
      .from("parcelas")
      .select("id")
      .is("data_pagamento", null)
      .lt("data_vencimento", todayISO),
    supabase
      .from("parcelas_saidas")
      .select("id")
      .is("data_pagamento", null)
      .lt("data_vencimento", todayISO),
  ]);
  const sum = (rows, field) =>
    (rows || []).reduce((total, row) => total + Number(row[field] || 0), 0);
  const productRows = products.data || [];
  return {
    salesThisMonth: sum(sales.data, "valor_total"),
    salesCount: sales.data?.length || 0,
    receivable: sum(receivable.data, "valor"),
    receivableCount: receivable.data?.length || 0,
    payable: sum(payable.data, "valor"),
    payableCount: payable.data?.length || 0,
    stockQuantity: sum(productRows, "quantidade_estoque"),
    stockValue: (inventoryLots.data || []).reduce(
      (total, lot) =>
        total + Number(lot.quantidade_disponivel) * Number(lot.custo_unitario),
      0,
    ),
    lowStockCount: productRows.filter(
      (product) => product.quantidade_estoque <= product.estoque_minimo,
    ).length,
    overdueCount:
      (overdueReceivable.data?.length || 0) +
      (overduePayable.data?.length || 0),
    recentSales: recentSales.data || [],
  };
}

function formatISODate(date) {
  return date.toISOString().slice(0, 10);
}
function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}
