import { CategoryManager } from "@/components/stock/category-manager";
import { createClient } from "@/lib/supabase/server";
export default async function CategoriesPage() {
  const { data } = await (
    await createClient()
  )
    .from("categorias")
    .select("id,nome,descricao,ativo")
    .order("nome");
  return <CategoryManager categories={data || []} />;
}
