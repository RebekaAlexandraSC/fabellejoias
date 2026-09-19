"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/icon";

export function StockManager({ products, categories }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState({ id: null });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const visibleProducts = useMemo(
    () =>
      products.filter((product) =>
        `${product.referencia} ${product.descricao || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [products, search],
  );
  const lowStock = products.filter(
    (product) => product.quantidade_estoque <= product.estoque_minimo,
  ).length;

  async function salvarProduto(form) {
    setSaving(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(form));
    const dadosProduto = { referencia: values.referencia.trim(), descricao: values.descricao.trim() || null, categoria_id: values.categoria_id || null, estoque_minimo: Number(values.estoque_minimo || 0) };
    const consulta = createClient().from("produtos");
    const { error } = produtoEmEdicao.id ? await consulta.update(dadosProduto).eq("id", produtoEmEdicao.id) : await consulta.insert(dadosProduto);
    setSaving(false);
    if (error)
      return setMessage(
        error.code === "23505"
          ? "Essa referência já está cadastrada."
          : "Não foi possível salvar o produto.",
      );
    setShowProductForm(false);
    setProdutoEmEdicao({ id: null });
    router.refresh();
  }

  async function excluirProduto(id) {
    if (!confirm("Excluir este produto? Produtos com entradas ou vendas não podem ser removidos para preservar o histórico.")) return;
    const { error } = await createClient().from("produtos").delete().eq("id", id);
    if (error) return setMessage("Este produto possui histórico de estoque ou vendas e não pode ser excluído.");
    router.refresh();
  }

  async function createCategory(form) {
    setSaving(true);
    setMessage("");
    const name = new FormData(form).get("nome").trim();
    const { error } = await createClient()
      .from("categorias")
      .insert({ nome: name });
    setSaving(false);
    if (error)
      return setMessage(
        error.code === "23505"
          ? "Essa categoria já existe."
          : "Não foi possível cadastrar a categoria.",
      );
    setShowCategoryForm(false);
    router.refresh();
  }

  async function registerEntry(form) {
    setSaving(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(form));
    const { error } = await createClient().rpc("registrar_entrada_estoque", {
      p_produto_id: values.produto_id,
      p_quantidade: Number(values.quantidade),
      p_custo_unitario: Number(values.custo_unitario),
      p_preco_sugerido: Number(values.preco_sugerido),
      p_data_entrada: values.data_entrada,
      p_observacao: values.observacao || null,
    });
    setSaving(false);
    if (error)
      return setMessage(
        "Não foi possível registrar a entrada. Confirme se a migração do banco foi aplicada.",
      );
    setShowEntryForm(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-[#9b6d64]">Cadastros</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#292524] sm:text-4xl">
            Estoque
          </h1>
          <p className="mt-2 text-sm text-[#78716c]">
            Cadastre suas referências para começar a controlar as peças.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/estoque/categorias"
            className="rounded-xl border border-[#ded8d4] bg-white px-4 py-3 text-sm font-semibold text-[#6b625e] hover:bg-[#faf9f8]"
          >
            Categorias
          </Link>
          <Link
            href="/estoque/entradas"
            className="rounded-xl border border-[#ded8d4] bg-white px-4 py-3 text-sm font-semibold text-[#6b625e] hover:bg-[#faf9f8]"
          >
            Entradas
          </Link>
          <button
            onClick={() => {
              setShowProductForm(true);
              setProdutoEmEdicao({ id: null });
              setMessage("");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#9b6d64] bg-white px-4 py-3 text-sm font-semibold text-[#9b6d64] hover:bg-[#faf6f4]"
          >
            <Icon name="plus" size={18} />
            Novo produto
          </button>
          <button
            onClick={() => {
              setShowEntryForm(true);
              setMessage("");
            }}
            disabled={!products.length}
            className="inline-flex items-center gap-2 rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#855b53] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="box" size={18} />
            Registrar entrada
          </button>
        </div>
      </header>
      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Summary
          label="Produtos cadastrados"
          value={products.length}
          icon="gem"
          tone="rose"
        />
        <Summary
          label="Peças em estoque"
          value={products.reduce(
            (sum, product) => sum + product.quantidade_estoque,
            0,
          )}
          icon="box"
          tone="emerald"
        />
        <Summary
          label="Estoque baixo"
          value={lowStock}
          icon="bell"
          tone="amber"
        />
      </section>
      <section className="rounded-2xl border border-[#ebe8e5] bg-white shadow-[0_2px_12px_rgba(41,37,36,0.03)]">
        <div className="flex flex-col gap-4 border-b border-[#f0edeb] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-[#292524]">Produtos</h2>
            <p className="mt-1 text-sm text-[#78716c]">
              Referências ativas da sua loja.
            </p>
          </div>
          <label className="relative block sm:w-64">
            <span className="sr-only">Buscar produto</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar referência"
              className="w-full rounded-xl border border-[#e4dfdb] bg-[#faf9f8] px-4 py-2.5 text-sm outline-none placeholder:text-[#aaa39e] focus:border-[#9b6d64]"
            />
          </label>
        </div>
        {visibleProducts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead className="bg-[#fcfbfa] text-xs font-semibold uppercase tracking-wide text-[#9a9591]">
                <tr>
                  <th className="px-6 py-3">Referência</th>
                  <th className="px-6 py-3">Categoria</th>
                  <th className="px-6 py-3 text-center">Em estoque</th>
                  <th className="px-6 py-3 text-center">Mínimo</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edeb]">
                {visibleProducts.map((product) => {
                  const low =
                    product.quantidade_estoque <= product.estoque_minimo;
                  return (
                    <tr key={product.id} className="text-sm text-[#57534e]">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#3f3a37]">
                          {product.referencia}
                        </p>
                        <p className="mt-0.5 text-xs text-[#9a9591]">
                          {product.descricao || "Sem descrição"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { setProdutoEmEdicao(product); setShowProductForm(true); setMessage(""); }} className="cursor-pointer mr-3 text-xs font-semibold text-[#9b6d64]">Editar</button>
                        <button onClick={() => excluirProduto(product.id)} className="cursor-pointer text-xs font-semibold text-[#9b6d64]">Excluir</button></td>
                      <td className="px-6 py-4">
                        {product.categorias?.nome || "Sem categoria"}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold">
                        {product.quantidade_estoque}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {product.estoque_minimo}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${low ? "bg-[#fff3df] text-[#ae751a]" : "bg-[#eaf5ee] text-[#4f8c6d]"}`}
                        >
                          {low ? "Estoque baixo" : "Em dia"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyProducts
            hasSearch={Boolean(search)}
            onCreate={() => setShowProductForm(true)}
          />
        )}
      </section>
      {(showProductForm || showCategoryForm || showEntryForm) && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#292524]/35 p-4">
          <div className="my-5 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#292524]">
                  {showEntryForm
                    ? "Registrar entrada"
                    : showProductForm
                      ? "Novo produto"
                      : "Nova categoria"}
                </h2>
                <p className="mt-1 text-sm text-[#78716c]">
                  {showEntryForm
                    ? "Cada entrada cria um lote e atualiza o saldo do produto."
                    : showProductForm
                      ? "Cadastre a referência; a entrada de peças vem na próxima etapa."
                      : "Use categorias para organizar suas referências."}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowProductForm(false);
                  setShowCategoryForm(false);
                  setShowEntryForm(false);
                  setMessage("");
                }}
                className="text-xl text-[#9a9591]"
              >
                ×
              </button>
            </div>
            {message && (
              <p className="mt-4 rounded-xl bg-[#fff5ed] px-3 py-2.5 text-sm text-[#9a5b3e]">
                {message}
              </p>
            )}
            {showEntryForm ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  registerEntry(event.currentTarget);
                }}
                className="mt-6 space-y-4"
              >
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#57534e]">
                    Produto
                  </span>
                  <select
                    name="produto_id"
                    required
                    className="w-full rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm outline-none focus:border-[#9b6d64]"
                  >
                    <option value="">Selecione uma referência</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.referencia}
                        {product.descricao ? ` — ${product.descricao}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    name="quantidade"
                    label="Quantidade"
                    type="number"
                    min="1"
                    required
                  />
                  <Field
                    name="data_entrada"
                    label="Data da entrada"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    name="custo_unitario"
                    label="Custo unitário"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    required
                  />
                  <Field
                    name="preco_sugerido"
                    label="Preço sugerido"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    required
                  />
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#57534e]">
                    Observação{" "}
                    <em className="font-normal text-[#9a9591]">(opcional)</em>
                  </span>
                  <textarea
                    name="observacao"
                    rows="3"
                    className="w-full resize-none rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm outline-none focus:border-[#9b6d64]"
                  />
                </label>
                <Submit saving={saving} label="Confirmar entrada" />
              </form>
            ) : showProductForm ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  salvarProduto(event.currentTarget);
                }}
                className="mt-6 space-y-4"
              >
                <Field
                  name="referencia"
                  label="Referência"
                  placeholder="Ex.: BR-001"
                  required
                  defaultValue={produtoEmEdicao.referencia || ""}
                />
                <Field
                  name="descricao"
                  label="Descrição"
                  placeholder="Ex.: Brinco dourado"
                  defaultValue={produtoEmEdicao.descricao || ""}
                />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#57534e]">
                    Categoria
                  </span>
                  <select
                    name="categoria_id"
                    defaultValue={produtoEmEdicao.categoria_id || ""}
                    className="w-full rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm outline-none focus:border-[#9b6d64]"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  name="estoque_minimo"
                  label="Estoque mínimo"
                  type="number"
                  min="0"
                  defaultValue={produtoEmEdicao.id ? produtoEmEdicao.estoque_minimo : "0"}
                  required
                />
                <Submit saving={saving} label={produtoEmEdicao.id ? "Salvar alterações" : "Cadastrar produto"} />
              </form>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  createCategory(event.currentTarget);
                }}
                className="mt-6 space-y-4"
              >
                <Field
                  name="nome"
                  label="Nome da categoria"
                  placeholder="Ex.: Brincos"
                  required
                />
                <Submit saving={saving} label="Cadastrar categoria" />
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, icon, tone }) {
  const styles = {
    rose: "bg-[#f8ece9] text-[#9b6d64]",
    emerald: "bg-[#e8f5ee] text-[#4f9673]",
    amber: "bg-[#fff5df] text-[#c58b2c]",
  };
  return (
    <article className="flex items-center justify-between rounded-2xl border border-[#ebe8e5] bg-white p-5 shadow-[0_2px_12px_rgba(41,37,36,0.03)]">
      <div>
        <p className="text-sm font-medium text-[#78716c]">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-[#292524]">{value}</p>
      </div>
      <span
        className={`grid size-10 place-items-center rounded-xl ${styles[tone]}`}
      >
        <Icon name={icon} size={20} />
      </span>
    </article>
  );
}
function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#57534e]">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm outline-none placeholder:text-[#b5afa9] focus:border-[#9b6d64]"
      />
    </label>
  );
}
function Submit({ saving, label }) {
  return (
    <button
      disabled={saving}
      className="mt-2 w-full rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white hover:bg-[#855b53] disabled:opacity-70"
    >
      {saving ? "Salvando..." : label}
    </button>
  );
}
function EmptyProducts({ hasSearch, onCreate }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-[#f8ece9] text-[#9b6d64]">
        <Icon name="gem" size={22} />
      </span>
      <h3 className="mt-4 font-semibold text-[#44403c]">
        {hasSearch ? "Nenhum produto encontrado" : "Seu estoque começa aqui"}
      </h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[#78716c]">
        {hasSearch
          ? "Tente outra referência ou descrição."
          : "Cadastre as referências das suas semijoias para depois registrar as entradas por lote."}
      </p>
      {!hasSearch && (
        <button
          onClick={onCreate}
          className="mt-5 text-sm font-semibold text-[#9b6d64]"
        >
          Cadastrar primeiro produto
        </button>
      )}
    </div>
  );
}
