import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isStaffRole, type StaffRole } from "@/lib/admin-permissions";

export type { StaffRole };

async function readUserRole(
  supabase: SupabaseClient,
  user?: Pick<User, "id" | "email"> | null
): Promise<string | null> {
  if (user?.id) {
    const { data } = await supabase
      .from("users")
      .select("role,is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (data && data.is_active !== false && data.role) {
      return String(data.role);
    }
  }

  const email = user?.email?.trim();
  if (email) {
    const { data } = await supabase
      .from("users")
      .select("role,is_active")
      .ilike("email", email)
      .maybeSingle();
    if (data && data.is_active !== false && data.role) {
      return String(data.role);
    }
  }

  return null;
}

/**
 * Determina si el usuario autenticado es admin.
 * Prioriza RPC is_admin(), luego fila en public.users.
 */
export async function resolveIsAdmin(
  supabase: SupabaseClient,
  user?: Pick<User, "id" | "email"> | null
): Promise<boolean> {
  try {
    const { data: rpcAdmin, error: rpcError } = await supabase.rpc("is_admin");
    if (!rpcError && rpcAdmin === true) {
      return true;
    }
  } catch {
    // entornos sin la función RPC siguen con la consulta a users
  }

  const role = await readUserRole(supabase, user);
  return role === "admin";
}

/** Rol de staff con acceso al panel: admin | editor | vendor. */
export async function resolveStaffRole(
  supabase: SupabaseClient,
  user?: Pick<User, "id" | "email"> | null
): Promise<StaffRole | null> {
  if (await resolveIsAdmin(supabase, user)) {
    return "admin";
  }
  const role = await readUserRole(supabase, user);
  return isStaffRole(role) ? role : null;
}
