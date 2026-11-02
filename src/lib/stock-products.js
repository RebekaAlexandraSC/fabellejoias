export async function listarProdutosAtivos(supabase) {
  const produtos = [];
  const tamanhoLote = 500;
  for (let inicio = 0; ; inicio += tamanhoLote) {
    const { data, error } = await supabase
      .from("produtos")
      .select("id, referencia, descricao")
      .eq("ativo", true)
      .order("referencia")
      .order("id")
      .range(inicio, inicio + tamanhoLote - 1);
    if (error) return { data: [], error };
    produtos.push(...(data || []));
    if (!data || data.length < tamanhoLote) return { data: produtos, error: null };
  }
}
