"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SeletorMes({ mes, destino = "/relatorios", compacto = false }) {
  const router = useRouter();
  const parametros = useSearchParams();
  return (
    <div
      className={`${compacto ? "" : "mt-5"} inline-flex items-center gap-2 rounded-xl border border-[#ded8d4] bg-white p-1 text-sm font-medium text-[#57534e]`}
    >
      <input
        id="mesSelector"
        name="mesSelector"
        type="month"
        value={mes}
        onChange={(event) => {
          const busca = new URLSearchParams(parametros);
          busca.set("mes", event.target.value);
          router.push(`${destino}?${busca.toString()}`);
        }}
        aria-label="Selecionar mês"
        className="cursor-pointer bg-transparent pr-2 outline-none"
      />
    </div>
  );
}
