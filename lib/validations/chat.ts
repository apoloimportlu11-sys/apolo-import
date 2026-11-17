import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(24),
});

export const adminChatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(24),
  pageContext: z.string().trim().max(200).optional(),
  /** Código de cotización a analizar (ej. APL-…) */
  quoteCode: z
    .string()
    .trim()
    .max(40)
    .regex(/^APL-[A-Z0-9-]+$/i, "Código de cotización inválido")
    .optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type AdminChatRequest = z.infer<typeof adminChatRequestSchema>;
