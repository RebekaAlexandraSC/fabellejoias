export function criarLinkCatalogo(origin, token) {
  const base = new URL(origin);
  if (!["https:", "http:"].includes(base.protocol)) throw new Error("Endereço do site inválido.");
  return new URL(`/catalogo/${token}`, base.origin).href;
}
export function telefoneWhatsApp(telefone) {
  let numero = String(telefone || "").replace(/\D/g, "");
  if (numero.startsWith("00")) numero = numero.slice(2);
  if (numero.length === 10 || numero.length === 11) numero = "55" + numero;
  return /^\d{12,15}$/.test(numero) ? numero : "";
}
export function linkWhatsApp(cliente, catalogo) {
  const numero = telefoneWhatsApp(cliente?.telefone);
  if (!numero) return null;
  const mensagem = `Olá, ${cliente.nome}! Confira o catálogo da Fabelle Joias: ${catalogo}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
