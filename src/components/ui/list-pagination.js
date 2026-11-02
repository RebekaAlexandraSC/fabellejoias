"use client";
export function ListPagination({ pagination, total, label }) {
  return (
    <div ref={pagination.footerRef} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0edeb] px-5 py-3 text-sm">
      <span className="text-[#78716c]" aria-live="polite">Página {pagination.paginaAtual} de {pagination.totalPaginas} · {total} {label}</span>
      <div className="flex gap-2">
        <button type="button" onClick={() => pagination.mudarPagina(pagination.paginaAtual - 1)} disabled={pagination.paginaAtual <= 1} className="rounded-lg border border-[#ded8d4] px-3 py-1.5 font-semibold text-[#675e59] disabled:opacity-40">Anterior</button>
        <button type="button" onClick={() => pagination.mudarPagina(pagination.paginaAtual + 1)} disabled={pagination.paginaAtual >= pagination.totalPaginas} className="rounded-lg border border-[#ded8d4] px-3 py-1.5 font-semibold text-[#675e59] disabled:opacity-40">Próxima</button>
      </div>
    </div>
  );
}
