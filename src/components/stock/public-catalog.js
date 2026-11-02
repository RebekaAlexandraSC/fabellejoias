"use client";
import { useMemo, useState } from "react";
import { normalizarBusca } from "@/lib/list-pagination";
const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function FotoProduto({ produto }) {
  const [falhou, setFalhou] = useState(false);
  return <div className="flex aspect-square items-center justify-center overflow-hidden bg-[#f7f2ee]">
    {produto.imagem_url && !falhou ? <img src={produto.imagem_url} alt={produto.descricao || produto.referencia} loading="lazy" onError={() => setFalhou(true)} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" /> : <span className="text-sm text-[#9a817b]">Foto em breve</span>}
  </div>;
}
export function PublicCatalog({ produtos }) {
  const [busca, setBusca] = useState("");
  const filtrados = useMemo(() => produtos.filter((produto) => normalizarBusca(`${produto.referencia} ${produto.descricao || ""}`).includes(normalizarBusca(busca.trim()))), [produtos, busca]);
  return <main className="min-h-screen bg-[#faf8f6] text-[#292524]">
    <header className="border-b border-[#ebe3dd] bg-white px-5 py-6 text-center sm:py-8">
      <img src="/logo-fabelle.png" alt="Fabelle Joias" className="mx-auto h-20 w-56 object-contain" />
      <p className="mt-3 text-xs uppercase tracking-[0.25em] text-[#9b6d64]">Peças para os seus melhores momentos</p>
    </header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-semibold sm:text-4xl">Nosso catálogo</h1><p className="mt-2 text-sm text-[#78716c]">Conheça as peças disponíveis e escolha suas favoritas.</p></div>
        <label className="block sm:w-72"><span className="sr-only">Pesquisar peças por referência ou descrição</span><input type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Encontre sua próxima joia" className="w-full rounded-xl border border-[#e4dfdb] bg-white px-4 py-3 text-sm outline-none focus:border-[#9b6d64]" /></label>
      </div>
      <p role="status" className="mb-5 text-sm text-[#918b87]">{filtrados.length} {filtrados.length === 1 ? "peça disponível" : "peças disponíveis"}</p>
      {filtrados.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
        {filtrados.map((produto) => <article key={produto.id} className="group overflow-hidden rounded-2xl border border-[#ebe3dd] bg-white shadow-sm">
          <FotoProduto produto={produto} />
          <div className="p-4 sm:p-5"><p className="text-xs text-[#9b6d64]">Ref. {produto.referencia}</p><h2 className="mt-2 text-sm font-medium leading-6 text-[#57534e]">{produto.descricao || "Joia Fabelle"}</h2>
            <p className="mt-4 text-lg font-semibold text-[#8f625a]">{produto.valor_venda == null ? "Preço sob consulta" : dinheiro.format(Number(produto.valor_venda))}</p>
          </div>
        </article>)}
      </div> : <div className="rounded-2xl border border-[#ebe3dd] bg-white px-5 py-16 text-center text-[#78716c]">{busca.trim() ? "Nenhuma peça encontrada. Experimente outra busca." : "Novas peças em breve. Fale com a Fabelle para saber mais."}</div>}
    </div>
    <footer className="border-t border-[#ebe3dd] px-5 py-6 text-center text-xs leading-6 text-[#918b87]">Fabelle Joias · Disponibilidade e condições confirmadas no momento da compra.</footer>
  </main>;
}
