"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { Loader2, Plus, RefreshCw, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

type Supplier = {
  id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

const emptyForm = {
  name: "",
  contact_name: "",
  phone: "",
  email: "",
  notes: "",
};

export default function ProveedoresPage() {
  const supabase = createBrowserSupabase();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) throw error;
      setRows((data || []) as Supplier[]);
    } catch (e: any) {
      toast.error("No se pudieron cargar proveedores", {
        description: e?.message || "¿Ejecutaste supabase_suppliers.sql?",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("suppliers").insert({
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        is_active: true,
      });
      if (error) throw error;
      toast.success("Proveedor creado");
      setForm(emptyForm);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar proveedor "${name}"?`)) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Eliminado");
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Proveedores</h1>
          <p className="text-sm text-zinc-400 mt-1">Registro de proveedores y contactos.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl px-3.5 py-2 text-xs font-semibold border border-white/10 bg-[#141414] text-zinc-300 cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recargar
        </button>
      </div>

      <form
        onSubmit={onCreate}
        className="rounded-2xl border border-white/10 bg-[#141414] p-5 grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Nombre del proveedor *"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white md:col-span-2"
        />
        <input
          value={form.contact_name}
          onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
          placeholder="Contacto"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="Teléfono"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
        />
        <input
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
        />
        <input
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Notas"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
        />
        <button
          type="submit"
          disabled={saving}
          className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#C7940A] text-black font-bold text-sm py-2.5 cursor-pointer disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          {saving ? "Guardando..." : "Agregar proveedor"}
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#C7940A]" />
          Cargando...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center text-zinc-400">
          <Truck className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          No hay proveedores registrados.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-white/10 bg-[#141414] px-4 py-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-white">{s.name}</p>
                <p className="text-xs text-zinc-500">
                  {[s.contact_name, s.phone, s.email].filter(Boolean).join(" · ") || "Sin contacto"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(s.id, s.name)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
