/**
 * URL canónica del sitio (SEO, sitemap, Open Graph).
 * Preferir `NEXT_PUBLIC_SITE_URL` en producción.
 */
export function getSiteUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "";

  if (explicit.trim()) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
