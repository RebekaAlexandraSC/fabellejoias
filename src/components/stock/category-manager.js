"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
export function CategoryManager({ categories }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  async function save(form) {
    const d = Object.fromEntries(new FormData(form));
    const q = createClient().from("categorias");
    const { error } = editing
      ? await q
          .update({ nome: d.nome, descricao: d.descricao || null })
          .eq("id", editing.id)
      : await q.insert({ nome: d.nome, descricao: d.descricao || null });
    if (error) return setMessage("Não foi possível salvar esta categoria.");
    setEditing(null);
    router.refresh();
  }
  async function remove(id) {
    if (
      !confirm(
        "Excluir esta categoria? Produtos vinculados ficarão sem categoria.",
      )
    )
      return;
    const { error } = await createClient()
      .from("categorias")
      .delete()
      .eq("id", id);
    if (error) return setMessage("Não foi possível excluir a categoria.");
    router.refresh();
  }
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <Link href="/estoque" className="mb-4 inline-block text-sm font-semibold text-[#9b6d64]">← Voltar para Estoque</Link>
        <p className="mb-2 text-sm font-medium text-[#9b6d64]">Estoque</p>
        <h1 className="text-3xl font-semibold text-[#292524]">Categorias</h1>
      </header>
      {message && (
        <p className="mb-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">
          {message}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-[#ebe8e5] bg-white">
          {categories.length ? (
            categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border-b border-[#f0edeb] p-4 last:border-0"
              >
                <div>
                  <p className="font-semibold text-[#44403c]">{c.nome}</p>
                  <p className="text-sm text-[#918b87]">
                    {c.descricao || "Sem descrição"}
                  </p>
                </div>
                <div className="flex gap-3 text-sm font-semibold text-[#9b6d64]">
                  <button className="cursor-pointer" onClick={() => setEditing(c)}>Editar</button>
                  <button className="cursor-pointer" onClick={() => remove(c.id)}>Excluir</button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-[#918b87]">
              Nenhuma categoria cadastrada.
            </p>
          )}
        </section>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(e.currentTarget);
          }}
          className="animate-modal-in h-fit rounded-2xl border border-[#ebe8e5] bg-white p-5"
        >
          <h2 className="font-semibold text-[#292524]">
            {editing ? "Editar categoria" : "Nova categoria"}
          </h2>
          <label className="mt-4 block text-sm font-medium text-[#57534e]">
            Nome
            <input
              name="nome"
              defaultValue={editing?.nome}
              required
              className="mt-1.5 w-full rounded-xl border border-[#ded8d4] p-2.5 font-normal"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-[#57534e]">
            Descrição
            <textarea
              name="descricao"
              defaultValue={editing?.descricao || ""}
              className="mt-1.5 w-full rounded-xl border border-[#ded8d4] p-2.5 font-normal"
            />
          </label>
          <button className="mt-4 w-full rounded-xl bg-[#9b6d64] py-2.5 text-sm font-semibold text-white">
            Salvar
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="mt-3 w-full text-sm text-[#78716c]"
            >
              Cancelar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
