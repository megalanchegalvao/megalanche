import { createClient } from '@supabase/supabase-js';

// Chave pública (anon/publishable) do Supabase para o cliente frontend
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_cpUuM1nm2u5H2faqgrcNxQ_O6yMQ4az';
export const SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY;
export const SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;

// URL configurável (salva no localStorage ou padrão)
export const getSupabaseUrl = (): string => {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('megalanche_supabase_url') : null;
    if (saved && saved.startsWith('http')) return saved;
  } catch {
    // fallback
  }
  return 'https://uiytreumbuaguqvoiczz.supabase.co';
};

export const SUPABASE_URL = getSupabaseUrl();

// Fallback resiliente que simula a interface do Supabase para nunca quebrar a aplicação caso offline
const mockQueryBuilder = {
  select: () => Promise.resolve({ data: [], error: null }),
  insert: () => Promise.resolve({ data: null, error: null }),
  upsert: () => Promise.resolve({ data: null, error: null }),
  update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  eq: () => Promise.resolve({ data: [], error: null }),
};

const mockSupabase = {
  from: () => mockQueryBuilder,
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: new Error('Storage indisponível') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  auth: {
    persistSession: true,
  },
};

// Cliente Supabase resiliente — nunca lança exceção fatal
export const supabase = (() => {
  try {
    if (!SUPABASE_KEY || !SUPABASE_URL) {
      return mockSupabase as any;
    }
    const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
      },
    });
    return client || (mockSupabase as any);
  } catch (err) {
    console.warn('Supabase offline/standby:', err);
    return mockSupabase as any;
  }
})();

export const getSupabaseClient = () => supabase;

/**
 * Faz upload de imagem de produto para o Supabase Storage (bucket 'product-images').
 * Retorna a URL pública da imagem se bem-sucedido, ou null em caso de falha.
 * O bucket deve existir e ter política de leitura pública no Supabase.
 */
export async function uploadProductImageToStorage(
  file: File,
  compressedDataUrl?: string
): Promise<string | null> {
  try {
    // Converte o arquivo ou o data URL para blob para upload
    let blob: Blob;
    let ext = 'jpg';

    if (compressedDataUrl && compressedDataUrl.startsWith('data:image/')) {
      // Usa a versão já comprimida/redimensionada
      const response = await fetch(compressedDataUrl);
      blob = await response.blob();
      ext = compressedDataUrl.includes('image/png') ? 'png' : 'jpg';
    } else {
      blob = file;
      ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) ext = 'jpg';
    }

    const fileName = `produto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, blob, {
        cacheControl: '31536000',
        upsert: false,
        contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      });

    if (error) {
      console.warn('Supabase Storage upload aviso:', error);
      return null;
    }

    if (data?.path) {
      const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        return publicData.publicUrl;
      }
    }

    return null;
  } catch (err) {
    console.warn('Erro ao tentar upload de imagem do produto:', err);
    return null;
  }
}

/**
 * Faz upload de uma string data:image/ (base64) para o bucket 'product-images'.
 * Retorna a URL pública ou null.
 */
export async function uploadBase64ImageToStorage(dataUrl: string): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const ext = dataUrl.includes('image/png') ? 'png' : 'jpg';
    const fileName = `produto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, blob, {
        cacheControl: '31536000',
        upsert: false,
        contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      });

    if (error) {
      console.warn('Supabase Storage uploadBase64 aviso:', error);
      return null;
    }

    if (data?.path) {
      const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        return publicData.publicUrl;
      }
    }
    return null;
  } catch (err) {
    console.warn('Erro uploadBase64ImageToStorage:', err);
    return null;
  }
}

/**
 * Função para upload de comprovante de pagamento Pix (PDF ou Print/Imagem)
 * Faz upload no bucket 'comprovantes' do Supabase Storage.
 * Possui fallback resiliente caso o bucket do Supabase ainda não tenha sido criado.
 */
