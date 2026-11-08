const formato = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatarMoeda(valor) {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  return digitos ? formato.format(Number(digitos) / 100) : "";
}
export function converterMoedaParaNumero(valor) {
  if (typeof valor === "number") return valor;
  return Number(String(valor || "").replace(/\D/g, "")) / 100;
}
export function formatarValorDoBanco(valor) {
  return valor == null || valor === "" ? "" : formato.format(Number(valor));
}
