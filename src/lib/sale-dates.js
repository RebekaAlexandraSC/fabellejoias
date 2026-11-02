export function dataVendaHoje(agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(agora);
  const obter = (tipo) => partes.find((parte) => parte.type === tipo).value;
  return `${obter("year")}-${obter("month")}-${obter("day")}`;
}
export function vencimentoMesSeguinte(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || "")) return "";
  const [ano, mes, dia] = data.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDia))).toISOString().slice(0, 10);
}
