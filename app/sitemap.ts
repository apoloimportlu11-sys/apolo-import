import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";
import { getSiteUrl } from "@/lib/site-url";

const STATIC_PATHS: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/productos", changeFrequency: "daily", priority: 0.9 },
  { path: "/nosotros", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contacto", changeFrequency: "monthly", priority: 0.8 },
  { path: "/terminos", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacidad", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
];

async function productEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return [];

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, updated_at, is_active")
      .neq("is_active", false)
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error || !data?.length) return [];

    return data.map((row) => {
      const segment = encodeURIComponent(String(row.slug || row.id));
      return {
        url: `${base}/productos/${segment}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      };
    });
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((item) => ({
    url: `${base}${item.path}`,
    lastModified: now,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  const products = await productEntries(base);
  return [...staticEntries, ...products];
}
