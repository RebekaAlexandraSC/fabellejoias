"use client";
import { useState } from "react";
import { formatarMoeda, formatarValorDoBanco } from "@/lib/money";
export function MoneyInput({ value, defaultValue, onChange, className = "", ...props }) {
  const [interno, setInterno] = useState(() => formatarValorDoBanco(defaultValue));
  const controlado = value !== undefined;
  return <input {...props} type="text" inputMode="numeric" placeholder={props.placeholder || "0,00"}
    value={controlado ? (typeof value === "number" ? formatarValorDoBanco(value) : value) : interno}
    onChange={(event) => {
      const texto = formatarMoeda(event.target.value);
      event.target.value = texto;
      if (!controlado) setInterno(texto);
      onChange?.(event);
    }}
    className={"min-w-0 tabular-nums " + className} />;
}
