"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/icon";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const today = new Date().toISOString().slice(0, 10);
const inThirtyDays = new Date(Date.now() + 30 * 86400000)
  .toISOString()
  .slice(0, 10);

export function GerenciadorVendas({ customers, products, sales }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { produto_id: "", quantidade: 1, preco_unitario: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.quantidade || 0) * Number(item.preco_unitario || 0),
        0,
      ),
    [items],
  );
  function atualizarItem(index, field, value) {
    setItems(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }
  async function registrarVenda(form) {
    setSaving(true);
    setMessage("");
    const fields = Object.fromEntries(new FormData(form));
    const validItems = items
      .filter(
        (item) =>
          item.produto_id &&
          Number(item.quantidade) > 0 &&
          item.preco_unitario !== "",
      )
      .map((item) => ({
        produto_id: item.produto_id,
        quantidade: Number(item.quantidade),
        preco_unitario: Number(item.preco_unitario),
      }));
    const { error } = await createClient().rpc("registrar_venda", {
      p_cliente_id: fields.cliente_id,
      p_itens: validItems,
      p_quantidade_parcelas: Number(fields.quantidade_parcelas),
      p_data_venda: fields.data_venda,
      p_primeiro_vencimento: fields.primeiro_vencimento,
      p_observacao: fields.observacao || null,
    });
    setSaving(false);
    if (error)
      return setMessage(error.message || "Não foi possível registrar a venda.");
    setOpen(false);
    setItems([{ produto_id: "", quantidade: 1, preco_unitario: "" }]);
    router.refresh();
  }
  async function excluirVenda(id) {
    if (
      !confirm(
        "Excluir esta venda? As peças voltarão automaticamente aos lotes de origem.",
      )
    )
      return;
    const { error } = await createClient().rpc("excluir_venda", {
      p_venda_id: id,
    });
    if (error)
      return setMessage(error.message || "Não foi possível excluir a venda.");
    router.refresh();
  }
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-[#9b6d64]">Comercial</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#292524] sm:text-4xl">
            Vendas
          </h1>
          <p className="mt-2 text-sm text-[#78716c]">
            Registre vendas e o estoque será baixado automaticamente pelo FIFO.
          </p>
        </div>
        <button
          disabled={!customers.length || !products.length}
          onClick={() => {
            setOpen(true);
            setMessage("");
          }}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50 sm:self-auto"
        >
          <Icon name="plus" size={18} />
          Nova venda
        </button>
      </header>
      {!customers.length || !products.length ? (
        <div className="mb-6 rounded-2xl border border-[#f1dfbd] bg-[#fff9ee] p-4 text-sm text-[#8b681e]">
          Para registrar uma venda, você precisa ter pelo menos uma cliente
          cadastrada e um produto com saldo em estoque.
        </div>
      ) : null}
      <section className="rounded-2xl border border-[#ebe8e5] bg-white shadow-[0_2px_12px_rgba(41,37,36,0.03)]">
        <div className="border-b border-[#f0edeb] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#292524]">
            Vendas recentes
          </h2>
          <p className="mt-1 text-sm text-[#78716c]">
            Histórico das últimas vendas registradas.
          </p>
        </div>
        {sales.length ? (
          <div className="divide-y divide-[#f0edeb]">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[#f8ece9] text-[#9b6d64]">
                    <Icon name="shoppingBag" size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#44403c]">
                      {sale.clientes?.nome || "Cliente"}
                    </p>
                    <p className="text-xs text-[#918b87]">
                      {new Date(
                        `${sale.data_venda}T12:00:00`,
                      ).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <strong className="text-sm text-[#44403c]">
                    {money.format(Number(sale.valor_total))}
                  </strong>
                  <button
                    onClick={() => excluirVenda(sale.id)}
                    className="text-xs font-semibold text-[#9b6d64]"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <span className="grid size-12 place-items-center rounded-full bg-[#f8ece9] text-[#9b6d64]">
              <Icon name="shoppingBag" size={22} />
            </span>
            <h3 className="mt-4 font-semibold text-[#44403c]">
              Ainda não há vendas
            </h3>
            <p className="mt-1 text-sm text-[#78716c]">
              As vendas registradas aparecerão aqui.
            </p>
          </div>
        )}
      </section>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#292524]/35 p-4">
          <div className="mx-auto my-5 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#292524]">
                  Nova venda
                </h2>
                <p className="mt-1 text-sm text-[#78716c]">
                  Os lotes mais antigos serão consumidos primeiro.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-xl text-[#9a9591]"
              >
                ×
              </button>
            </div>
            {message && (
              <p className="mt-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">
                {message}
              </p>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                registrarVenda(event.currentTarget);
              }}
              className="mt-6 space-y-5"
            >
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#57534e]">
                  Cliente
                </span>
                <select
                  name="cliente_id"
                  required
                  className="w-full rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm"
                >
                  <option value="">Selecione a cliente</option>
                  {customers.map((customer) => (
                    <option value={customer.id} key={customer.id}>
                      {customer.nome}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#57534e]">
                    Itens
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setItems([
                        ...items,
                        { produto_id: "", quantidade: 1, preco_unitario: "" },
                      ])
                    }
                    className="text-sm font-semibold text-[#9b6d64]"
                  >
                    Adicionar item
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_80px_100px_24px] gap-2"
                    >
                      <select
                        value={item.produto_id}
                        onChange={(event) =>
                          atualizarItem(index, "produto_id", event.target.value)
                        }
                        required
                        className="min-w-0 rounded-xl border border-[#ded8d4] px-2 text-sm"
                      >
                        <option value="">Produto</option>
                        {products.map((product) => (
                          <option value={product.id} key={product.id}>
                            {product.referencia} ({product.quantidade_estoque})
                          </option>
                        ))}
                      </select>
                      <input
                        value={item.quantidade}
                        onChange={(event) =>
                          atualizarItem(index, "quantidade", event.target.value)
                        }
                        type="number"
                        min="1"
                        required
                        className="rounded-xl border border-[#ded8d4] px-2 text-sm"
                      />
                      <input
                        value={item.preco_unitario}
                        onChange={(event) =>
                          atualizarItem(
                            index,
                            "preco_unitario",
                            event.target.value,
                          )
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="Preço"
                        className="rounded-xl border border-[#ded8d4] px-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={items.length === 1}
                        onClick={() =>
                          setItems(
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="text-[#9a817b] disabled:opacity-30"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-[#faf6f4] p-4 text-right">
                <span className="text-sm text-[#78716c]">Total da venda</span>
                <p className="text-2xl font-semibold text-[#292524]">
                  {money.format(total)}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="data_venda"
                  label="Data da venda"
                  type="date"
                  defaultValue={today}
                  required
                />
                <Field
                  name="quantidade_parcelas"
                  label="Número de parcelas"
                  type="number"
                  min="1"
                  defaultValue="1"
                  required
                />
                <Field
                  name="primeiro_vencimento"
                  label="Primeiro vencimento"
                  type="date"
                  defaultValue={inThirtyDays}
                  required
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#57534e]">
                  Observação
                </span>
                <textarea
                  name="observacao"
                  rows="2"
                  className="w-full rounded-xl border border-[#ded8d4] p-3 text-sm"
                />
              </label>
              <button
                disabled={saving || !total}
                className="w-full rounded-xl bg-[#9b6d64] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Registrando..." : "Confirmar venda"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#57534e]">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm"
      />
    </label>
  );
}
