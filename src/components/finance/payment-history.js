"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizarBusca, paginar } from "@/lib/list-pagination";
import { ListPagination } from "@/components/ui/list-pagination";
const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function PaymentHistory({ items, erro, onUndo, busy, feedback }) {
  const feedbackRef = useRef(null);
  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus({ preventScroll: true });
      feedbackRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [feedback]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const filtrados = useMemo(() => items.filter((item) => (tipo === "todos" || item.tipo === tipo) && normalizarBusca(item.nome).includes(normalizarBusca(busca.trim()))), [items, tipo, busca]);
  const resultado = paginar(filtrados, pagina, 10);
  return <section className="mt-7 rounded-2xl border border-[#ebe8e5] bg-white">
    <header className="flex flex-col gap-4 border-b border-[#f0edeb] p-5 lg:flex-row lg:items-center lg:justify-between">
      <div><h2 className="font-semibold text-[#292524]">Histórico de baixas</h2><p className="mt-1 text-sm text-[#918b87]">Consulte os valores recebidos e pagos ou desfaça uma baixa.</p></div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label><span className="sr-only">Tipo de baixa</span><select value={tipo} onChange={(event) => { setTipo(event.target.value); setPagina(1); }} className="w-full rounded-xl border border-[#e4dfdb] bg-[#faf9f8] px-3 py-2.5 text-sm"><option value="todos">Todas as baixas</option><option value="receive">Recebimentos</option><option value="pay">Pagamentos</option></select></label>
        <label><span className="sr-only">Buscar cliente ou saída</span><input type="search" value={busca} onChange={(event) => { setBusca(event.target.value); setPagina(1); }} placeholder="Buscar cliente ou saída" className="w-full rounded-xl border border-[#e4dfdb] bg-[#faf9f8] px-3 py-2.5 text-sm" /></label>
      </div>
    </header>
    {feedback && <p ref={feedbackRef} tabIndex={-1} role={feedback.erro ? "alert" : "status"} className={"m-4 rounded-xl p-4 text-sm outline-none " + (feedback.erro ? "bg-[#fff5ed] text-[#ad5847]" : "bg-[#eaf5ee] text-[#4f8c6d]")}>{feedback.texto}</p>}
    {erro && <p role="alert" className="m-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#ad5847]">{erro}</p>}
    <ul className="divide-y divide-[#f0edeb]">
      {resultado.itens.map((item) => <li key={item.tipo + item.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5">
        <div className="min-w-0"><p className="break-words text-sm font-semibold text-[#57534e]">{item.nome}</p><p className="mt-1 text-xs text-[#918b87]">Parcela {item.numero} · {item.tipo === "receive" ? "Recebida" : "Paga"} em {new Date(item.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR")}</p></div>
        <div className="flex shrink-0 items-center gap-4"><strong className="text-sm tabular-nums text-[#57534e]">{dinheiro.format(Number(item.valor))}</strong><button type="button" disabled={Boolean(busy)} onClick={() => onUndo(item)} className="rounded-lg border border-[#ded8d4] px-3 py-2 text-xs font-semibold text-[#9b6d64] disabled:opacity-40">{busy === item.tipo + ":" + item.id ? "Desfazendo..." : "Desfazer baixa"}</button></div>
      </li>)}
    </ul>
    {!filtrados.length && !erro && <p className="p-8 text-center text-sm text-[#918b87]">{items.length ? "Nenhuma baixa encontrada para estes filtros." : "Nenhuma baixa registrada."}</p>}
    <ListPagination pagination={{ ...resultado, mudarPagina: setPagina, footerRef: null }} total={filtrados.length} label="baixas" />
  </section>;
}
