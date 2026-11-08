"use client";
import { useConfirmation } from "@/components/ui/confirmation-provider";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useViewportPagination } from "@/hooks/use-viewport-pagination";
import { ListPagination } from "@/components/ui/list-pagination";
import { produtoCorrespondeBusca } from "@/lib/product-search";
import { CategoriesDialog } from "@/components/stock/categories-dialog";
import { BatchEntryForm } from "@/components/stock/batch-entry-form";
import { CatalogShareDialog } from "@/components/stock/catalog-share-dialog";
import { CampoSelecao } from "@/components/ui/campo-selecao";
import { Icon } from "@/components/ui/icon";

export function StockManager({
  products,
  categories = [],
  modo = "estoque",
  clientesCatalogo = [],
  erroClientesCatalogo = "",
  produtosEntrada = [],
  erroProdutosEntrada = "",
  erroCarregamento = "",
  buscaInicial = "",
}) {
  const cadastro = modo === "produtos";
  const [categoriasAbertas, setCategoriasAbertas] = useState(false);
  const moeda = (valor) => valor == null ? "Não informado" : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const router = useRouter();
  const confirmAction = useConfirmation();
  const [search, setSearch] = useState(buscaInicial);
  const [catalogoAberto, setCatalogoAberto] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
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
        produtoCorrespondeBusca(product, search),
      ),
    [products, search],
  );
  const pagination = useViewportPagination(visibleProducts, search, 77);

  useEffect(() => {
    setSearch(buscaInicial);
  }, [buscaInicial]);

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
      !await confirmAction(
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

  async function registerEntry(entrada) {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const { error } = await createClient().rpc("registrar_entradas_estoque", { p_data_entrada: entrada.data_entrada, p_itens: entrada.itens });
      if (error) {
        setMessage(["PGRST202", "42883"].includes(error.code)
          ? "Para registrar entradas em lote, aplique a migração desta atualização no Supabase. Nenhuma entrada foi registrada."
          : "Não foi possível registrar as entradas. Nenhum item foi salvo. Confira os produtos, as quantidades e os valores e tente novamente.");
        return;
      }
      setShowEntryForm(false);
      router.refresh();
    } catch { setMessage("Não foi possível confirmar o registro. Verifique sua conexão e confira as entradas por lote antes de reenviar."); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="mb-2 text-sm font-medium text-[#9b6d64]">{cadastro ? "Cadastros" : "Estoque"}</p>
          <h1 className="text-3xl font-semibold text-[#292524]">{cadastro ? "Produtos" : "Estoque disponível"}</h1>
          <p className="mt-2 text-sm text-[#78716c]">{cadastro ? "Gerencie produtos e categorias da sua loja" : "Consulte as peças disponíveis e registre novas entradas."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cadastro ? <>
            <button type="button" onClick={() => setCategoriasAbertas(true)} className="rounded-xl border border-[#ded8d4] bg-white px-4 py-3 text-sm font-semibold text-[#6b625e]">Categorias</button>
            <button type="button" onClick={() => { setProdutoEmEdicao({ id: null }); setShowProductForm(true); setMessage(""); }} className="inline-flex items-center gap-2 rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white"><Icon name="plus" size={18} />Novo produto</button>
          </> : <>
            <button type="button" onClick={() => setCatalogoAberto(true)} className="rounded-xl border border-[#ded8d4] bg-white px-4 py-3 text-sm font-semibold text-[#6b625e]">Catálogo</button>
            <Link href="/estoque/entradas" className="rounded-xl border border-[#ded8d4] bg-white px-4 py-3 text-sm font-semibold text-[#6b625e]">Gerenciar estoque</Link>
            <button type="button" onClick={() => { setShowEntryForm(true); setMessage(""); }} disabled={!produtosEntrada.length} className="inline-flex items-center gap-2 rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Icon name="box" size={18} />Registrar entrada</button>
          </>}
        </div>
      </header>
      {erroCarregamento && <p role="alert" className="mb-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">{erroCarregamento}</p>}
      {erroProdutosEntrada && <p role="alert" className="mb-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">{erroProdutosEntrada}</p>}
      {message && !showProductForm && !showEntryForm && <p role="alert" className="mb-4 rounded-xl bg-[#fff5ed] p-3 text-sm text-[#9a5b3e]">{message}</p>}
      <section className="rounded-2xl border border-[#ebe8e5] bg-white shadow-[0_2px_12px_rgba(41,37,36,0.03)]">
        <div className="flex flex-col gap-4 border-b border-[#f0edeb] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-[#292524]">{cadastro ? "Produtos cadastrados" : "Produtos em estoque"}</h2>
            <p className="mt-1 text-sm text-[#78716c]">
              {cadastro ? "Todos os produtos cadastrados." : "Custo do próximo lote (FIFO) e maior preço de venda cadastrado."}
            </p>
          </div>
          <label className="relative block sm:w-64">
            <span className="sr-only">Buscar por referência ou descrição</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar referência ou descrição"
              className="w-full rounded-xl border border-[#e4dfdb] bg-[#faf9f8] px-4 py-2.5 text-sm outline-none placeholder:text-[#aaa39e] focus:border-[#9b6d64]"
            />
          </label>
        </div>
        {visibleProducts.length ? (
          <div ref={pagination.rowsRef} className="divide-y divide-[#f0edeb]">
            {pagination.itens.map((product) => <article data-page-row key={product.id} className={"grid items-center gap-4 p-4 text-sm sm:px-5 " + (cadastro ? "grid-cols-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" : "grid-cols-3 sm:grid-cols-[minmax(0,1fr)_64px_110px_110px]")}>
              <div className={"flex min-w-0 items-center gap-3 " + (cadastro ? "col-span-2 sm:col-span-1" : "col-span-3 sm:col-span-1")}>
                <button type="button" onClick={() => product.imagem_url && setImagemAmpliada({ url: product.imagem_url, referencia: product.referencia })} aria-label={"Ver foto de " + product.referencia} className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f8ece9] text-xs font-semibold text-[#9b6d64]">
                  {product.imagem_url ? <img src={product.imagem_url} alt={product.referencia} className="size-full object-contain" /> : <Icon name="gem" size={20} />}
                </button>
                <div className="min-w-0"><p title={product.referencia} className="truncate font-semibold text-[#44403c]">{product.referencia}</p><p title={product.descricao || "Sem descrição"} className="mt-1 truncate text-xs text-[#918b87]">{product.descricao || "Sem descrição"}</p></div>
              </div>
              {cadastro ? <>
                <div className="min-w-0"><p className="text-xs text-[#918b87]">Categoria</p><p title={product.categorias?.nome} className="mt-1 truncate text-[#57534e]">{product.categorias?.nome || "Sem categoria"}</p></div>
                <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={() => { setProdutoEmEdicao(product); setShowProductForm(true); setMessage(""); }} className="text-xs font-semibold text-[#9b6d64]">Editar</button><button type="button" onClick={() => excluirProduto(product.id)} className="text-xs font-semibold text-[#9b6d64]">Excluir</button></div>
              </> : <>
                <div className="min-w-0 sm:text-center"><p className="text-[11px] text-[#918b87]">Disponível</p><p className="mt-1 font-semibold tabular-nums text-[#57534e]">{product.quantidade_estoque}</p></div>
                <div className="min-w-0 sm:text-right"><p className="text-[11px] text-[#918b87]">Custo unitário</p><p className="mt-1 break-words text-xs font-medium tabular-nums text-[#57534e] sm:text-sm">{moeda(product.custo_unitario)}</p></div>
                <div className="min-w-0 text-right"><p className="text-[11px] text-[#918b87]">Valor de venda</p><p className="mt-1 break-words text-xs font-semibold tabular-nums text-[#9b6d64] sm:text-sm">{moeda(product.valor_venda)}</p></div>
              </>}
            </article>)}
          </div>
        ) : <div className="p-10 text-center text-sm text-[#918b87]">{search.trim() ? (cadastro ? "Nenhum produto encontrado para esta referência ou descrição." : "Nenhum produto disponível encontrado. Consulte Produtos para verificar referências sem estoque.") : cadastro ? "Nenhum produto cadastrado." : "Nenhum produto com estoque disponível."}</div>}
        <ListPagination pagination={pagination} total={visibleProducts.length} label="produtos" />
      </section>
      {categoriasAbertas && <CategoriesDialog categories={categories} onClose={() => setCategoriasAbertas(false)} />}
      {catalogoAberto && <CatalogShareDialog clientes={clientesCatalogo} erroClientes={erroClientesCatalogo} onClose={() => setCatalogoAberto(false)} />}
      {(showProductForm || showEntryForm) && (
        <div className="app-modal-overlay bg-[#292524]/35">
          <div className={"app-modal-panel w-full rounded-2xl bg-white p-6 shadow-xl " + (showEntryForm ? "max-w-3xl" : "max-w-md")}>
            <div className="app-modal-heading flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#292524]">
                  {showEntryForm
                    ? "Registrar entrada"
                    : produtoEmEdicao.id ? "Editar produto" : "Novo produto"}
                </h2>
                <p className="mt-1 text-sm text-[#78716c]">
                  {showEntryForm
                    ? "Uma data para todos os produtos. Cada item cria seu próprio lote no estoque."
                    : "Cadastre a referência; a entrada de peças é feita no estoque."}
                </p>
              </div>
              <button
                disabled={saving}
                aria-label="Fechar formulário"
                onClick={() => {
                  setShowProductForm(false);
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
              <BatchEntryForm produtos={produtosEntrada} saving={saving} onSave={registerEntry} />
            ) : (
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
                  <CampoSelecao
                    name="categoria_id"
                    opcoes={[
                      { valor: "", rotulo: "Sem categoria" },
                      ...categories.filter((category) => category.ativo !== false).map((category) => ({ valor: category.id, rotulo: category.nome })),
                    ]}
                    valor={produtoEmEdicao.categoria_id || ""}
                    aoSelecionar={(categoria_id) => setProdutoEmEdicao((produto) => ({ ...produto, categoria_id }))}
                    placeholder="Buscar categoria"
                  />
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
            )}
          </div>
        </div>
      )}
      {imagemAmpliada.url && (
        <div
          className="app-modal-overlay bg-[#292524]/70"
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
              className="max-h-[calc(100dvh-4rem)] max-w-full rounded-2xl object-contain shadow-2xl"
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
    <div className="app-modal-actions"><button
      disabled={saving}
      className="mt-2 w-full rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white hover:bg-[#855b53] disabled:opacity-70"
    >
      {saving ? "Salvando..." : label}
    </button></div>
  );
}
