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
  const visibleCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.nome} ${customer.telefone || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [customers, search],
  );

  async function createCustomer(form) {
    setSaving(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(form));
    const { error } = await createClient()
      .from("clientes")
      .insert({
        nome: values.nome.trim(),
        telefone: values.telefone.trim() || null,
        observacao: values.observacao.trim() || null,
      });
    setSaving(false);
    if (error)
      return setMessage(
        "Não foi possível cadastrar a cliente. Tente novamente.",
      );
    setOpen(false);
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
                  <p className="mt-0.5 text-xs text-[#8f8985]">
                    {customer.telefone || "Telefone não informado"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${customer.ativo ? "bg-[#eaf5ee] text-[#4f8c6d]" : "bg-[#f3f2f1] text-[#8d8782]"}`}
                >
                  {customer.ativo ? "Ativa" : "Inativa"}
                </span>
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
                  Nova cliente
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
                createCustomer(event.currentTarget);
              }}
              className="mt-6 space-y-4"
            >
              <Field
                label="Nome"
                name="nome"
                placeholder="Nome da cliente"
                required
              />
              <Field
                label="Telefone"
                name="telefone"
                type="tel"
                placeholder="(00) 00000-0000"
              />
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
              <button
                disabled={saving}
                className="w-full rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white hover:bg-[#855b53] disabled:opacity-70"
              >
                {saving ? "Salvando..." : "Cadastrar cliente"}
              </button>
            </form>
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
