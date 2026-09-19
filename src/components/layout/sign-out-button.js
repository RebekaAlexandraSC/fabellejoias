"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="cursor-pointer mt-3 text-xs font-semibold text-[#8f625a] transition hover:text-[#704b44]"
    >
      Sair da conta
    </button>
  );
}
