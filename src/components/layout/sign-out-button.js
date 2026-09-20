"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ className = "" }) {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className={`mt-3 cursor-pointer text-xs font-semibold text-[#8f625a] transition hover:text-[#704b44] ${className}`}
    >
      Sair da conta
    </button>
  );
}
