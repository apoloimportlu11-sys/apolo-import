-- Biblioteca multimedia central (Apolo Lubricantes)
-- Ejecutar en Supabase SQL Editor. Idempotente y seguro con datos existentes.

create extension if not exists "pgcrypto";

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null unique,
  public_url text not null,
  brand text not null default 'general',
  category text not null default 'products',
  alt_text text,
  byte_size integer,
  content_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists media_assets_brand_idx on public.media_assets (brand);
create index if not exists media_assets_category_idx on public.media_assets (category);
create index if not exists media_assets_file_name_idx on public.media_assets (file_name);

-- Galería secundaria en productos (JSON array de URLs). image_url sigue siendo la principal.
alter table public.products
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb;

comment on column public.products.gallery_urls is
  'URLs adicionales de la biblioteca multimedia (no incluye image_url principal).';

alter table public.media_assets enable row level security;

drop policy if exists "media_assets_select_authenticated" on public.media_assets;
create policy "media_assets_select_authenticated"
  on public.media_assets for select
  to authenticated
  using (true);

drop policy if exists "media_assets_select_anon_public_catalog" on public.media_assets;
create policy "media_assets_select_anon_public_catalog"
  on public.media_assets for select
  to anon
  using (category = 'products');

-- Escritura solo vía service role / admin API (sin policy insert/update/delete para anon/authenticated).
-- El panel usa /api/admin/media con SUPABASE_SERVICE_ROLE_KEY.
