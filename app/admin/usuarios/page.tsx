"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import {
  Users,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  Save,
  X,
  Search,
  Shield,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "vendor" | "cliente";
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export default function UsuariosPage() {
  const supabase = createBrowserSupabase();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<UserProfile>>({
    name: "",
    email: "",
    role: "cliente",
    is_active: true,
  });

  const loadUsers = useCallback(async (showToast = false) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && !error) {
        setUsers(data);
        if (showToast) toast.info("Usuarios sincronizados en tiempo real");
      }
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadUsers();

    // 1. BroadcastChannel
    let unsubscribeBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubscribeBus = realtimeBus.on("users_updated", () => {
        loadUsers(true);
      });
    }

    // 2. Supabase Realtime
    const channel = supabase
      .channel("realtime:users_auth")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newUser = payload.new as UserProfile;
            setUsers((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id)]);
            setRecentlyUpdatedId(newUser.id);
            toast.info(`Nuevo usuario registrado: ${newUser.name}`);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as UserProfile;
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setRecentlyUpdatedId(updated.id);
          } else if (payload.eventType === "DELETE") {
            const oldId = payload.old.id;
            setUsers((prev) => prev.filter((u) => u.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      if (unsubscribeBus) unsubscribeBus();
      supabase.removeChannel(channel);
    };
  }, [supabase, loadUsers]);

  useEffect(() => {
    if (recentlyUpdatedId) {
      const timer = setTimeout(() => setRecentlyUpdatedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [recentlyUpdatedId]);

  function openCreateModal() {
    setIsEditing(false);
    setCurrentUser({
      name: "",
      email: "",
      role: "cliente",
      is_active: true,
    });
    setShowModal(true);
  }

  function openEditModal(user: UserProfile) {
    setIsEditing(true);
    setCurrentUser({ ...user });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: currentUser.name?.trim() || "Usuario",
      email: currentUser.email?.trim().toLowerCase() || "",
      role: currentUser.role || "admin",
      is_active: currentUser.is_active !== undefined ? currentUser.is_active : true,
      updated_at: new Date().toISOString(),
    };

    const toastId = toast.loading(
      isEditing ? "Guardando perfil de usuario en tiempo real..." : "Creando usuario..."
    );

    try {
      if (isEditing && currentUser.id) {
        const { error } = await supabase
          .from("users")
          .update(payload)
          .eq("id", currentUser.id);

        if (error) throw error;

        const updatedItem = { ...currentUser, ...payload } as UserProfile;
        setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedItem : u)));
        setRecentlyUpdatedId(currentUser.id);

        if (realtimeBus) realtimeBus.emit("users_updated", updatedItem);

        toast.success("¡Usuario guardado exitosamente!", {
          id: toastId,
          description: `Perfil de "${payload.name}" actualizado en vivo.`,
        });
      } else {
        const { data, error } = await supabase
          .from("users")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setUsers((prev) => [data, ...prev]);
          setRecentlyUpdatedId(data.id);
          if (realtimeBus) realtimeBus.emit("users_updated", data);
        }

        toast.success("¡Usuario creado exitosamente!", {
          id: toastId,
          description: `El usuario "${payload.name}" ha sido registrado.`,
        });
      }

      setShowModal(false);
    } catch (err: any) {
      toast.error("Error al guardar usuario", {
        id: toastId,
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Estás seguro de eliminar el perfil de "${name}"? Esta acción se sincronizará inmediatamente.`)) {
      return;
    }

    const toastId = toast.loading("Eliminando usuario...");
    try {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (realtimeBus) realtimeBus.emit("users_updated", { id, deleted: true });

      toast.success("Usuario eliminado", {
        id: toastId,
        description: `"${name}" ha sido removido del sistema.`,
      });
    } catch (err: any) {
      toast.error("Error al eliminar", {
        id: toastId,
        description: err.message,
      });
    }
  }

  async function toggleStatus(id: string, current: boolean) {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, is_active: !current } : u))
    );
    setRecentlyUpdatedId(id);

    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: !current, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      if (realtimeBus) realtimeBus.emit("users_updated", { id, is_active: !current });
      toast.success(!current ? "Usuario activado" : "Usuario desactivado", { duration: 1500 });
    } catch (err: any) {
      toast.error("Error al cambiar estado");
      loadUsers();
    }
  }

  async function handleRoleChange(id: string, newRole: "admin" | "editor" | "vendor" | "cliente") {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );
    setRecentlyUpdatedId(id);

    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      if (realtimeBus) realtimeBus.emit("users_updated", { id, role: newRole });
      toast.success(`Rol cambiado a ${newRole.toUpperCase()}`, { duration: 1500 });
    } catch (err: any) {
      toast.error("Error al cambiar rol");
      loadUsers();
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      return (
        searchQuery === "" ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [users, searchQuery]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C7940A]/10 border border-[#C7940A]/20 text-[#C7940A]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Usuarios & Permisos
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Administra roles, accesos y permisos del equipo con sincronización reactiva en vivo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Radio className="w-3.5 h-3.5" />
            <span>En vivo</span>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-4 py-2.5 font-bold text-black hover:bg-[#d9a311] transition-all text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar usuarios por nombre, correo o rol..."
          className="w-full rounded-xl border border-white/10 bg-[#141414] pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#C7940A]" />
          <span className="text-sm">Cargando usuarios en tiempo real...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center text-zinc-400 space-y-3">
          <Users className="w-12 h-12 mx-auto text-zinc-600" />
          <p className="text-lg font-bold text-white">
            {searchQuery ? "No se encontraron usuarios" : "No hay usuarios registrados"}
          </p>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            {searchQuery
              ? "Prueba buscando con otro nombre o email."
              : "Haz clic en \"Nuevo Usuario\" para registrar a un miembro del equipo."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase text-zinc-400 font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Rol Asignado</th>
                  <th className="px-5 py-4 text-center">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {filteredUsers.map((u) => {
                  const isHighlighted = recentlyUpdatedId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors duration-500 hover:bg-white/[0.03] ${
                        isHighlighted ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#C7940A]/20 border border-[#C7940A]/40 flex items-center justify-center font-bold text-[#C7940A] shrink-0">
                            {u.name ? u.name[0].toUpperCase() : "U"}
                          </div>
                          <span className="font-bold text-white">{u.name}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                        {u.email}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={u.role || "cliente"}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                          className="rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:border-[#C7940A] focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="cliente">Cliente / Consumidor</option>
                          <option value="admin">Administrador (Total)</option>
                          <option value="editor">Editor (Contenido)</option>
                          <option value="vendor">Vendedor (Catálogo)</option>
                        </select>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleStatus(u.id, u.is_active)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                            u.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                          }`}
                        >
                          {u.is_active ? "Activo" : "Inactivo"}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Editar usuario"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id, u.name)}
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Usuario */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161616] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#C7940A]" />
                <h2 className="text-lg font-bold text-white">
                  {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={currentUser.name || ""}
                  onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={currentUser.email || ""}
                  onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  placeholder="usuario@lubricantesapolo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Rol en el Sistema
                </label>
                <select
                  value={currentUser.role || "cliente"}
                  onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value as any })}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                >
                  <option value="cliente">Cliente / Consumidor (Acceso estándar)</option>
                  <option value="admin">Administrador (Acceso total)</option>
                  <option value="editor">Editor de Contenido</option>
                  <option value="vendor">Vendedor (Gestión de stock)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user_is_active"
                  checked={currentUser.is_active !== undefined ? currentUser.is_active : true}
                  onChange={(e) => setCurrentUser({ ...currentUser, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-black text-[#C7940A] focus:ring-0"
                />
                <label htmlFor="user_is_active" className="text-xs text-zinc-300 cursor-pointer">
                  ¿Usuario Activo?
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#d9a311] shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
