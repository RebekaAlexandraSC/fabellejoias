"use client";

import { useMemo, useState } from "react";

export function CampoSelecao({ opcoes, valor, aoSelecionar, placeholder }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const selecionada = opcoes.find((opcao) => opcao.valor === valor);
  const exibicao = aberto ? busca : selecionada?.rotulo || "";
  const filtradas = useMemo(() => opcoes.filter((opcao) => `${opcao.rotulo} ${opcao.detalhe || ""}`.toLowerCase().includes(busca.toLowerCase())).slice(0, 8), [opcoes, busca]);
  return <div className="relative"><input value={exibicao} onFocus={() => { setAberto(true); setBusca(""); }} onChange={(evento) => { setBusca(evento.target.value); aoSelecionar(""); setAberto(true); }} placeholder={placeholder} className="w-full rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm outline-none focus:border-[#9b6d64]" />{aberto && <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#e4dfdb] bg-white p-1 shadow-lg">{filtradas.length ? filtradas.map((opcao) => <button type="button" key={opcao.valor} onMouseDown={(evento) => { evento.preventDefault(); aoSelecionar(opcao.valor); setBusca(""); setAberto(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#faf6f4]"><span className="block font-medium text-[#44403c]">{opcao.rotulo}</span>{opcao.detalhe && <span className="block text-xs text-[#918b87]">{opcao.detalhe}</span>}</button>) : <p className="px-3 py-2 text-sm text-[#918b87]">Nenhuma opção encontrada.</p>}</div>}</div>;
}
