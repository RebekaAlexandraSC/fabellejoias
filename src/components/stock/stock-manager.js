"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/icon";

export function StockManager({
  products,
  categories,
  paginaAtual = 1,
  totalProdutos = 0,
  itensPorPagina = 50,
  resumoEstoque = null,
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState({ id: null });
  const [imagemAmpliada, setImagemAmpliada] = useState({
    url: "",
    referencia: "",
  });
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
  const totalPaginas = Math.max(1, Math.ceil(totalProdutos / itensPorPagina));
  function irParaPagina(novaPagina) {
    router.push(`/estoque?pagina=${novaPagina}`);
  }

  async function salvarProduto(form) {
    setSaving(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(form));
    const dadosProduto = {
      referencia: values.referencia.trim(),
      descricao: values.descricao.trim() || null,
      categoria_id: values.categoria_id || null,
      estoque_minimo: Number(values.estoque_minimo || 0),
    };
    const supabase = createClient();
    const consulta = supabase.from("produtos");
    const { data, error } = produtoEmEdicao.id
      ? await consulta
          .update(dadosProduto)
          .eq("id", produtoEmEdicao.id)
          .select("id")
          .single()
      : await consulta.insert(dadosProduto).select("id").single();
    if (error) setSaving(false);
    if (error)
      return setMessage(
        error.code === "23505"
          ? "Essa referência já está cadastrada."
          : "Não foi possível salvar o produto.",
      );

    const arquivo = form.elements.imagem?.files?.[0];
    if (arquivo) {
      const { data: dadosAutenticacao } = await supabase.auth.getUser();
      const extensao = arquivo.name.split(".").pop() || "jpg";
      const caminho = `${dadosAutenticacao.user.id}/${data.id}-${Date.now()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage
        .from("imagens-produtos")
        .upload(caminho, arquivo, { upsert: true });
      if (erroUpload) {
        setSaving(false);
        return setMessage(
          `Produto salvo, mas não foi possível enviar a imagem: ${erroUpload.message}`,
        );
      }
      const { data: urlPublica } = supabase.storage
        .from("imagens-produtos")
        .getPublicUrl(caminho);
      await supabase
        .from("produtos")
        .update({ imagem_url: urlPublica.publicUrl })
        .eq("id", data.id);
    }
    setSaving(false);
    setShowProductForm(false);
    setProdutoEmEdicao({ id: null });
    router.refresh();
  }

  async function excluirProduto(id) {
    if (
      !confirm(
        "Excluir este produto? Produtos com entradas ou vendas não podem ser removidos para preservar o histórico.",
      )
    )
      return;
    const { error } = await createClient()
      .from("produtos")
      .delete()
      .eq("id", id);
    if (error)
      return setMessage(
        "Este produto possui histórico de estoque ou vendas e não pode ser excluído.",
      );
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
    const produto = products.find((item) => item.referencia === values.produto_busca);
    if (!produto) { setSaving(false); return setMessage("Selecione um produto válido nas sugestões."); }
    const { error } = await createClient().rpc("registrar_entrada_estoque", {
      p_produto_id: produto.id,
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
          value={totalProdutos}
          icon="gem"
          tone="rose"
        />
        <Summary
          label="Peças em estoque"
          value={resumoEstoque?.total_pecas ?? products.reduce((sum, product) => sum + product.quantidade_estoque, 0)}
          icon="box"
          tone="emerald"
        />
        <Summary
          label="Estoque baixo"
          value={resumoEstoque?.produtos_estoque_baixo ?? lowStock}
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
            <table className="w-full min-w-[900px] text-left">
              <colgroup>
                <col className="w-[46%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[14%]" />
                <col className="w-[6%]" />
              </colgroup>
              <thead className="bg-[#fcfbfa] text-xs font-semibold uppercase tracking-wide text-[#9a9591]">
                <tr>
                  <th className="px-6 py-3">Produto</th>
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
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              product.imagem_url &&
                              setImagemAmpliada({
                                url: product.imagem_url,
                                referencia: product.referencia,
                              })
                            }
                            className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f8ece9] text-xs font-semibold text-[#9b6d64]"
                            aria-label={`Ver imagem de ${product.referencia}`}
                          >
                            {product.imagem_url ? (
                              <img
                                src={product.imagem_url}
                                alt={product.referencia}
                                className="size-full object-cover"
                              />
                            ) : (
                              product.referencia.slice(0, 1)
                            )}
                          </button>
                          <div>
                            <p className="font-semibold text-[#3f3a37]">
                              {product.referencia}
                            </p>
                            <p className="mt-0.5 text-xs text-[#9a9591]">
                              {product.descricao || "Sem descrição"}
                            </p>
                          </div>
                        </div>
                      </td>
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
                          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${low ? "bg-[#fff3df] text-[#ae751a]" : "bg-[#eaf5ee] text-[#4f8c6d]"}`}
                        >
                          {low ? "Estoque baixo" : "Em dia"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button onClick={() => { setProdutoEmEdicao(product); setShowProductForm(true); setMessage(""); }} className="mr-3 text-xs font-semibold text-[#9b6d64]">Editar</button>
                        <button onClick={() => excluirProduto(product.id)} className="text-xs font-semibold text-[#9b6d64]">Excluir</button>
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
      {totalProdutos > itensPorPagina && (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-[#ebe8e5] bg-white px-4 py-3 text-sm">
          <span className="text-[#78716c]">
            Página {paginaAtual} de {totalPaginas} · {totalProdutos} produtos
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => irParaPagina(paginaAtual - 1)}
              disabled={paginaAtual <= 1}
              className="rounded-lg border border-[#ded8d4] px-3 py-1.5 font-semibold text-[#675e59] disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => irParaPagina(paginaAtual + 1)}
              disabled={paginaAtual >= totalPaginas}
              className="rounded-lg border border-[#ded8d4] px-3 py-1.5 font-semibold text-[#675e59] disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
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
                  <input
                    name="produto_busca"
                    required
                    list="produtos-entrada-sugestoes"
                    placeholder="Digite a referência"
                    className="w-full rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm outline-none focus:border-[#9b6d64]"
                  />
                  <datalist id="produtos-entrada-sugestoes">{products.map((product) => <option key={product.id} value={product.referencia} label={product.descricao || ""} />)}</datalist>
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
                    Imagem do produto{" "}
                    <em className="font-normal text-[#9a9591]">(opcional)</em>
                  </span>
                  <input
                    name="imagem"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="w-full rounded-xl border border-[#ded8d4] p-2 text-sm"
                  />
                </label>
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
                  defaultValue={
                    produtoEmEdicao.id ? produtoEmEdicao.estoque_minimo : "0"
                  }
                  required
                />
                <Submit
                  saving={saving}
                  label={
                    produtoEmEdicao.id
                      ? "Salvar alterações"
                      : "Cadastrar produto"
                  }
                />
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
      {imagemAmpliada.url && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#292524]/70 p-5"
          onClick={() => setImagemAmpliada({ url: "", referencia: "" })}
        >
          <div
            className="animate-modal-in relative max-h-full max-w-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setImagemAmpliada({ url: "", referencia: "" })}
              className="absolute -right-2 -top-2 grid size-9 place-items-center rounded-full bg-white text-xl text-[#57534e] shadow"
            >
              ×
            </button>
            <img
              src={imagemAmpliada.url}
              alt={imagemAmpliada.referencia}
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <p className="mt-3 text-center text-sm font-semibold text-white">
              {imagemAmpliada.referencia}
            </p>
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
