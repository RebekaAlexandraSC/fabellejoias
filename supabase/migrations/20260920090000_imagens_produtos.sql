alter table public.produtos add column if not exists imagem_url text;

insert into storage.buckets (id, name, public)
values ('imagens-produtos', 'imagens-produtos', true)
on conflict (id) do update set public = true;

drop policy if exists "usuário envia imagens dos próprios produtos" on storage.objects;
drop policy if exists "usuário atualiza imagens dos próprios produtos" on storage.objects;
drop policy if exists "usuário remove imagens dos próprios produtos" on storage.objects;
drop policy if exists "imagens de produtos para autenticados" on storage.objects;

create policy "imagens de produtos para autenticados"
on storage.objects for all to authenticated
using (bucket_id = 'imagens-produtos')
with check (bucket_id = 'imagens-produtos');
