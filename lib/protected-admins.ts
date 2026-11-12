/** Cuenta propietaria: siempre admin y no se puede degradar/eliminar desde la UI. */
export const OWNER_ADMIN_EMAIL = "apoloimportlu11@gmail.com";

export function normalizeEmail(email?: string | null): string {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function isProtectedOwnerAdmin(email?: string | null): boolean {
  return normalizeEmail(email) === OWNER_ADMIN_EMAIL;
}
