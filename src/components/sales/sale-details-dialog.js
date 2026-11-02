"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listarTodos } from "@/lib/listar-todos";
import { Icon } from "@/components/ui/icon";
const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function FotoItem({ produto }) {
  const [falhou, setFalhou] = useState(false);
  return <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#eee7e2] bg-[#faf8f6] sm:size-14">
    {produto?.imagem_url && !falhou
      ? <img src={produto.imagem_url} alt={"Produto " + (produto.referencia || "vendido")} loading="lazy" onError={() => setFalhou(true)} className="h-full w-full object-contain" />
      : <span className="px-2 text-center text-xs text-[#918b87]">Sem foto</span>}
  </div>;
}

export function SaleDetailsDialog({ venda, onClose }) {
  const dialogRef = useRef(null);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; anterior?.focus?.(); };
  }, []);
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true); setErro("");
      try {
        const supabase = createClient();
        const { data, error } = await listarTodos(() => supabase.from("itens_venda")
          .select("id, quantidade, preco_unitario, subtotal, produtos(referencia, imagem_url)")
          .eq("venda_id", venda.id).order("created_at").order("id"));
        if (error) throw error;
        if (ativo) setItens(data);
      } catch { if (ativo) setErro("Não foi possível carregar os itens desta venda. Tente novamente."); }
      finally { if (ativo) setCarregando(false); }
    }
    carregar();
    return () => { ativo = false; };
  }, [venda.id, tentativa]);
  const unidades = itens.reduce((total, item) => total + Number(item.quantidade), 0);
  return <dialog ref={dialogRef} aria-labelledby="sale-details-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    className="animate-modal-in fixed inset-0 m-auto max-h-none w-[calc(100%-1.5rem)] max-w-3xl overflow-hidden rounded-2xl border border-[#ebe8e5] bg-white p-0 text-[#292524] shadow-2xl backdrop:bg-[#292524]/45 backdrop:backdrop-blur-sm">
    <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col">
      <header className="shrink-0 border-b border-[#eee8e4] px-5 pb-5 pt-5 sm:px-7 sm:pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f8ece9] text-[#9b6d64]"><Icon name="receipt" size={21} /></span>
            <h2 id="sale-details-title" className="text-lg font-semibold tracking-tight sm:text-xl">Detalhes da venda</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar detalhes da venda" className="rounded-full p-2 text-[#918b87] hover:bg-[#f5f2ef] focus-visible:outline-2 focus-visible:outline-[#9b6d64]"><Icon name="close" size={19} /></button>
        </div>
        <dl className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-5 rounded-xl bg-[#faf8f6] px-4 py-3">
          <div className="min-w-0"><dt className="text-xs text-[#918b87]">Cliente</dt><dd className="mt-1 break-words text-sm font-semibold text-[#57534e]">{venda.clientes?.nome || "Cliente"}</dd></div>
          <div className="text-right"><dt className="text-xs text-[#918b87]">Data da venda</dt><dd className="mt-1 text-sm font-medium text-[#57534e]">{new Date(venda.data_venda + "T12:00:00").toLocaleDateString("pt-BR")}</dd></div>
        </dl>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#57534e]">Itens vendidos</h3>
          {!carregando && !erro && <span className="rounded-full bg-[#f5f2ef] px-2.5 py-1 text-xs text-[#918b87]">{unidades} {unidades === 1 ? "unidade" : "unidades"}</span>}
        </div>
        {carregando ? <p role="status" className="py-12 text-center text-sm text-[#78716c]">Carregando itens...</p>
          : erro ? <div role="alert" className="rounded-xl bg-[#fff5ed] p-4 text-sm text-[#ad5847]"><p>{erro}</p><button type="button" onClick={() => setTentativa((value) => value + 1)} className="mt-3 font-semibold underline">Tentar novamente</button></div>
          : !itens.length ? <p className="py-12 text-center text-sm text-[#78716c]">Nenhum item encontrado para esta venda.</p>
          : <>
            <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_60px_110px_110px] gap-4 border-b border-[#eee8e4] pb-3 text-[11px] font-medium uppercase tracking-wide text-[#a09993] sm:grid">
              <span>Produto</span><span className="text-center">Qtd.</span><span className="text-right">Valor unitário</span><span className="text-right">Subtotal</span>
            </div>
            <ul className="divide-y divide-[#f0edeb]">
              {itens.map((item) => <li key={item.id} className="grid grid-cols-1 items-center gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_60px_110px_110px] sm:gap-4 sm:py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <FotoItem produto={item.produtos} />
                  <div className="min-w-0"><p className="mb-1 text-[11px] text-[#a09993] sm:hidden">Referência</p><p className="break-words text-sm font-semibold tracking-wide text-[#44403c]">{item.produtos?.referencia || "Produto não localizado"}</p></div>
                </div>
                <dl className="grid grid-cols-3 gap-2 rounded-xl bg-[#faf8f6] px-3 py-3 text-sm sm:contents">
                  <div className="sm:text-center"><dt className="text-[11px] text-[#a09993] sm:sr-only">Quantidade</dt><dd className="mt-1 font-medium tabular-nums sm:mt-0">{item.quantidade}</dd></div>
                  <div className="text-center sm:text-right"><dt className="text-[11px] text-[#a09993] sm:sr-only">Valor unitário</dt><dd className="mt-1 whitespace-nowrap font-medium tabular-nums text-[#78716c] sm:mt-0">{dinheiro.format(Number(item.preco_unitario))}</dd></div>
                  <div className="text-right"><dt className="text-[11px] text-[#a09993] sm:sr-only">Subtotal</dt><dd className="mt-1 whitespace-nowrap font-semibold tabular-nums text-[#57534e] sm:mt-0">{dinheiro.format(Number(item.subtotal))}</dd></div>
                </dl>
              </li>)}
            </ul>
          </>}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-5 border-t border-[#eee8e4] bg-[#faf8f6] px-5 py-5 sm:px-7">
        <div><p className="text-xs text-[#918b87]">Total da venda</p><p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[#8f625a]">{dinheiro.format(Number(venda.valor_total))}</p></div>
        <button type="button" onClick={onClose} className="rounded-xl bg-[#9b6d64] px-6 py-3 text-sm font-semibold text-white hover:bg-[#855b53] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b6d64]">Fechar</button>
      </footer>
    </div>
  </dialog>;
}
