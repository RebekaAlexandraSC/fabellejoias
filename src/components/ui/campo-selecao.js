"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function CampoSelecao({ opcoes, valor, aoSelecionar, placeholder, name }) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const selecionada = opcoes.find((opcao) => opcao.valor === valor);
  const exibicao = aberto
    ? busca
    : selecionada?.rotulo || "";
  const filtradas = useMemo(
    () =>
      opcoes
        .filter((opcao) =>
          normalizarTexto(`${opcao.rotulo} ${opcao.detalhe || ""}`).includes(
            normalizarTexto(busca),
          ),
        )
        .slice(0, 8),
    [opcoes, busca],
  );
  useEffect(() => {
    if (!aberto) return;
    const fecharAoClicarFora = (evento) => {
      if (!containerRef.current?.contains(evento.target)) {
        setAberto(false);
        setBusca("");
      }
    };
    document.addEventListener("pointerdown", fecharAoClicarFora, true);
    return () => document.removeEventListener("pointerdown", fecharAoClicarFora, true);
  }, [aberto]);
  return (
    <div ref={containerRef} className="relative"
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget)) {
          setAberto(false);
          setBusca("");
        }
      }}>
      {name && <input type="hidden" name={name} value={valor || ""} />}
      <div className="relative">
      <input
        ref={inputRef}
        value={exibicao}
        autoComplete="off"
        aria-expanded={aberto}
        onClick={() => {
          if (!aberto) {
            setBusca(valor ? selecionada?.rotulo || "" : "");
            setAberto(true);
          }
        }}
        onKeyDown={(evento) => {
          if (evento.key === "Escape" && aberto) {
            evento.preventDefault();
            evento.stopPropagation();
            setAberto(false);
            setBusca("");
          }
        }}
        onFocus={() => {
          setBusca(valor ? selecionada?.rotulo || "" : "");
          setAberto(true);
        }}
        onChange={(evento) => {
          setBusca(evento.target.value);
          if (evento.target.value !== selecionada?.rotulo) aoSelecionar("");
          setAberto(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#ded8d4] pl-3 pr-11 py-2.5 text-sm outline-none focus:border-[#9b6d64]"
      />
      {(valor || busca) && (
        <button
          type="button"
          aria-label="Limpar seleção"
          title="Limpar seleção"
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={(evento) => {
            evento.preventDefault();
            inputRef.current?.focus();
            aoSelecionar("");
            setBusca("");
            setAberto(true);
          }}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#918b87] hover:bg-[#faf6f4] hover:text-[#57534e] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#9b6d64]"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      )}
      </div>
      {aberto && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#e4dfdb] bg-white p-1 shadow-lg">
          {filtradas.length ? (
            filtradas.map((opcao) => (
              <button
                type="button"
                key={opcao.valor}
                onMouseDown={(evento) => evento.preventDefault()}
                onClick={() => {
                  aoSelecionar(opcao.valor);
                  setBusca("");
                  setAberto(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#faf6f4]"
              >
                <span className="block font-medium text-[#44403c]">
                  {opcao.rotulo}
                  {opcao.complemento && (
                    <span className="ml-1 font-normal text-[#78716c]">
                      {opcao.complemento}
                    </span>
                  )}
                </span>
                {opcao.detalhe && (
                  <span className="block text-xs text-[#918b87]">
                    {opcao.detalhe}
                  </span>
                )}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-[#918b87]">
              Nenhuma opção encontrada.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function normalizarTexto(valor) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
