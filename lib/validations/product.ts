import { z } from "zod";

export const productUpsertSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(220),
  brand: z.string().trim().min(1).max(120).default("Apolo"),
  short_description: z.string().trim().max(500).nullable().optional(),
  presentation: z.string().trim().max(200).nullable().optional(),
  viscosity: z.string().trim().max(80).nullable().optional(),
  type: z.string().trim().max(120).nullable().optional(),
  subcategory_id: z.string().trim().max(120).nullable().optional(),
  subcategory: z.string().trim().max(160).nullable().optional(),
  description: z.string().trim().max(8000).nullable().optional(),
  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
  stock_min: z.coerce.number().int().min(0).max(1_000_000).optional().nullable(),
  price: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    z.coerce.number().min(0).max(1_000_000).nullable()
  ).optional(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  category_id: z.string().trim().min(1).max(80).default("automovil"),
  image_url: z.string().trim().max(2000).nullable().optional(),
  image_is_placeholder: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional().nullable(),
  line_group_id: z.string().trim().max(120).nullable().optional(),
  family: z.string().trim().max(40).nullable().optional(),
  attributes: z.record(z.string(), z.string().max(200)).optional(),
  commercial: z
    .object({
      purpose: z.string().trim().max(2000).optional(),
      applications: z.string().trim().max(2000).optional(),
      benefits: z.string().trim().max(2000).optional(),
      features: z.string().trim().max(2000).optional(),
      usage: z.string().trim().max(2000).optional(),
      precautions: z.string().trim().max(2000).optional(),
    })
    .partial()
    .optional(),
  updated_at: z.string().optional(),
});

const EXTENDED_PRODUCT_KEYS = ["family", "attributes", "commercial"] as const;

export function withoutExtendedProductFields(payload: object) {
  const next: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  for (const key of EXTENDED_PRODUCT_KEYS) {
    delete next[key];
  }
  return next;
}

export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;

export function parseProductUpsert(input: unknown) {
  return productUpsertSchema.safeParse(input);
}
