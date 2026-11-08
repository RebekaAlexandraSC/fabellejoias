import { normalizarBusca } from "./list-pagination";
export function produtoCorrespondeBusca(produto, busca) {
  const termo = normalizarBusca(busca).replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/\s+/g, " ");
  if (!termo) return true;
  const referencia = normalizarBusca(produto.referencia).replace(/[\u200B-\u200D\uFEFF]/g, "");
  const descricao = normalizarBusca(produto.descricao);
  const texto = referencia + " " + descricao;
  if (termo.split(" ").every((palavra) => texto.includes(palavra))) return true;
  // A pasted reference can contain formatting separators absent from its registration.
  const codigo = termo.replace(/[^a-z0-9]/g, "");
  return Boolean(codigo) && referencia.replace(/[^a-z0-9]/g, "").includes(codigo);
}
