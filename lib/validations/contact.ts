import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(120),
  email: z.string().trim().email("Correo inválido").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Mensaje demasiado corto").max(4000),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