export async function uploadReceiptToSupabase(file: File): Promise<{
  url: string;
  source: 'supabase' | 'fallback';
  fileName: string;
}> {
  const ext = file.name.split('.').pop() || (file.type === 'application/pdf' ? 'pdf' : 'jpg');
  const cleanFileName = `comprovante_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

  // 1. Tentar upload no Supabase Storage (bucket 'comprovantes')
  try {
    const { data, error } = await supabase.storage
      .from('comprovantes')
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (!error && data?.path) {
      const { data: publicData } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        return {
          url: publicData.publicUrl,
          source: 'supabase',
          fileName: cleanFileName,
        };
      }
    }
    if (error) {
      console.warn('Supabase storage aviso:', error);
    }
  } catch (err) {
    console.warn('Erro ao tentar upload no Supabase Storage:', err);
  }

  // 2. Fallback resiliente: Upload em serviço público de hospedagem temporária (link clicável)
  try {
    const formData = new FormData();
    formData.append('file', file, cleanFileName);
    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.status === 'success' && json?.data?.url) {
        return {
          url: json.data.url,
          source: 'fallback',
          fileName: cleanFileName,
        };
      }
    }
  } catch (err) {
    console.warn('Erro no fallback de upload:', err);
  }

  // 3. Fallback informativo
  return {
    url: `[Arquivo anexado: ${file.name}]`,
    source: 'fallback',
    fileName: cleanFileName,
  };
}

export const SUPABASE_SQL_SCHEMA = `-- =========================================================
-- ESQUEMA SQL MEGA LANCHE GALVÃO — BANCO DE DADOS SUPABASE
-- Copie e cole no SQL Editor do seu painel Supabase para criar as tabelas e o bucket de comprovantes
-- =========================================================

-- 1. Tabela de Configurações da Loja & Banners
create table if not exists public.megalanche_settings (
  id text primary key default 'default',
  store_name text not null default 'Mega Lanche Galvão',
  tagline text not null default 'Sabor que faz a diferença!',
  city text not null default 'Navegantes - SC',
  address text not null default 'Rua Advogado Arão Rebelo, 1136 - Navegantes - SC',
  whatsapp_number text not null default '5547991108716',
  whatsapp_display text not null default '(47) 99110-8716',
  pix_key text not null default '69.984.608/0001-02',
  instagram_handle text not null default '@megalanchegalvao',
  instagram_url text not null default 'https://instagram.com',
  logo_image text default '/images/mega/logo-oficial.jpg',
  top_alert_text text default 'Mega Lanche Galvão • Disk Delivery & Retirada no Balcão!',
  opening_hours text default 'Segunda a Domingo: 18h00 às 23h30',
  delivery_time_estimate text default '',
  pickup_time_estimate text default '',
  hero_title text not null default 'Feito na Hora. Feito para Você.',
  hero_subtitle text not null default 'Lanches artesanais suculentos, as famosas Barcas completas e pastéis super crocantes.',
  hero_badge text default '',
  hero_image text not null default '/images/mega/logo-banner.jpg',
  promo_banner_tag text default 'Oferta Especial para Compartilhar',
  promo_banner_title text default 'As Lendárias Barcas do Mega Lanche Galvão!',
  promo_banner_subtitle text default 'Lanches artesanais suculentos com porção gigante de batata com queijo derretido, bacon crocante e muito cheddar.',
  promo_banner_button text default 'Ver Barcas',
  admin_pin text not null default 'Galvao2026On',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Produtos do Cardápio
create table if not exists public.megalanche_products (
  id text primary key,
  name text not null,
  tagline text not null,
  description text not null,
  category text not null default 'Lanches',
  image text not null,
  images jsonb default '[]'::jsonb,
  available boolean not null default true,
  ingredients_badge text,
  options jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de Cupons de Desconto
create table if not exists public.megalanche_coupons (
  id text primary key,
  code text not null unique,
  description text,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric not null,
  min_order_value numeric default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Bucket de Armazenamento para Imagens de Produtos
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 5. Bucket de Armazenamento para Comprovantes Pix (PDF e Imagens)
insert into storage.buckets (id, name, public) 
values ('comprovantes', 'comprovantes', true)
on conflict (id) do nothing;

-- Habilitar Políticas de Segurança RLS
alter table public.megalanche_settings enable row level security;
alter table public.megalanche_products enable row level security;
alter table public.megalanche_coupons enable row level security;

-- Políticas com verificação de existência para evitar erros ao re-executar
do $$
begin
  -- Storage: product-images
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Permitir upload publico product-images') then
    create policy "Permitir upload publico product-images" on storage.objects for insert with check (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Permitir leitura publica product-images') then
    create policy "Permitir leitura publica product-images" on storage.objects for select using (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Permitir update publico product-images') then
    create policy "Permitir update publico product-images" on storage.objects for update with check (bucket_id = 'product-images');
  end if;

  -- Storage: comprovantes
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Permitir upload publico de comprovantes') then
    create policy "Permitir upload publico de comprovantes" on storage.objects for insert with check (bucket_id = 'comprovantes');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Permitir leitura publica de comprovantes') then
    create policy "Permitir leitura publica de comprovantes" on storage.objects for select using (bucket_id = 'comprovantes');
  end if;

  -- Tabelas: Leitura pública
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'megalanche_settings' and policyname = 'Permitir leitura pública configurações') then
    create policy "Permitir leitura pública configurações" on public.megalanche_settings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'megalanche_products' and policyname = 'Permitir leitura pública produtos') then
    create policy "Permitir leitura pública produtos" on public.megalanche_products for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'megalanche_coupons' and policyname = 'Permitir leitura pública cupons') then
    create policy "Permitir leitura pública cupons" on public.megalanche_coupons for select using (true);
  end if;

  -- Tabelas: Gestão total anon
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'megalanche_settings' and policyname = 'Permitir gestão total anon configurações') then
    create policy "Permitir gestão total anon configurações" on public.megalanche_settings for all using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'megalanche_products' and policyname = 'Permitir gestão total anon produtos') then
    create policy "Permitir gestão total anon produtos" on public.megalanche_products for all using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'megalanche_coupons' and policyname = 'Permitir gestão total anon cupons') then
    create policy "Permitir gestão total anon cupons" on public.megalanche_coupons for all using (true);
  end if;
end $$;
`;
