"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SeletorMes({ mes }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const campoMes = useRef(null);
  const abrirSeletor = () =>
    campoMes.current?.showPicker?.() || campoMes.current?.focus();
  return (
    <button
        type="button"
        onClick={abrirSeletor}
        className="rounded-lg px-3 py-1.5 hover:bg-[#faf6f4]"
      >
    <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#ded8d4] bg-white p-1 text-sm font-medium text-[#57534e]">
      <input
        ref={campoMes}
        id="mesSelector"
        name="mesSelector"
        type="month"
        value={mes}
        onChange={(event) => {
          const busca = new URLSearchParams(parametros);
          busca.set("mes", event.target.value);
          router.push(`/relatorios?${busca.toString()}`);
        }}
        onClick={abrirSeletor}
        className="cursor-pointer bg-transparent pr-2 outline-none"
      />
    </div>
    </button>
  );
}
