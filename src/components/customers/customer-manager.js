"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/icon";

export function CustomerManager({ customers }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [clienteEmEdicao, setClienteEmEdicao] = useState({ id: null });
  const visibleCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.nome} ${customer.telefone || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [customers, search],
  );

  async function salvarCliente(form) {
    setSaving(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(form));
    const telefone = values.telefone.replace(/\D/g, "").trim();
    const dadosCliente = {
      nome: values.nome.trim(),
      telefone: telefone || null,
      observacao: values.observacao.trim() || null,
    };
    const consulta = createClient().from("clientes");
    const { error } = clienteEmEdicao.id
      ? await consulta.update(dadosCliente).eq("id", clienteEmEdicao.id)
      : await consulta.insert(dadosCliente);
    setSaving(false);
    if (error)
      return setMessage("Não foi possível salvar a cliente. Tente novamente.");
    setOpen(false);
    setClienteEmEdicao({ id: null });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-[#9b6d64]">Cadastros</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#292524] sm:text-4xl">
            Clientes
          </h1>
          <p className="mt-2 text-sm text-[#78716c]">
            Mantenha os contatos organizados para registrar vendas com
            facilidade.
          </p>
        </div>
        <button
          onClick={() => {
            setOpen(true);
            setClienteEmEdicao({ id: null });
            setMessage("");
          }}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#855b53] sm:self-auto"
        >
          <Icon name="plus" size={18} />
          Nova cliente
        </button>
      </header>
      <section className="rounded-2xl border border-[#ebe8e5] bg-white shadow-[0_2px_12px_rgba(41,37,36,0.03)]">
        <div className="flex flex-col gap-4 border-b border-[#f0edeb] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-[#292524]">
              Lista de clientes
            </h2>
            <p className="mt-1 text-sm text-[#78716c]">
              {customers.length}{" "}
              {customers.length === 1
                ? "cliente cadastrada"
                : "clientes cadastradas"}
              .
            </p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar nome ou telefone"
            className="w-full rounded-xl border border-[#e4dfdb] bg-[#faf9f8] px-4 py-2.5 text-sm outline-none placeholder:text-[#aaa39e] focus:border-[#9b6d64] sm:w-64"
          />
        </div>
        {visibleCustomers.length ? (
          <div className="divide-y divide-[#f0edeb]">
            {visibleCustomers.map((customer) => (
              <article
                key={customer.id}
                className="flex items-center gap-4 px-5 py-4 sm:px-6"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f8ece9] text-sm font-semibold text-[#9b6d64]">
                  {customer.nome.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-[#44403c]">
                    {customer.nome}
                  </h3>
                  {customer.telefone ? (
                    <a
                      href={`https://wa.me/${customer.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <p className="mt-0.5 text-xs text-[#8f8985]">
                        {formatarTelefone(customer.telefone)}
                      </p>
                    </a>
                  ) : (
                    <p className="mt-0.5 text-xs text-[#8f8985]">
                      Telefone não informado
                    </p>
                  )}
                </div>
                <div className="hidden max-w-xs flex-1 text-sm text-[#78716c] sm:block">
                  {customer.observacao || "—"}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${customer.ativo ? "bg-[#eaf5ee] text-[#4f8c6d]" : "bg-[#f3f2f1] text-[#8d8782]"}`}
                >
                  {customer.ativo ? "Ativa" : "Inativa"}
                </span>
                <button
                  onClick={() => {
                    setClienteEmEdicao(customer);
                    setOpen(true);
                    setMessage("");
                  }}
                  className="text-xs font-semibold text-[#9b6d64]"
                >
                  Editar
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-[#f8ece9] text-[#9b6d64]">
              <Icon name="users" size={22} />
            </span>
            <h3 className="mt-4 font-semibold text-[#44403c]">
              {search
                ? "Nenhuma cliente encontrada"
                : "Cadastre sua primeira cliente"}
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-[#78716c]">
              {search
                ? "Tente outro nome ou telefone."
                : "Ela poderá ser selecionada ao registrar uma venda."}
            </p>
            {!search && (
              <button
                onClick={() => setOpen(true)}
                className="mt-5 text-sm font-semibold text-[#9b6d64]"
              >
                Adicionar cliente
              </button>
            )}
          </div>
        )}
      </section>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#292524]/35 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#292524]">
                  {clienteEmEdicao.id ? "Editar cliente" : "Nova cliente"}
                </h2>
                <p className="mt-1 text-sm text-[#78716c]">
                  Os dados podem ser complementados depois.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
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
            <form
              onSubmit={(event) => {
                event.preventDefault();
                salvarCliente(event.currentTarget);
              }}
              className="mt-6 space-y-4"
            >
              <Field
                label="Nome"
                name="nome"
                placeholder="Nome da cliente"
                required
                defaultValue={clienteEmEdicao.nome || ""}
              />
              <Field
                label="Telefone"
                name="telefone"
                type="tel"
                placeholder="11999999999"
                defaultValue={clienteEmEdicao.telefone || ""}
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#57534e]">
                  Observação{" "}
                  <em className="font-normal text-[#9a9591]">(opcional)</em>
                </span>
                <textarea
                  name="observacao"
                  rows="3"
                  defaultValue={clienteEmEdicao.observacao || ""}
                  className="w-full resize-none rounded-xl border border-[#ded8d4] px-3 py-2.5 text-sm outline-none focus:border-[#9b6d64]"
                />
              </label>
              <button
                disabled={saving}
                className="w-full rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white hover:bg-[#855b53] disabled:opacity-70"
              >
                {saving
                  ? "Salvando..."
                  : clienteEmEdicao.id
                    ? "Salvar alterações"
                    : "Cadastrar cliente"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatarTelefone(valor) {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);

  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  }

  if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return valor;
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
