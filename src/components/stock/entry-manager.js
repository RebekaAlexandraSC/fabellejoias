"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
export function EntryManager({ entries = [], erroCarregamento = "" }) {
  const router = useRouter();
  const [editing, setEditing] = useState({ id: null });
  const [message, setMessage] = useState("");
  async function remove(id) {
    if (!confirm("Excluir esta entrada? O saldo do produto será reduzido."))
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
      <section className="overflow-x-auto rounded-2xl border border-[#ebe8e5] bg-white">
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
          <tbody>
            {entries.filter(Boolean).map((e) => {
              const used = e.quantidade !== e.quantidade_disponivel;
              return (
                <tr key={e.id} className="border-t border-[#f0edeb]">
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
          </tbody>
        </table>
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
