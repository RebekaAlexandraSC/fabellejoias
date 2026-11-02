// Read every page rather than silently stopping at the database response limit.
export async function listarTodos(criarConsulta) {
  const registros = [];
  const tamanho = 500;
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await criarConsulta().range(inicio, inicio + tamanho - 1);
    if (error) return { data: [], error };
    registros.push(...(data || []));
    if (!data || data.length < tamanho) return { data: registros, error: null };
  }
}
