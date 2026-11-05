import { z } from "zod";

export const quoteItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().default("Apolo"),
  presentation: z.string().optional(),
  line: z.string().optional(),
  viscosity: z.string().optional(),
  code: z.string().optional(),
  image: z.string().optional(),
  quantity: z.coerce.number().int().min(1).max(9999),
});

export const quoteCreateSchema = z.object({
  clientName: z.string().trim().min(1).max(160).optional(),
  city: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(quoteItemSchema).min(1, "La cotización está vacía"),
});

export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;
