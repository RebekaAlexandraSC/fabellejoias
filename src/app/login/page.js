"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage("E-mail ou senha inválidos. Tente novamente.");
      else router.replace("/");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else if (data.session) router.replace("/");
      else
        setMessage("Conta criada! Confira seu e-mail para confirmar o acesso.");
    }
    setLoading(false);
  }

  return (
    <main className="grid min-h-screen bg-[#f8f8f7] lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden bg-[#9b6d64] p-12 text-white lg:flex lg:flex-col justify-center">
        <div className="flex items-center justify-center gap-3">
          <img src="/logo-fabelle.png" alt="Logo Fabelle Joias" className="" />
        </div>
        <div>
          <p className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Sua loja organizada, suas decisões mais tranquilas.
          </p>
          <p className="mt-5 max-w-sm text-sm leading-6 text-[#f6dfda]">
            Controle estoque, vendas e financeiro em um só lugar.
          </p>
        </div>
        <p className="text-sm text-[#f6dfda]">Feito para a Fabelle Joias.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center justify-center gap-3">
            <img src="/logo-fabelle.png" alt="Logo Fabelle Joias" className="" />
            </div>
          </div>
          <p className="text-sm font-medium text-[#9b6d64]">Bem-vinda</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#292524]">
            {mode === "login" ? "Entre na sua conta" : "Crie sua conta"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#78716c]">
            {mode === "login"
              ? "Use seu e-mail e senha para acessar o painel."
              : "Comece a organizar sua loja em poucos passos."}
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#57534e]">
                E-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="voce@exemplo.com"
                className="w-full rounded-xl border border-[#ded8d4] bg-white px-4 py-3 text-sm text-[#292524] outline-none transition placeholder:text-[#b5afa9] focus:border-[#9b6d64] focus:ring-3 focus:ring-[#f4e4e0]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#57534e]">
                Senha
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder="Mínimo de 6 caracteres"
                className="w-full rounded-xl border border-[#ded8d4] bg-white px-4 py-3 text-sm text-[#292524] outline-none transition placeholder:text-[#b5afa9] focus:border-[#9b6d64] focus:ring-3 focus:ring-[#f4e4e0]"
              />
            </label>
            {message && (
              <p
                role="status"
                className="rounded-xl bg-[#fff5ed] px-3 py-2.5 text-sm leading-5 text-[#9a5b3e]"
              >
                {message}
              </p>
            )}
            <button
              disabled={loading}
              className="w-full rounded-xl bg-[#9b6d64] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#855b53] disabled:cursor-wait disabled:opacity-70"
            >
              {loading
                ? "Aguarde..."
                : mode === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-[#78716c]">
            {mode === "login"
              ? "Ainda não possui uma conta?"
              : "Já possui uma conta?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setMessage("");
              }}
              className="font-semibold text-[#9b6d64] hover:text-[#75504a]"
            >
              {mode === "login" ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
