"use client";
import { MoneyInput } from "@/components/ui/money-input";
import { formatarMoeda, formatarValorDoBanco, converterMoedaParaNumero } from "@/lib/money";
import { useConfirmation } from "@/components/ui/confirmation-provider";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/icon";
import { useViewportPagination } from "@/hooks/use-viewport-pagination";
import { ListPagination } from "@/components/ui/list-pagination";
import { saldoPendente } from "@/lib/list-pagination";
import { validarEstoqueVenda, mensagemErroVenda } from "@/lib/sale-validation";
import { SaleDetailsDialog } from "@/components/sales/sale-details-dialog";
import { dataVendaHoje, vencimentoMesSeguinte } from "@/lib/sale-dates";
import { CampoSelecao } from "@/components/ui/campo-selecao";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function GerenciadorVendas({ customers, products, sales, erroCarregamento = "" }) {
  const router = useRouter();
  const confirmAction = useConfirmation();
  const [open, setOpen] = useState(false);
  const [dataVenda, setDataVenda] = useState(dataVendaHoje);
  const [primeiroVencimento, setPrimeiroVencimento] = useState(() => vencimentoMesSeguinte(dataVenda));
  const [vendaDetalhada, setVendaDetalhada] = useState(null);
  const [items, setItems] = useState([
    { produto_id: "", quantidade: 1, preco_unitario: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [message, setMessage] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const clientesFiltro = useMemo(() => {
    const mapa = new Map(customers.map((cliente) => [cliente.id, cliente]));
    for (const venda of sales) {
      if (venda.clientes && venda.cliente_id && !mapa.has(venda.cliente_id)) mapa.set(venda.cliente_id, { ...venda.clientes, id: venda.cliente_id });
    }
    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [customers, sales]);
  const [situacao, setSituacao] = useState("todas");
  const vendasFiltradas = useMemo(() => sales.map((sale) => ({ ...sale, saldoPendente: saldoPendente(sale.parcelas) })).filter((sale) => {
    return (!clienteFiltro || sale.cliente_id === clienteFiltro)
      && (situacao === "todas" || (situacao === "pendentes" ? sale.saldoPendente > 0 : sale.saldoPendente === 0));
  }), [sales, situacao, clienteFiltro]);
  const pagination = useViewportPagination(vendasFiltradas, situacao + "|" + clienteFiltro, 89);
  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantidade || 0) *
            converterMoedaParaNumero(item.preco_unitario),
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
  function selecionarProduto(index, produtoId) {
    const produto = products.find((item) => item.id === produtoId);
    const precoSugerido =
      produto?.preco_sugerido != null
        ? formatarValorDoBanco(produto.preco_sugerido)
        : "";

    setItems(
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              produto_id: produtoId,
              preco_unitario: precoSugerido || item.preco_unitario,
            }
          : item,
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
        preco_unitario: converterMoedaParaNumero(item.preco_unitario),
      }));
    if (!clienteSelecionado || !validItems.length || validItems.length !== items.length) {
      setSaving(false);
      return setMessage("Selecione uma cliente e produtos válidos na lista.");
    }
    const erroEstoque = validarEstoqueVenda(validItems, products);
    if (erroEstoque) {
      setSaving(false);
      return setMessage(erroEstoque);
    }
    const { error } = await createClient().rpc("registrar_venda", {
      p_cliente_id: clienteSelecionado,
      p_itens: validItems,
      p_quantidade_parcelas: 1,
      p_data_venda: fields.data_venda,
      p_primeiro_vencimento: fields.primeiro_vencimento,
      p_observacao: fields.observacao || null,
    });
    setSaving(false);
    if (error)
      return setMessage(mensagemErroVenda(error));
    setOpen(false);
    setItems([{ produto_id: "", quantidade: 1, preco_unitario: "" }]);
    router.refresh();
  }
  async function excluirVenda(id) {
    if (
      !await confirmAction(
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
            const hoje = dataVendaHoje();
            setDataVenda(hoje);
            setPrimeiroVencimento(vencimentoMesSeguinte(hoje));
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
      {erroCarregamento && <p role="alert" className="mb-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">{erroCarregamento}</p>}
      {!open && message && <p role="alert" className="mb-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">{message}</p>}
      <section className="rounded-2xl border border-[#ebe8e5] bg-white shadow-[0_2px_12px_rgba(41,37,36,0.03)]">
        <div className="flex flex-col gap-4 border-b border-[#f0edeb] p-5 sm:p-6">
          <div><h2 className="text-lg font-semibold text-[#292524]">Vendas</h2><p className="mt-1 text-sm text-[#78716c]">Histórico completo das vendas registradas.</p></div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <label><span className="sr-only">Situação da venda</span>
              <select value={situacao} onChange={(event) => setSituacao(event.target.value)} className="w-full rounded-xl border border-[#e4dfdb] bg-[#faf9f8] px-3 py-2.5 text-sm outline-none focus:border-[#9b6d64]">
                <option value="todas">Todas as vendas</option><option value="pendentes">Com débito ativo</option><option value="quitadas">Quitadas</option>
              </select>
            </label>
            <label className="block min-w-0"><span className="sr-only">Filtrar vendas por cliente</span>
              <CampoSelecao opcoes={clientesFiltro.map((cliente) => ({ valor: cliente.id, rotulo: cliente.nome, detalhe: cliente.observacao || "" }))} valor={clienteFiltro} aoSelecionar={setClienteFiltro} placeholder="Todas as clientes" />
            </label>
          </div>
        </div>
        {vendasFiltradas.length ? (
          <div ref={pagination.rowsRef} className="divide-y divide-[#f0edeb]">
            {pagination.itens.map((sale) => (
              <div
                data-page-row
                key={sale.id}
                className="flex min-h-[89px] items-center justify-between gap-3 px-5 py-3 sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f8ece9] text-[#9b6d64]">
                    <Icon name="shoppingBag" size={18} />
                  </span>
                  <div className="min-w-0">
                    <p title={sale.clientes?.nome || "Cliente"} className="truncate text-sm font-semibold text-[#44403c]">
                      {sale.clientes?.nome || "Cliente"}
                    </p>
                    <p className="text-xs text-[#918b87]">
                      {new Date(
                        `${sale.data_venda}T12:00:00`,
                      ).toLocaleDateString("pt-BR")}
                    </p>
                    <span title={sale.saldoPendente > 0 ? "Saldo a receber: " + money.format(sale.saldoPendente) : "Sem parcelas em aberto"} className={"mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold " + (sale.saldoPendente > 0 ? "bg-[#fff3df] text-[#ae751a]" : "bg-[#eaf5ee] text-[#4f8c6d]")}>
                      {sale.saldoPendente > 0 ? "Débito ativo" : "Quitada"}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <strong className="text-sm text-[#44403c]">
                    {money.format(Number(sale.valor_total))}
                  </strong>
                  <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setVendaDetalhada(sale)} aria-label="Ver itens da venda" title="Ver itens da venda" className="rounded-lg p-2 text-[#9b6d64] hover:bg-[#faf6f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b6d64]">
                    <Icon name="eye" size={20} />
                  </button>
                  <button
                    onClick={() => excluirVenda(sale.id)}
                    className="text-xs font-semibold text-[#9b6d64]"
                  >
                    Excluir
                  </button>
                  </div>
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
              {sales.length ? "Nenhuma venda encontrada" : "Ainda não há vendas"}
            </h3>
            <p className="mt-1 text-sm text-[#78716c]">
              {sales.length ? "Altere os filtros para consultar outras vendas." : "As vendas registradas aparecerão aqui."}
            </p>
          </div>
        )}
        <ListPagination pagination={pagination} total={vendasFiltradas.length} label="vendas" />
      </section>
      {vendaDetalhada && <SaleDetailsDialog venda={vendaDetalhada} onClose={() => setVendaDetalhada(null)} />}
      {open && (
        <div className="app-modal-overlay bg-[#292524]/35">
          <div className="app-modal-panel w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="app-modal-heading flex justify-between gap-4">
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
                <CampoSelecao
                  opcoes={customers.map((customer) => ({
                    valor: customer.id,
                    rotulo: customer.nome,
                    detalhe: customer.observacao || "",
                  }))}
                  valor={clienteSelecionado}
                  aoSelecionar={setClienteSelecionado}
                  placeholder="Buscar cliente"
                />
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
                  {items.map((item, index) => {
                    const produtoSelecionado = products.find(
                      (product) => product.id === item.produto_id,
                    );

                    return (
                      <div key={index} className="space-y-1">
                        <div className="grid grid-cols-[1fr_80px_100px_24px] gap-2">
                          <CampoSelecao
                            opcoes={products.map((product) => ({
                              valor: product.id,
                              rotulo: product.referencia,
                              complemento:
                                product.preco_sugerido != null
                                  ? `· ${money.format(Number(product.preco_sugerido))}`
                                  : "",
                              detalhe: `${product.descricao || "Sem descrição"} · ${product.quantidade_estoque} em estoque`,
                            }))}
                            valor={item.produto_id}
                            aoSelecionar={(valor) =>
                              selecionarProduto(index, valor)
                            }
                            placeholder="Buscar produto"
                          />
                          <input
                            value={item.quantidade}
                            onChange={(event) =>
                              atualizarItem(
                                index,
                                "quantidade",
                                event.target.value,
                              )
                            }
                            type="number"
                            min="1"
                            required
                            className="rounded-xl border border-[#ded8d4] px-2 text-sm"
                          />
                          <MoneyInput
                            value={item.preco_unitario}
                            onChange={(event) =>
                              atualizarItem(
                                index,
                                "preco_unitario",
                                formatarMoeda(event.target.value),
                              )
                            }
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder="0,00"
                            className="rounded-xl border border-[#ded8d4] px-2 text-sm"
                          />
                          <button
                            type="button"
                            disabled={items.length === 1}
                            onClick={() =>
                              setItems(
                                items.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              )
                            }
                            className="text-[#9a817b] disabled:opacity-30"
                          >
                            ×
                          </button>
                        </div>
                        {produtoSelecionado?.descricao && (
                          <p className="truncate text-xs text-[#918b87]">
                            {produtoSelecionado.descricao}
                          </p>
                        )}
                      </div>
                    );
                  })}
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
                  value={dataVenda}
                  onChange={(event) => {
                    const data = event.target.value;
                    setDataVenda(data);
                    setPrimeiroVencimento(vencimentoMesSeguinte(data));
                  }}
                  required
                />
                <Field
                  name="primeiro_vencimento"
                  label="Data de vencimento"
                  type="date"
                  value={primeiroVencimento}
                  onChange={(event) => setPrimeiroVencimento(event.target.value)}
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
              <div className="app-modal-actions"><button
                disabled={saving || !total}
                className="w-full rounded-xl bg-[#9b6d64] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Registrando..." : "Confirmar venda"}
              </button></div>
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
