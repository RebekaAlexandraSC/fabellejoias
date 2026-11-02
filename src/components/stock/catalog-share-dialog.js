"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CampoSelecao } from "@/components/ui/campo-selecao";
import { criarLinkCatalogo, linkWhatsApp, telefoneWhatsApp } from "@/lib/catalogo";

export function CatalogShareDialog({ clientes, erroClientes, onClose }) {
  const dialogRef = useRef(null);
  const [clienteId, setClienteId] = useState("");
  const [link, setLink] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const cliente = clientes.find((item) => item.id === clienteId);
  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; anterior?.focus?.(); };
  }, []);
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const { data, error } = await createClient().rpc("obter_ou_criar_catalogo");
        if (error || !data) throw new Error("Não foi possível gerar o catálogo. Confira se a migração do catálogo foi aplicada no Supabase.");
        if (ativo) setLink(criarLinkCatalogo(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin, data));
      } catch (error) { if (ativo) setErro(error.message || "Não foi possível gerar o link. Tente novamente."); }
      finally { if (ativo) setCarregando(false); }
    }
    carregar();
    return () => { ativo = false; };
  }, []);
  async function copiar() {
    setAviso("");
    try { await navigator.clipboard.writeText(link); setAviso("Link copiado!"); }
    catch { setAviso("Não foi possível copiar automaticamente. Selecione e copie o link abaixo."); }
  }
  function enviar() {
    const url = linkWhatsApp(cliente, link);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }
  return (
    <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="catalog-share-title"
      className="app-modal-panel app-modal-native animate-modal-in fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-[#ebe8e5] bg-white p-6 text-[#292524] shadow-2xl backdrop:bg-[#292524]/45 backdrop:backdrop-blur-sm">
      <div className="app-modal-heading flex items-start justify-between gap-4">
        <div><h2 id="catalog-share-title" className="text-xl font-semibold">Compartilhar catálogo</h2><p className="mt-2 text-sm text-[#78716c]">Peças disponíveis e preços de venda, sem precisar entrar na conta.</p></div>
        <button type="button" onClick={onClose} aria-label="Fechar catálogo" className="rounded-lg px-2 text-2xl text-[#918b87]">×</button>
      </div>
      <div className="mt-6">
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-[#57534e]">Cliente</span>
          <CampoSelecao opcoes={clientes.map((item) => ({ valor: item.id, rotulo: item.nome, detalhe: [item.telefone || "Sem WhatsApp cadastrado", item.observacao || ""].filter(Boolean).join(" · ") }))} valor={clienteId} aoSelecionar={setClienteId} placeholder="Buscar cliente" />
        </label>
        {erroClientes && <p role="alert" className="mt-2 text-sm text-[#ad5847]">{erroClientes}</p>}
        {cliente && !telefoneWhatsApp(cliente.telefone) && <p className="mt-2 text-sm text-[#ad5847]">Esta cliente não tem um WhatsApp válido cadastrado. Você pode copiar o link.</p>}
        {link && <label className="mt-5 block text-sm font-medium text-[#57534e]">Link do catálogo<input readOnly value={link} onFocus={(event) => event.target.select()} className="mt-1.5 w-full rounded-xl border border-[#ded8d4] bg-[#faf9f8] p-3 text-sm font-normal" /></label>}
        {carregando && <p role="status" className="mt-4 text-sm text-[#78716c]">Gerando link...</p>}
        {erro && <p role="alert" className="mt-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#ad5847]">{erro}</p>}
        {aviso && <p role="status" className="mt-3 text-sm text-[#4f8c6d]">{aviso}</p>}
      </div>
      <div className="app-modal-actions mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" disabled={!link} onClick={copiar} className="flex-1 rounded-xl border border-[#ded8d4] px-4 py-3 text-sm font-semibold text-[#675e59] disabled:opacity-40">Copiar link</button>
        <button type="button" disabled={!link || !cliente || !telefoneWhatsApp(cliente.telefone)} onClick={enviar} className="flex-1 rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Enviar catálogo</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#918b87]">O WhatsApp será aberto com a mensagem pronta para você confirmar o envio.</p>
    </dialog>
  );
}
