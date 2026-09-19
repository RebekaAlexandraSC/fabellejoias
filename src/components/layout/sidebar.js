"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { createClient } from "@/lib/supabase/client";

const primaryNav = [
  ["Visão geral", "grid", true, "/"],
  ["Estoque", "gem", false, "/estoque"],
  ["Vendas", "shoppingBag", false, "/vendas"],
  ["Clientes", "users", false, "/clientes"],
  ["Financeiro", "wallet", false, "/financeiro"],
  ["Relatórios", "chart", false, "/relatorios"],
];

export function Sidebar() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email || ""));
  }, []);
  return (
    <aside className="border-b border-[#ebe8e5] bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-5 py-4 lg:px-6 lg:py-7">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#9b6d64] text-base font-semibold text-white">
            F
          </span>
          <span>
            <strong className="block text-base tracking-tight text-[#292524]">
              Fabelle Joias
            </strong>
            <small className="block text-[11px] font-medium text-[#a8a29e]">
              GESTÃO
            </small>
          </span>
        </Link>
        <button className="rounded-lg p-2 text-[#a8a29e] lg:hidden">
          <Icon name="settings" size={19} />
        </button>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:px-3 lg:pb-0"
        aria-label="Navegação principal"
      >
        {primaryNav.map(([label, icon, active, href]) => (
          <NavItem
            key={label}
            label={label}
            icon={icon}
            active={href === "/" ? pathname === "/" : pathname.startsWith(href)}
            href={href}
          />
        ))}
      </nav>
      <div className="mt-auto hidden border-t border-[#f0edeb] p-3 lg:block">
        <div className="mt-4 rounded-xl bg-[#faf6f4] p-3">
          <p className="truncate text-xs font-semibold text-[#8f625a]">
            {email || "Fabelle Joias"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#9a817b]">
            Conta conectada
          </p>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}

function NavItem({ label, icon, active = false, href = "#" }) {
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-[#f8ece9] text-[#8e6058]" : "text-[#78716c] hover:bg-[#faf9f8] hover:text-[#4c4743]"}`}
    >
      <Icon name={icon} size={19} />
      <span>{label}</span>
    </Link>
  );
}
