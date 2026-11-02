"use client";
import { useConfirmation } from "@/components/ui/confirmation-provider";
import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
export function CategoryManager({ categories }) {
  const router = useRouter();
  const confirmAction = useConfirmation();
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(1);
  const listRef = useRef(null);
  const filterRef = useRef(null);
  const paginationRef = useRef(null);
  const formRef = useRef(null);
  useLayoutEffect(() => {
    const updatePageSize = () => {
      const list = listRef.current;
      if (!list) return;
      const viewport = window.visualViewport;
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const main = list.closest("main");
      const bottomPadding = main ? parseFloat(getComputedStyle(main).paddingBottom) : 20;
      const stacked = window.innerWidth < 1024;
      const formSpace = stacked ? (formRef.current?.getBoundingClientRect().height || 0) + 24 : 0;
      const available = bottom - list.getBoundingClientRect().top - bottomPadding
        - (filterRef.current?.getBoundingClientRect().height || 0)
        - (paginationRef.current?.getBoundingClientRect().height || 0) - formSpace - 2;
      setPageSize(Math.max(1, Math.floor(available / 77)));
    };
    const observer = new ResizeObserver(updatePageSize);
    [listRef.current, filterRef.current, paginationRef.current, formRef.current].filter(Boolean).forEach((element) => observer.observe(element));
    window.addEventListener("resize", updatePageSize);
    window.visualViewport?.addEventListener("resize", updatePageSize);
    updatePageSize();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePageSize);
      window.visualViewport?.removeEventListener("resize", updatePageSize);
    };
  }, [message, editing, categories.length, filter]);
  const normalize = (value) => (value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
  const query = normalize(filter.trim());
  const filtered = categories.filter((c) => normalize(c.nome + " " + (c.descricao || "")).includes(query));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  function clearForm() {
    setEditing(null);
    setNome("");
    setDescricao("");
    setMessage("");
  }
  function editCategory(category) {
    setEditing(category);
    setNome(category.nome);
    setDescricao(category.descricao || "");
    setMessage("");
  }
  async function save(form) {
    const d = Object.fromEntries(new FormData(form));
    const q = createClient().from("categorias");
    const { error } = editing
      ? await q
          .update({ nome: d.nome, descricao: d.descricao || null })
          .eq("id", editing.id)
      : await q.insert({ nome: d.nome, descricao: d.descricao || null });
    if (error) return setMessage("Não foi possível salvar esta categoria.");
    clearForm();
    router.refresh();
  }
  async function remove(id) {
    if (
      !await confirmAction(
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
        <section ref={listRef} className="self-start rounded-2xl border border-[#ebe8e5] bg-white">
          <div ref={filterRef} className="flex flex-col gap-4 border-b border-[#f0edeb] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-[#292524]">Categorias</h2>
              <p className="mt-1 text-sm text-[#78716c]">Organize os produtos da sua loja.</p>
            </div>
            <label className="relative block sm:w-64 sm:shrink-0">
              <span className="sr-only">Buscar categoria por nome ou descrição</span>
              <input id="category-filter" type="search" value={filter}
                onChange={(event) => { setFilter(event.target.value); setPage(1); }}
                placeholder="Buscar categoria"
                className="w-full rounded-xl border border-[#e4dfdb] bg-[#faf9f8] px-4 py-2.5 text-sm outline-none placeholder:text-[#aaa39e] focus:border-[#9b6d64]" />
            </label>
          </div>
          {visible.length ? (
            visible.map((c) => (
              <div
                key={c.id}
                className="flex h-[77px] items-center justify-between gap-3 border-b border-[#f0edeb] p-4 last:border-0"
              >
                <div className="min-w-0">
                  <p title={c.nome} className="truncate font-semibold text-[#44403c]">{c.nome}</p>
                  <p title={c.descricao || "Sem descrição"} className="truncate text-sm text-[#918b87]">
                    {c.descricao || "Sem descrição"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-sm font-semibold text-[#9b6d64]">
                  <button className="cursor-pointer" onClick={() => editCategory(c)}>Editar</button>
                  <button className="cursor-pointer" onClick={() => remove(c.id)}>Excluir</button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-[#918b87]">
              {query ? "Nenhuma categoria encontrada para este filtro." : "Nenhuma categoria cadastrada."}
            </p>
          )}
          {filtered.length > 0 && (
            <div ref={paginationRef} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0edeb] px-4 py-3 text-sm">
              <span className="text-[#78716c]" aria-live="polite">Página {currentPage} de {totalPages} · {filtered.length} categorias</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}
                  className="rounded-lg border border-[#ded8d4] px-3 py-1.5 font-semibold text-[#675e59] disabled:opacity-40">Anterior</button>
                <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}
                  className="rounded-lg border border-[#ded8d4] px-3 py-1.5 font-semibold text-[#675e59] disabled:opacity-40">Próxima</button>
              </div>
            </div>
          )}
        </section>
        <form
          ref={formRef}
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
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-[#ded8d4] p-2.5 font-normal"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-[#57534e]">
            Descrição
            <textarea
              name="descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#ded8d4] p-2.5 font-normal"
            />
          </label>
          <button className="mt-4 w-full rounded-xl bg-[#9b6d64] py-2.5 text-sm font-semibold text-white">
            Salvar
          </button>
          {editing && (
            <button
              type="button"
              onClick={clearForm}
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
