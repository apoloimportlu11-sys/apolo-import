type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

/** Datos estructurados JSON-LD (SEO). Solo renderiza script; sin UI. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
