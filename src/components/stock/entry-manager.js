"use client";
import { useConfirmation } from "@/components/ui/confirmation-provider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useViewportPagination } from "@/hooks/use-viewport-pagination";
import { ListPagination } from "@/components/ui/list-pagination";
import Link from "next/link";
export function EntryManager({ entries = [], erroCarregamento = "" }) {
  const router = useRouter();
  const confirmAction = useConfirmation();
  const [editing, setEditing] = useState({ id: null });
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const normalize = (value) => (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const query = normalize(search.trim());
  const filteredEntries = entries.filter(Boolean).filter((entry) =>
    normalize([entry.produto?.referencia, entry.produto?.descricao, entry.observacao].filter(Boolean).join(" ")).includes(query),
  );
  const pagination = useViewportPagination(filteredEntries, search, 57);
  async function remove(id) {
    if (!await confirmAction("Excluir esta entrada? O saldo do produto será reduzido."))
      return;
    const { error } = await createClient().rpc("excluir_entrada_estoque", {
      p_entrada_id: id,
    });
    if (error) return setMessage(error.message);
    router.refresh();
  }
  async function save(form) {
    const d = Object.fromEntries(new FormData(form));
    const { error } = await createClient().rpc("editar_entrada_estoque", {
      p_entrada_id: editing.id,
      p_custo_unitario: Number(d.custo_unitario),
      p_preco_sugerido: Number(d.preco_sugerido),
      p_data_entrada: d.data_entrada,
      p_observacao: d.observacao || null,
    });
    if (error) return setMessage(error.message);
    setEditing({ id: null });
    router.refresh();
  }
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <Link href="/estoque" className="mb-4 inline-block text-sm font-semibold text-[#9b6d64]">← Voltar para Estoque</Link>
        <p className="mb-2 text-sm font-medium text-[#9b6d64]">Estoque</p>
        <h1 className="text-3xl font-semibold text-[#292524]">
          Entradas por lote
        </h1>
        <p className="mt-2 text-sm text-[#78716c]">
          Lotes já usados em vendas são preservados para manter o histórico
          FIFO.
        </p>
      </header>
      {message && (
        <p className="mb-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">
          {message}
        </p>
      )}
      {erroCarregamento && (
        <p className="mb-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">
          Não foi possível carregar as entradas: {erroCarregamento}
        </p>
      )}
      <section className="rounded-2xl border border-[#ebe8e5] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#f0edeb] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-[#292524]">Entradas por lote</h2>
            <p className="mt-1 text-sm text-[#78716c]">Consulte os lotes recebidos pela sua loja.</p>
          </div>
          <label className="relative block sm:w-64 sm:shrink-0">
            <span className="sr-only">Buscar entrada por referência, descrição ou observação</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar entrada"
              className="w-full rounded-xl border border-[#e4dfdb] bg-[#faf9f8] px-4 py-2.5 text-sm outline-none placeholder:text-[#aaa39e] focus:border-[#9b6d64]" />
          </label>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[730px] text-sm">
          <thead className="bg-[#fcfbfa] text-left text-xs uppercase text-[#918b87]">
            <tr>
              <th className="p-4">Produto</th>
              <th className="p-4">Data</th>
              <th className="p-4">Qtd.</th>
              <th className="p-4">Disponível</th>
              <th className="p-4">Custo</th>
              <th className="p-4">Preço sugerido</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody ref={pagination.rowsRef}>
            {pagination.itens.map((e) => {
              const used = e.quantidade !== e.quantidade_disponivel;
              return (
                <tr data-page-row key={e.id} className="border-t border-[#f0edeb]">
                  <td className="p-4 font-semibold text-[#44403c]">
                    {e.produto?.referencia || "Produto não localizado"}
                  </td>
                  <td className="p-4">
                    {new Date(`${e.data_entrada}T12:00:00`).toLocaleDateString(
                      "pt-BR",
                    )}
                  </td>
                  <td className="p-4">{e.quantidade}</td>
                  <td className="p-4">{e.quantidade_disponivel}</td>
                  <td className="p-4">
                    R$ {Number(e.custo_unitario).toFixed(2)}
                  </td>
                  <td className="p-4">
                    R$ {Number(e.preco_sugerido).toFixed(2)}
                  </td>
                  <td className="p-4 text-right">
                    {used ? (
                      <span className="text-xs text-[#918b87]">Em uso</span>
                    ) : (
                      <span className="space-x-3 text-xs font-semibold text-[#9b6d64]">
                        <button className="cursor-pointer" onClick={() => setEditing(e)}>Editar</button>
                        <button className="cursor-pointer" onClick={() => remove(e.id)}>Excluir</button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!filteredEntries.length && (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-[#918b87]" role="status">
                {query ? "Nenhuma entrada encontrada para este filtro." : "Nenhuma entrada cadastrada."}
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
        <ListPagination pagination={pagination} total={filteredEntries.length} label="entradas" />
      </section>
      {editing.id && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#292524]/35 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(e.currentTarget);
            }}
            className="animate-modal-in w-full max-w-md rounded-2xl bg-white p-6"
          >
            <h2 className="text-xl font-semibold">Editar entrada</h2>
            <p className="mt-1 text-sm text-[#78716c]">
              {editing.produto?.referencia || "Produto"} · {editing.quantidade} peças
            </p>
            <label className="mt-4 block text-sm">
              Custo unitário
              <input
                name="custo_unitario"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editing.custo_unitario}
                className="mt-1 w-full rounded-xl border p-2.5"
              />
            </label>
            <label className="mt-4 block text-sm">
              Preço sugerido
              <input
                name="preco_sugerido"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editing.preco_sugerido}
                className="mt-1 w-full rounded-xl border p-2.5"
              />
            </label>
            <label className="mt-4 block text-sm">
              Data
              <input
                name="data_entrada"
                type="date"
                defaultValue={editing.data_entrada}
                className="mt-1 w-full rounded-xl border p-2.5"
              />
            </label>
            <label className="mt-4 block text-sm">
              Observação
              <textarea
                name="observacao"
                defaultValue={editing.observacao || ""}
                className="mt-1 w-full rounded-xl border p-2.5"
              />
            </label>
            <button className="mt-5 w-full rounded-xl bg-[#9b6d64] py-3 text-sm font-semibold text-white">
              Salvar alterações
            </button>
            <button
              type="button"
              onClick={() => setEditing({ id: null })}
              className="mt-3 w-full text-sm"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
