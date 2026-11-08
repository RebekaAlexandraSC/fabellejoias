"use client";
import { MoneyInput } from "@/components/ui/money-input";
import { converterMoedaParaNumero } from "@/lib/money";
import { useConfirmation } from "@/components/ui/confirmation-provider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dataVendaHoje, vencimentoMesSeguinte } from "@/lib/sale-dates";
import { reabrirParcela } from "@/lib/undo-payment";
import { PaymentHistory } from "@/components/finance/payment-history";
import { Icon } from "@/components/ui/icon";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const today = new Date().toISOString().slice(0, 10);

export function FinanceManager({
  receivables = [],
  payables = [],
  saidas = [],
  contasRecebidas = [],
  contasPagas = [],
  historicoBaixas = [],
  erroHistorico = "",
}) {
  const router = useRouter();
  const confirmAction = useConfirmation();
  const [open, setOpen] = useState(false);
  const [dataSaida, setDataSaida] = useState(dataVendaHoje);
  const [primeiroVencimento, setPrimeiroVencimento] = useState(() => vencimentoMesSeguinte(dataSaida));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [desfazendoBaixa, setDesfazendoBaixa] = useState("");
  const [feedbackBaixa, setFeedbackBaixa] = useState(null);
  const [parcelaParaQuitar, setParcelaParaQuitar] = useState(null);
  const totalReceive = receivables.reduce(
    (sum, item) => sum + Number(item.valor || 0),
    0,
  );
  const totalPay = payables.reduce(
    (sum, item) => sum + Number(item.valor || 0),
    0,
  );
  const totalRecebido = contasRecebidas.reduce(
    (sum, item) => sum + Number(item.valor || 0),
    0,
  );
  const totalPago = contasPagas.reduce(
    (sum, item) => sum + Number(item.valor || 0),
    0,
  );
  async function registerExpense(form) {
    setSaving(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(form));
    if (converterMoedaParaNumero(data.valor_total) <= 0) { setSaving(false); return setMessage("Informe um valor total maior que zero."); }
    const { error } = await createClient().rpc("registrar_saida", {
      p_descricao: data.descricao,
      p_categoria: data.categoria,
      p_valor_total: converterMoedaParaNumero(data.valor_total),
      p_quantidade_parcelas: Number(data.quantidade_parcelas),
      p_data_saida: data.data_saida,
      p_primeiro_vencimento: data.primeiro_vencimento,
      p_observacao: data.observacao || null,
    });
    setSaving(false);
    if (error)
      return setMessage(error.message || "Não foi possível registrar a saída.");
    setOpen(false);
    router.refresh();
  }
  async function quitarParcela(form) {
    const dados = Object.fromEntries(new FormData(form));
    const valorPago = converterMoedaParaNumero(dados.valor_pago);

    if (!parcelaParaQuitar || valorPago <= 0) {
      return setMessage("Informe um valor válido para a quitação.");
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = parcelaParaQuitar.tipo === "receive"
      ? await supabase.rpc("receber_debito_cliente", {
          p_cliente_id: parcelaParaQuitar.cliente_id,
          p_data_pagamento: dados.data_pagamento,
          p_forma_pagamento: "pix",
          p_valor_pago: valorPago,
        })
      : await supabase.rpc("quitar_parcela", {
          p_parcela_id: parcelaParaQuitar.id,
          p_data_pagamento: dados.data_pagamento,
          p_forma_pagamento: "pix",
          p_valor_pago: valorPago,
        });
    setSaving(false);
    if (error) {
      setMessage(["PGRST202", "42883"].includes(error.code) ? "Aplique a migração de débito por cliente no Supabase antes de registrar este recebimento." : error.code === "P0001" ? error.message : "Não foi possível confirmar o pagamento. Confira o histórico antes de tentar novamente.");
    } else {
      setParcelaParaQuitar(null);
      router.refresh();
    }
  }
  async function excluirSaida(id) {
    if (
      !await confirmAction(
        "Excluir esta saída e todas as parcelas relacionadas, inclusive as já pagas?",
      )
    )
      return;
    const { error } = await createClient().rpc("excluir_saida", {
      p_saida_id: id,
    });
    if (error) return setMessage(error.message);
    router.refresh();
  }
  async function desfazerBaixa(parcela) {
    if (desfazendoBaixa) return;
    setFeedbackBaixa(null);
    const confirmado = await confirmAction(
      "Desfazer a baixa de " + money.format(Number(parcela.valor)) + " de " + parcela.nome + "? Este valor voltará a ficar pendente, mantendo o vencimento e os valores atuais das demais parcelas.",
      { title: "Desfazer baixa", confirmLabel: "Sim, desfazer baixa" },
    );
    if (!confirmado) return;
    setDesfazendoBaixa(parcela.tipo + ":" + parcela.id);
    setMessage("");
    try {
      await reabrirParcela(createClient(), parcela);
      setFeedbackBaixa({ erro: false, texto: "Baixa desfeita. A parcela de " + money.format(Number(parcela.valor)) + " de " + parcela.nome + " voltou para " + (parcela.tipo === "receive" ? "A receber" : "A pagar") + "." });
      router.refresh();
    } catch (error) { setFeedbackBaixa({ erro: true, texto: error.message || "Não foi possível desfazer a baixa. Verifique sua conexão e tente novamente." }); }
    finally { setDesfazendoBaixa(""); }
  }
  function abrirQuitacao(parcela) {
    setMessage("");
    setParcelaParaQuitar(parcela);
  }
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-[#9b6d64]">Financeiro</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#292524] sm:text-4xl">
            Contas
          </h1>
          <p className="mt-2 text-sm text-[#78716c]">
            Acompanhe o que a loja tem para receber e pagar.
          </p>
        </div>
        <button
          onClick={() => {
            const hoje = dataVendaHoje();
            setDataSaida(hoje);
            setPrimeiroVencimento(vencimentoMesSeguinte(hoje));
            setOpen(true);
            setMessage("");
          }}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white shadow-sm sm:self-auto"
        >
          <Icon name="plus" size={18} />
          Nova saída
        </button>
      </header>
      {message && (
        <p className="mb-5 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">
          {message}
        </p>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          title="A receber"
          value={money.format(totalReceive)}
          detail={`${receivables.length} ${receivables.length === 1 ? "cliente com débito" : "clientes com débitos"}`}
          icon="wallet"
          tone="rose"
        />
        <Summary
          title="A pagar"
          value={money.format(totalPay)}
          detail={`${payables.length} parcelas pendentes`}
          icon="receipt"
          tone="violet"
        />
        <Summary
          title="Contas recebidas"
          value={money.format(totalRecebido)}
          detail={`${contasRecebidas.length} ${contasRecebidas.length === 1 ? "parcela recebida" : "parcelas recebidas"} no mês`}
          icon="wallet"
          tone="emerald"
        />
        <Summary
          title="Contas pagas"
          value={money.format(totalPago)}
          detail={`${contasPagas.length} ${contasPagas.length === 1 ? "parcela paga" : "parcelas pagas"} no mês`}
          icon="receipt"
          tone="amber"
        />
      </section>
      <section className="mt-7 grid gap-6 xl:grid-cols-2">
        <InstallmentList
          title="A receber"
          items={receivables}
          type="receive"
          onPay={abrirQuitacao}
        />
        <InstallmentList
          title="A pagar"
          items={payables}
          type="pay"
          onPay={abrirQuitacao}
        />
      </section>
      <PaymentHistory items={historicoBaixas} erro={erroHistorico} onUndo={desfazerBaixa} busy={desfazendoBaixa} feedback={feedbackBaixa} />
      <section className="mt-7 overflow-x-auto rounded-2xl border border-[#ebe8e5] bg-white">
        <div className="border-b border-[#f0edeb] p-5">
          <h2 className="font-semibold text-[#292524]">Saídas registradas</h2>
        </div>
        <table className="w-full min-w-[650px] text-sm">
          <thead className="bg-[#fcfbfa] text-left text-xs uppercase text-[#918b87]">
            <tr>
              <th className="p-4">Descrição</th>
              <th className="p-4">Categoria</th>
              <th className="p-4">Data</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Parcelas</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {saidas.map((saida) => (
              <tr key={saida.id} className="border-t border-[#f0edeb]">
                <td className="p-4 font-semibold">{saida.descricao}</td>
                <td className="p-4 capitalize">
                  {saida.categoria.replaceAll("_", " ")}
                </td>
                <td className="p-4">
                  {new Date(`${saida.data_saida}T12:00:00`).toLocaleDateString(
                    "pt-BR",
                  )}
                </td>
                <td className="p-4">
                  {money.format(Number(saida.valor_total))}
                </td>
                <td className="p-4">{saida.quantidade_parcelas}x</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => excluirSaida(saida.id)}
                    className="text-xs font-semibold text-[#9b6d64]"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!saidas.length && (
          <p className="p-8 text-center text-sm text-[#918b87]">
            Nenhuma saída registrada.
          </p>
        )}
      </section>
      {open && (
        <div className="app-modal-overlay bg-[#292524]/35">
          <div className="app-modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="app-modal-heading flex justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#292524]">
                  Nova saída
                </h2>
                <p className="mt-1 text-sm text-[#78716c]">
                  Registre uma despesa ou compra parcelada.
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
                registerExpense(event.currentTarget);
              }}
              className="mt-6 space-y-4"
            >
              <Field
                name="descricao"
                label="Descrição"
                required
                placeholder="Ex.: Compra de embalagens"
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#57534e]">
                  Categoria
                </span>
                <select
                  name="categoria"
                  required
                  className="w-full rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm"
                >
                  <option value="compra_mercadoria">
                    Compra de mercadoria
                  </option>
                  <option value="embalagem">Embalagem</option>
                  <option value="frete">Frete</option>
                  <option value="taxa">Taxa</option>
                  <option value="marketing">Marketing</option>
                  <option value="outros">Outros</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  name="valor_total"
                  label="Valor total"
                  monetario
                  required
                />
                <Field
                  name="quantidade_parcelas"
                  label="Parcelas"
                  type="number"
                  min="1"
                  defaultValue="1"
                  required
                />
                <Field
                  name="data_saida"
                  label="Data"
                  type="date"
                  value={dataSaida}
                  onChange={(event) => { setDataSaida(event.target.value); setPrimeiroVencimento(vencimentoMesSeguinte(event.target.value)); }}
                  required
                />
                <Field
                  name="primeiro_vencimento"
                  label="Primeiro vencimento"
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
              <div className="app-modal-actions">
                <button
                disabled={saving}
                className="w-full rounded-xl bg-[#9b6d64] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Registrando..." : "Registrar saída"}
              </button>
                </div>
            </form>
          </div>
        </div>
      )}
      {parcelaParaQuitar && (
        <div className="app-modal-overlay bg-[#292524]/35">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              quitarParcela(event.currentTarget);
            }}
            className="app-modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="app-modal-heading flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#292524]">
                  {parcelaParaQuitar.tipo === "receive"
                    ? "Registrar recebimento"
                    : "Registrar pagamento"}
                </h2>
                <p className="mt-1 text-sm text-[#78716c]">
                  {parcelaParaQuitar.nome || "Parcela"} · vencimento em{" "}
                  {formatarData(parcelaParaQuitar.data_vencimento)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setParcelaParaQuitar(null)}
                className="text-xl text-[#9a9591]"
              >
                ×
              </button>
            </div>
            <p className="mt-5 rounded-xl bg-[#faf6f4] p-3 text-sm text-[#675e59]">
              {parcelaParaQuitar.tipo === "receive" ? "Débito total da cliente: " : "Valor atual da parcela: "}
              {money.format(Number(parcelaParaQuitar.valor))}
            </p>
            {message && (
              <p className="mt-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">
                {message}
              </p>
            )}
            <Field name="data_pagamento" label="Data do pagamento" type="date" defaultValue={dataVendaHoje()} required />
            <Field
              name="valor_pago"
              label="Valor recebido/pago"
              monetario
              defaultValue={parcelaParaQuitar.valor}
              required
            />
            <p className="mt-3 text-xs leading-5 text-[#78716c]">
              {parcelaParaQuitar.tipo === "receive" ? "O valor recebido será abatido do débito total. O restante vencerá no mesmo dia do mês seguinte à data do pagamento; se o dia não existir, será usado o último dia do mês." : "Se o valor for menor, o saldo será redistribuído entre as próximas parcelas. Se for maior, ele abaterá as próximas parcelas pendentes."}
            </p>
            <div className="app-modal-actions">
              <button
              disabled={saving}
              className="mt-5 w-full rounded-xl bg-[#9b6d64] py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Confirmar quitação"}
            </button>
              </div>
          </form>
        </div>
      )}
    </div>
  );
}
function Summary({ title, value, detail, icon, tone }) {
  const colors = {
    rose: "bg-[#f8ece9] text-[#9b6d64]",
    violet: "bg-[#f0edfa] text-[#7566a0]",
    emerald: "bg-[#e8f5ee] text-[#4f9673]",
    amber: "bg-[#fff5df] text-[#c58b2c]",
  };
  return (
    <article className="flex items-start justify-between rounded-2xl border border-[#ebe8e5] bg-white p-5">
      <div>
        <p className="text-sm font-medium text-[#78716c]">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-[#292524]">{value}</p>
        <p className="mt-2 text-xs text-[#9a9591]">{detail}</p>
      </div>
      <span
        className={`grid size-10 place-items-center rounded-xl ${colors[tone]}`}
      >
        <Icon name={icon} size={20} />
      </span>
    </article>
  );
}
function InstallmentList({ title, items, type, onPay }) {
  return (
    <section className="rounded-2xl border border-[#ebe8e5] bg-white">
      <div className="border-b border-[#f0edeb] p-5">
        <h2 className="font-semibold text-[#292524]">{title}</h2>
      </div>
      {items.length ? (
        <div className="divide-y divide-[#f0edeb]">
          {items.map((item) => {
            const overdue = item.data_vencimento < today;
            const cliente = item.vendas?.clientes;
            const name =
              type === "receive" ? cliente?.nome : item.saidas?.descricao;
            const linkCobranca =
              type === "receive" ? criarLinkCobranca(item, cliente) : null;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#4c4743]">
                    {name || "Lançamento"}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${overdue ? "text-[#c0773e]" : "text-[#918b87]"}`}
                  >
                    {overdue ? "Vencida em " : "Vence em "}
                    {new Date(
                      `${item.data_vencimento}T12:00:00`,
                    ).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#44403c]">
                    {money.format(Number(item.valor))}
                  </p>
                  <button
                    onClick={() => onPay({ ...item, tipo: type, nome: name })}
                    className="mt-1 text-xs font-semibold text-[#9b6d64]"
                  >
                    {type === "receive" ? "Registrar recebimento" : "Marcar como paga"}
                  </button>
                  {type === "receive" &&
                    (linkCobranca ? (
                      <a
                        href={linkCobranca}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-3 text-xs font-semibold text-[#4f8c6d]"
                      >
                        Cobrar
                      </a>
                    ) : (
                      <span
                        title="Cadastre o telefone da cliente para enviar a cobrança."
                        className="ml-3 cursor-not-allowed text-xs font-semibold text-[#b5afa9]"
                      >
                        Cobrar
                      </span>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 text-center text-sm text-[#918b87]">
          {type === "receive" ? "Nenhuma cliente com débito pendente." : "Nenhuma parcela pendente."}
        </div>
      )}
    </section>
  );
}

function criarLinkCobranca(parcela, cliente) {
  const telefone = cliente?.telefone?.replace(/\D/g, "");

  if (!telefone) return null;

  const telefoneWhatsApp = telefone.length <= 11 ? `55${telefone}` : telefone;
  const vencimento = new Date(
    `${parcela.data_vencimento}T12:00:00`,
  ).toLocaleDateString("pt-BR");
  const mensagem = `Olá, ${cliente.nome}! Tudo bem?\nPassando para lembrar que o pagamento no valor de ${money.format(Number(parcela.valor || 0))} vence em ${vencimento}. Por gentileza, programe o pagamento até essa data.\nFico à disposição. Obrigado(a)!`;

  return `https://wa.me/${telefoneWhatsApp}?text=${encodeURIComponent(mensagem)}`;
}

function formatarData(valor) {
  return new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR");
}




function Field({ label, monetario, ...props }) {
  const Input = monetario ? MoneyInput : "input";
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#57534e]">
        {label}
      </span>
      <Input
        {...props}
        className="w-full rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm"
      />
    </label>
  );
}
