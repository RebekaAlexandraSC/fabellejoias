"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { calcularItensPorPagina, paginar } from "@/lib/list-pagination";

export function useViewportPagination(itens, filtro, alturaPadrao = 77) {
  const rowsRef = useRef(null);
  const footerRef = useRef(null);
  const [tamanho, setTamanho] = useState(1);
  const [navegacao, setNavegacao] = useState({ pagina: 1, filtro });
  const pagina = navegacao.filtro === filtro ? navegacao.pagina : 1;
  useLayoutEffect(() => {
    setNavegacao({ pagina: 1, filtro });
  }, [filtro]);
  const resultado = paginar(itens, pagina, tamanho);
  useLayoutEffect(() => {
    let frame;
    const medir = () => {
      const linhas = rowsRef.current;
      const rodape = footerRef.current;
      if (!linhas || !rodape) return;
      const main = linhas.closest("main");
      const margem = main ? parseFloat(getComputedStyle(main).paddingBottom) : 20;
      const viewport = window.visualViewport;
      const limite = viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
      const alturas = Array.from(linhas.querySelectorAll("[data-page-row]")).map((linha) => linha.getBoundingClientRect().height);
      const altura = Math.max(alturaPadrao, ...alturas);
      // Reserve room for the footer, bottom padding and horizontal scrollbar.
      const disponivel = limite - linhas.getBoundingClientRect().top - rodape.getBoundingClientRect().height - margem - 22;
      setTamanho(calcularItensPorPagina(disponivel, altura));
    };
    const agendar = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(medir); };
    const observer = new ResizeObserver(agendar);
    [rowsRef.current, footerRef.current, rowsRef.current?.closest("main")].filter(Boolean).forEach((el) => observer.observe(el));
    rowsRef.current?.querySelectorAll("[data-page-row]").forEach((el) => observer.observe(el));
    window.addEventListener("resize", agendar);
    window.visualViewport?.addEventListener("resize", agendar);
    medir();
    // The shell has an entrance animation that changes its initial coordinates.
    const timer = setTimeout(agendar, 400);
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(timer);
      window.removeEventListener("resize", agendar);
      window.visualViewport?.removeEventListener("resize", agendar);
    };
  }, [alturaPadrao, filtro, itens.length, resultado.paginaAtual, tamanho]);
  return { ...resultado, rowsRef, footerRef, mudarPagina: (novaPagina) => setNavegacao({ pagina: novaPagina, filtro }) };
}
