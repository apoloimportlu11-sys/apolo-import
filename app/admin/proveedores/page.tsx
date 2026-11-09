"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import {
  Copy,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Supplier = {
  id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active?: boolean;
  created_at?: string;
};

type StatusFilter = "all" | "active" | "paused" | "no-phone" | "no-email";
type SortKey = "name" | "recent";

const PAGE_SIZE_OPTIONS = [10, 20, 40] as const;
const emptyForm = { name: "", contact_name: "", phone: "", email: "", notes: "", is_active: true };

const fieldClass =
  "w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 py-2 text-sm text-[var(--admin-ink)] placeholder:text-[var(--admin-faint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--admin-accent)]";

function pageWindow(current: number, total: number) {
  const wanted = [1, total, current - 2, current - 1, current, current + 1, current + 2].filter(
    (page) => page >= 1 && page <= total
  );
  return [...new Set(wanted)].sort((a, b) => a - b);
}

function digits(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export default function ProveedoresPage() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [rows, setRows] = useState<Supplier[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      setRows((data || []) as Supplier[]);
      const links = await supabase.from("product_suppliers").select("supplier_id");
      if (!links.error && links.data) {
        const counts: Record<string, number> = {};
        for (const link of links.data) {
          const id = String(link.supplier_id);
          counts[id] = (counts[id] || 0) + 1;
        }
        setProductCounts(counts);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "¿Ejecutaste supabase_suppliers.sql?";
      toast.error("No se pudieron cargar proveedores", { description: message });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    const list = rows.filter((row) => {
      if (status === "active" && row.is_active === false) return false;
      if (status === "paused" && row.is_active !== false) return false;
      if (status === "no-phone" && row.phone?.trim()) return false;
      if (status === "no-email" && row.email?.trim()) return false;
      if (!q) return true;
      return [row.name, row.contact_name, row.phone, row.email, row.notes]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(q);
    });
    list.sort((a, b) => {
      if (sort === "recent") return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      return a.name.localeCompare(b.name, "es");
    });
    return list;
  }, [rows, query, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [query, status, sort, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const activeCount = rows.filter((row) => row.is_active !== false).length;
  const missingPhone = rows.filter((row) => !row.phone?.trim()).length;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: Supplier) {
    setEditing(row);
    setForm({
      name: row.name,
      contact_name: row.contact_name || "",
      phone: row.phone || "",
      email: row.email || "",
      notes: row.notes || "",
      is_active: row.is_active !== false,
    });
    setOpen(true);
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("El correo no tiene un formato válido");
      return;
    }
    const duplicate = rows.some(
      (row) => row.id !== editing?.id && row.name.trim().toLocaleLowerCase("es") === name.toLocaleLowerCase("es")
    );
    if (duplicate) {
      toast.error("Ya existe un proveedor con ese nombre");
      return;
    }
    const payload = {
      name,
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
    setSaving(true);
    try {
      const query = editing
        ? supabase.from("suppliers").update(payload).eq("id", editing.id)
        : supabase.from("suppliers").insert({ ...payload, is_active: form.is_active });
      const { error } = await query;
      if (error) throw error;
      toast.success(editing ? "Proveedor actualizado" : "Proveedor creado");
      setOpen(false);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(row: Supplier) {
    const next = row.is_active === false;
    const { error } = await supabase.from("suppliers").update({ is_active: next, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, is_active: next } : item)));
    toast.success(next ? "Proveedor activo" : "Proveedor pausado");
  }

  async function onDelete() {
    if (!pendingDelete) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Proveedor eliminado");
      setRows((current) => current.filter((item) => item.id !== pendingDelete.id));
    }
    setPendingDelete(null);
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <div className="w-full space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-[var(--admin-ink)]">Proveedores</h1>
          <p className="mt-2 text-base text-[var(--admin-muted)]">
            {rows.length} en total · {activeCount} activos · {missingPhone} sin teléfono
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 py-2 text-sm text-[var(--admin-ink)] hover:bg-[var(--admin-canvas)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recargar
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--admin-accent)] px-3 py-2 text-sm font-semibold text-[#ffffff]"
          >
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--admin-faint)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, contacto, teléfono o correo"
            aria-label="Buscar proveedores"
            className={`${fieldClass} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          aria-label="Filtrar por estado"
          className={`${fieldClass} lg:w-48`}
        >
          <option value="all">Todos</option>
          <option value="active">Solo activos</option>
          <option value="paused">Solo pausados</option>
          <option value="no-phone">Sin teléfono</option>
          <option value="no-email">Sin correo</option>
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          aria-label="Ordenar proveedores"
          className={`${fieldClass} lg:w-44`}
        >
          <option value="name">Nombre</option>
          <option value="recent">Más recientes</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[var(--admin-muted)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--admin-accent)]" />
          Cargando proveedores
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-6 py-16 text-center">
          <Truck className="mx-auto mb-3 h-10 w-10 text-[var(--admin-faint)]" />
          <p className="text-sm text-[var(--admin-ink)]">
            {rows.length === 0 ? "Todavía no hay proveedores." : "Ningún proveedor coincide con la búsqueda."}
          </p>
          {rows.length === 0 ? (
            <button type="button" onClick={openCreate} className="mt-4 cursor-pointer text-sm font-medium text-[var(--admin-accent)]">
              Crear el primero
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
              className="mt-4 cursor-pointer text-sm font-medium text-[var(--admin-accent)]"
            >
              Ver todos
            </button>
          )}
        </div>
      ) : (
        <>
          <Pager page={safePage} pageCount={pageCount} from={from} to={to} total={filtered.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
          <div className="overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)]">
            <table className="w-full text-left">
              <thead className="border-b border-[var(--admin-line)] bg-[var(--admin-canvas)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Contacto</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Productos</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const paused = row.is_active === false;
                  const products = productCounts[row.id] || 0;
                  return (
                    <tr key={row.id} className="border-t border-[var(--admin-line)] first:border-t-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--admin-ink)]">{row.name}</p>
                        <p className="mt-1 text-xs text-[var(--admin-muted)] md:hidden">
                          {[row.contact_name, row.phone, row.email].filter(Boolean).join(" · ") || "Sin contacto"}
                        </p>
                        {row.notes ? <p className="mt-1 line-clamp-1 text-xs text-[var(--admin-faint)]">{row.notes}</p> : null}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <div className="space-y-1 text-sm text-[var(--admin-ink)]">
                          <p className="flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5 text-[var(--admin-faint)]" />
                            {row.contact_name || "Sin contacto"}
                          </p>
                          {row.phone ? (
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-[var(--admin-faint)]" />
                              <a href={`tel:${digits(row.phone)}`} className="hover:text-[var(--admin-accent)]">
                                {row.phone}
                              </a>
                              <button type="button" aria-label="Copiar teléfono" onClick={() => copyText(row.phone || "", "Teléfono")} className="cursor-pointer text-[var(--admin-faint)] hover:text-[var(--admin-ink)]">
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </p>
                          ) : (
                            <p className="text-xs text-[var(--admin-faint)]">Sin teléfono</p>
                          )}
                          {row.email ? (
                            <p className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-[var(--admin-faint)]" />
                              <a href={`mailto:${row.email}`} className="hover:text-[var(--admin-accent)]">
                                {row.email}
                              </a>
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-[var(--admin-muted)] lg:table-cell">
                        {products === 1 ? "1 producto" : `${products} productos`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onToggle(row)}
                            className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium ${paused ? "bg-[var(--admin-canvas)] text-[var(--admin-muted)] ring-1 ring-[var(--admin-line)]" : "bg-emerald-100 text-emerald-800"}`}
                          >
                            {paused ? "Pausado" : "Activo"}
                          </button>
                          <button type="button" aria-label={`Editar ${row.name}`} onClick={() => openEdit(row)} className="cursor-pointer rounded-lg p-2 text-[var(--admin-muted)] hover:bg-[var(--admin-canvas)] hover:text-[var(--admin-ink)]">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" aria-label={`Eliminar ${row.name}`} onClick={() => setPendingDelete(row)} className="cursor-pointer rounded-lg p-2 text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager page={safePage} pageCount={pageCount} from={from} to={to} total={filtered.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-[var(--admin-line)] bg-[var(--admin-surface)] text-[var(--admin-ink)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-[var(--admin-ink)]">
              {editing ? "Editar proveedor" : "Nuevo proveedor"}
            </DialogTitle>
            <DialogDescription className="text-[var(--admin-muted)]">
              El nombre identifica al proveedor. Teléfono y correo sirven para contactarlo desde la lista.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSave} className="space-y-3">
            <label className="block text-sm text-[var(--admin-ink)]">
              Nombre
              <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={`${fieldClass} mt-1.5`} />
            </label>
            <label className="block text-sm text-[var(--admin-ink)]">
              Persona de contacto
              <input value={form.contact_name} onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))} className={`${fieldClass} mt-1.5`} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-[var(--admin-ink)]">
                Teléfono
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="block text-sm text-[var(--admin-ink)]">
                Correo
                <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={`${fieldClass} mt-1.5`} />
              </label>
            </div>
            <label className="block text-sm text-[var(--admin-ink)]">
              Notas
              <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className={`${fieldClass} mt-1.5 resize-y`} />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--admin-ink)]">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Activo
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-canvas)]">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="cursor-pointer rounded-lg bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-[#ffffff] disabled:opacity-50">
                {saving ? "Guardando..." : editing ? "Guardar" : "Crear proveedor"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(next) => !next && setPendingDelete(null)}>
        <AlertDialogContent className="border-[var(--admin-line)] bg-[var(--admin-surface)] text-[var(--admin-ink)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proveedor</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--admin-muted)]">
              Se quita «{pendingDelete?.name}» y su vínculo con productos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[var(--admin-line)] bg-[var(--admin-surface)] text-[var(--admin-ink)]">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-[#ffffff] hover:bg-red-700" onClick={onDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Pager({
  page,
  pageCount,
  from,
  to,
  total,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: (typeof PAGE_SIZE_OPTIONS)[number]) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[var(--admin-muted)]">
          {from}–{to} de {total}
        </p>
        <label className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
          Por página
          <select
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
            aria-label="Proveedores por página"
            className="h-9 rounded-full border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-sm text-[var(--admin-ink)]"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onPage(1)} disabled={page <= 1} className="h-9 cursor-pointer rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40">
          Primera
        </button>
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className="h-9 cursor-pointer rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40">
          Anterior
        </button>
        {pageWindow(page, pageCount).map((number, index, list) => {
          const previous = list[index - 1];
          return (
            <span key={number} className="flex items-center gap-1.5">
              {previous && number - previous > 1 ? <span className="px-1 text-[var(--admin-faint)]">…</span> : null}
              <button
                type="button"
                onClick={() => onPage(number)}
                aria-current={number === page ? "page" : undefined}
                className={`h-9 min-w-9 cursor-pointer rounded-full px-3 text-sm ${number === page ? "bg-[var(--admin-accent)] text-[#ffffff]" : "border border-[var(--admin-line)] text-[var(--admin-ink)]"}`}
              >
                {number}
              </button>
            </span>
          );
        })}
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount} className="h-9 cursor-pointer rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40">
          Siguiente
        </button>
        <button type="button" onClick={() => onPage(pageCount)} disabled={page >= pageCount} className="h-9 cursor-pointer rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40">
          Última
        </button>
      </div>
    </div>
  );
}
