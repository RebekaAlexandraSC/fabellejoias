import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicCatalog } from "@/components/stock/public-catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catálogo | Fabelle Joias", robots: { index: false, follow: false } };
export default async function CatalogPage({ params }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consultar_catalogo", { p_token: token });
  if (error) return <main className="grid min-h-screen place-items-center bg-[#faf8f6] p-6 text-center"><div><h1 className="text-2xl font-semibold text-[#57534e]">Catálogo indisponível no momento</h1><p className="mt-3 text-[#78716c]">Tente novamente em instantes ou fale com a Fabelle.</p></div></main>;
  if (!data) notFound();
  return <PublicCatalog produtos={data.produtos || []} />;
}
