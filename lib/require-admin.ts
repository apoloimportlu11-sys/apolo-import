import { createServerSupabase } from "@/lib/supabase-server";
import { resolveIsAdmin } from "@/lib/admin-role";

export type RequireAdminResult =
  | { ok: true; email: string }
  | { ok: false; status: 401 | 403; message: string };

// Verifica, en el servidor, que la petición venga de una sesión de Supabase
// válida y que ese usuario tenga role === "admin" en la tabla public.users.
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, status: 401, message: "No autenticado" };
  }

  const isAdmin = await resolveIsAdmin(supabase, user);
  if (!isAdmin) {
    return { ok: false, status: 403, message: "No tienes permisos de administrador" };
  }

  return { ok: true, email: user.email };
}
