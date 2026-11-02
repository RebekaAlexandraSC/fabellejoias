"use client";
import { useEffect, useRef, useState } from "react";
import { CampoSelecao } from "@/components/ui/campo-selecao";
import { Icon } from "@/components/ui/icon";
import { dataVendaHoje } from "@/lib/sale-dates";
import { prepararEntradas } from "@/lib/batch-entry";
const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const vazio = (key) => ({ key, produto_id: "", quantidade: "", custo_unitario: "", preco_sugerido: "", observacao: "" });
function Campo({ label, ...props }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-medium text-[#78716c]">{label}</span><input {...props} className="w-full min-w-0 rounded-xl border border-[#ded8d4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9b6d64]" /></label>;
}
export function BatchEntryForm({ produtos, saving, onSave }) {
  const proximaKey = useRef(1);
  const [itens, setItens] = useState([vazio(0)]);
  const [itemAberto, setItemAberto] = useState(0);
  const editorRef = useRef(null);
  useEffect(() => {
    if (itemAberto !== 0) editorRef.current?.scrollIntoView({ block: "nearest" });
  }, [itemAberto]);
  const [data, setData] = useState(dataVendaHoje);
  const [erro, setErro] = useState("");
  const opcoes = produtos.map((produto) => ({ valor: produto.id, rotulo: produto.referencia, detalhe: produto.descricao || "Sem descrição" }));
  function atualizar(key, campo, valor) {
    setItens((lista) => lista.map((item) => item.key === key ? { ...item, [campo]: valor } : item));
    setErro("");
  }
  function validarItens() {
    for (let indice = 0; indice < itens.length; indice++) {
      try { prepararEntradas([itens[indice]], produtos); }
      catch (error) {
        setItemAberto(itens[indice].key);
        setErro(error.message.replace(/item 1/g, "item " + (indice + 1)));
        return false;
      }
    }
    return true;
  }
  function adicionar() {
    if (!validarItens()) return;
    const key = proximaKey.current++;
    setItens((lista) => [...lista, vazio(key)]);
    setItemAberto(key);
    setErro("");
  }
  function remover(key) {
    const restantes = itens.filter((item) => item.key !== key);
    setItens(restantes);
    if (itemAberto === key) setItemAberto(restantes[restantes.length - 1]?.key ?? null);
    setErro("");
  }
  function enviar(event) {
    event.preventDefault();
    if (saving || !validarItens()) return;
    try {
      const entradas = prepararEntradas(itens, produtos);
      setErro("");
      onSave({ data_entrada: data, itens: entradas });
    } catch (error) { setErro(error.message); }
  }
  return <form onSubmit={enviar} className="mt-6">
    <fieldset disabled={saving} className="min-w-0 space-y-5 disabled:opacity-70">
      <div className="rounded-xl bg-[#faf6f4] p-4">
        <div className="max-w-xs"><Campo label="Data da entrada · para todos os produtos" type="date" value={data} onChange={(event) => setData(event.target.value)} required /></div>
      </div>
      <div className="space-y-4">
        {itens.map((item, indice) => itemAberto !== item.key ? (
          <section key={item.key} aria-label={"Resumo do produto " + (indice + 1)} className="rounded-xl border border-[#ebe8e5] bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0"><p className="text-sm font-semibold text-[#57534e]">{produtos.find((produto) => produto.id === item.produto_id)?.referencia || "Produto não selecionado"}</p>
                <p className="mt-1 text-xs leading-5 text-[#918b87]">Qtd.: {item.quantidade || "—"} · Custo: {item.custo_unitario !== "" ? dinheiro.format(Number(item.custo_unitario)) : "—"} · Sugerido: {item.preco_sugerido !== "" ? dinheiro.format(Number(item.preco_sugerido)) : "—"}</p>
                {item.observacao && <p title={item.observacao} className="mt-1 max-w-full truncate text-xs text-[#918b87]">{item.observacao}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button type="button" onClick={() => { setItemAberto(item.key); setErro(""); }} aria-expanded={false} aria-label={"Editar produto " + (indice + 1)} className="rounded-lg border border-[#ded8d4] px-3 py-2 text-xs font-semibold text-[#9b6d64]">Editar</button>
                {itens.length > 1 && <button type="button" onClick={() => remover(item.key)} aria-label={"Remover produto " + (indice + 1)} className="rounded-lg p-2 text-[#918b87] hover:text-[#ad5847]"><Icon name="close" size={16} /></button>}
              </div>
            </div>
          </section>
        ) : <section ref={editorRef} key={item.key} aria-label={"Produto " + (indice + 1)} className="rounded-2xl border border-[#ebe8e5] bg-[#fcfbfa] p-4">
          <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[#57534e]">Produto {indice + 1}</h3>
            {itens.length > 1 && <button type="button" onClick={() => remover(item.key)} aria-label={"Remover produto " + (indice + 1)} className="flex items-center gap-1 rounded-lg p-1 text-xs font-semibold text-[#9b6d64]"><Icon name="close" size={15} />Remover</button>}
          </div>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-[#78716c]">Produto</span><CampoSelecao opcoes={opcoes} valor={item.produto_id} aoSelecionar={(valor) => atualizar(item.key, "produto_id", valor)} placeholder="Buscar produto por referência ou descrição" /></label>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo label="Quantidade" type="number" min="1" step="1" value={item.quantidade} onChange={(event) => atualizar(item.key, "quantidade", event.target.value)} required />
            <Campo label="Custo unitário (R$)" type="number" min="0" step="0.01" placeholder="0,00" value={item.custo_unitario} onChange={(event) => atualizar(item.key, "custo_unitario", event.target.value)} required />
            <Campo label="Preço sugerido (R$)" type="number" min="0" step="0.01" placeholder="0,00" value={item.preco_sugerido} onChange={(event) => atualizar(item.key, "preco_sugerido", event.target.value)} required />
          </div>
          <label className="mt-4 block"><span className="mb-1.5 block text-xs font-medium text-[#78716c]">Observação <span className="font-normal text-[#a09993]">(opcional)</span></span><textarea rows={2} value={item.observacao} onChange={(event) => atualizar(item.key, "observacao", event.target.value)} className="w-full rounded-xl border border-[#ded8d4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9b6d64]" /></label>
        </section>)}
      </div>
      <button type="button" onClick={adicionar} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9aea6] py-3 text-sm font-semibold text-[#9b6d64] hover:bg-[#faf6f4]"><Icon name="plus" size={17} />Adicionar produto</button>
      {erro && <p role="alert" className="rounded-xl bg-[#fff5ed] p-3 text-sm text-[#ad5847]">{erro}</p>}
      <div className="app-modal-actions"><button type="submit" className="w-full rounded-xl bg-[#9b6d64] py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Registrando entradas..." : "Confirmar " + (itens.length === 1 ? "entrada" : "entradas (" + itens.length + ")")}</button></div>
    </fieldset>
  </form>;
}
