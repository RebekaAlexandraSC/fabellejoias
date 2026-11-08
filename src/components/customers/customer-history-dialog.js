"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listarTodos } from "@/lib/listar-todos";
import { paginar } from "@/lib/list-pagination";
import { resumirMovimentacao } from "@/lib/customer-history";
import { ListPagination } from "@/components/ui/list-pagination";
import { Icon } from "@/components/ui/icon";
const moeda = (valor) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (valor) => new Date(valor + "T12:00:00").toLocaleDateString("pt-BR");
const formas = { pix: "Pix", dinheiro: "Dinheiro", credito: "Crédito", debito: "Débito" };
function Movimentos({ titulo, items, pagamentos = false }) {
  const [pagina, setPagina] = useState(1);
  const lista = paginar(items, pagina, 6);
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-[#ebe8e5] bg-white">
    <div className="flex items-center justify-between border-b border-[#f0edeb] px-4 py-4"><h3 className="text-sm font-semibold text-[#57534e]">{titulo}</h3><span className="text-xs text-[#918b87]">{items.length} registros</span></div>
    <ul className="divide-y divide-[#f0edeb]">
      {lista.itens.map((item) => <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-4">
        <div className="min-w-0"><p className="text-sm font-semibold text-[#57534e]">{data(pagamentos ? item.data_pagamento : item.data_venda)}</p>
          <p className="mt-1 text-xs leading-5 text-[#918b87]">{pagamentos ? (formas[item.forma_pagamento] || "Pagamento registrado") : item.saldoAberto > 0 ? "Em aberto: " + moeda(item.saldoAberto) : "Quitada"}</p>
          {pagamentos && item.vendas?.data_venda && <p className="text-xs leading-5 text-[#918b87]">Venda de {data(item.vendas.data_venda)}</p>}
          {!pagamentos && item.observacao && <p className="mt-1 break-words text-xs text-[#918b87]">{item.observacao}</p>}
        </div>
        <strong className={"shrink-0 text-sm tabular-nums " + (pagamentos ? "text-[#4f8c6d]" : "text-[#8f625a]")}>{moeda(pagamentos ? item.valor : item.valor_total)}</strong>
      </li>)}
    </ul>
    {!items.length && <p className="px-4 py-10 text-center text-sm text-[#918b87]">{pagamentos ? "Nenhum pagamento recebido." : "Nenhuma venda registrada."}</p>}
    <ListPagination pagination={{ ...lista, mudarPagina: setPagina, footerRef: null }} total={items.length} label={pagamentos ? "pagamentos" : "vendas"} />
  </section>;
}
export function CustomerHistoryDialog({ cliente, onClose }) {
  const ref = useRef(null);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const dialog = ref.current;
    const anterior = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); anterior?.focus?.(); };
  }, []);
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setErro(""); setResumo(null);
      try {
        const supabase = createClient();
        const [vendas, parcelas] = await Promise.all([
          listarTodos(() => supabase.from("vendas").select("id,valor_total,data_venda,observacao").eq("cliente_id",cliente.id).order("data_venda",{ascending:false}).order("id")),
          listarTodos(() => supabase.from("parcelas").select("id,venda_id,valor,data_pagamento,forma_pagamento,vendas!inner(cliente_id,data_venda)").eq("vendas.cliente_id",cliente.id).order("id")),
        ]);
        if (vendas.error || parcelas.error) throw new Error();
        if (ativo) setResumo(resumirMovimentacao(vendas.data, parcelas.data));
      } catch { if (ativo) setErro("Não foi possível carregar o histórico completo. Tente novamente."); }
    }
    carregar();
    return () => { ativo = false; };
  }, [cliente.id, tentativa]);
  return <dialog ref={ref} aria-labelledby="customer-history-title" onCancel={(event) => { event.preventDefault(); onClose(); }} className="animate-modal-in fixed inset-0 m-auto max-h-none w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-2xl border border-[#ebe8e5] bg-white p-0 text-[#292524] shadow-2xl outline-none backdrop:bg-[#292524]/45 backdrop:backdrop-blur-sm">
    <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
      <header className="shrink-0 border-b border-[#f0edeb] p-5 sm:px-7">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-medium text-[#9b6d64]">Histórico da cliente</p><h2 id="customer-history-title" className="mt-1 break-words text-xl font-semibold">{cliente.nome}</h2></div><button type="button" onClick={onClose} aria-label="Fechar histórico" className="rounded-lg p-2 text-[#918b87]"><Icon name="close" size={20} /></button></div>
        <p className="mt-3 max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-sm text-[#78716c]">{cliente.observacao || "Sem observação cadastrada."}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#fcfbfa] p-5 sm:p-7">
        {erro ? <div role="alert" className="rounded-xl bg-[#fff5ed] p-4 text-sm text-[#ad5847]"><p>{erro}</p><button type="button" onClick={() => setTentativa((valor) => valor + 1)} className="mt-3 font-semibold underline">Tentar novamente</button></div>
          : !resumo ? <p role="status" className="py-12 text-center text-sm text-[#918b87]">Carregando movimentações...</p>
          : <>
            <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[['Total em vendas',resumo.totalVendas],['Total recebido',resumo.totalRecebido],['Saldo em aberto',resumo.saldoAberto]].map(([titulo,valor]) => <div key={titulo} className="rounded-xl border border-[#ebe8e5] bg-white p-4"><dt className="text-xs text-[#918b87]">{titulo}</dt><dd className="mt-2 text-xl font-semibold tabular-nums text-[#57534e]">{moeda(valor)}</dd></div>)}
            </dl>
            <div className="grid items-start gap-5 lg:grid-cols-2"><Movimentos titulo="Vendas" items={resumo.vendas} /><Movimentos titulo="Pagamentos recebidos" items={resumo.pagamentos} pagamentos /></div>
          </>}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[#f0edeb] p-5 sm:px-7"><p className="text-xs text-[#918b87]">Histórico completo · valores registrados no sistema</p><button type="button" onClick={onClose} className="rounded-xl bg-[#9b6d64] px-5 py-2.5 text-sm font-semibold text-white">Fechar</button></footer>
    </div>
  </dialog>;
}
