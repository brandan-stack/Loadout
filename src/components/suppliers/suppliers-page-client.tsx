"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, Mail, Plus, SquarePen, Star, TimerReset, Trash2, Truck } from "lucide-react";
import { TAB_DATA_CACHE_KEYS, invalidateCachedData, primeCachedData } from "@/lib/client-data-cache";
import type { SupplierEmailContact } from "@/lib/supplier-contacts";
import { StatCard } from "@/components/cards/StatCard";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { SidePanel } from "@/components/panels/SidePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  emailContacts: SupplierEmailContact[];
  website?: string;
  leadTimeD: number;
  notes?: string;
  archived: boolean;
  linkedItemCount: number;
  preferred: boolean;
  fastest: boolean;
  rating: number;
}

interface SuppliersPageClientProps {
  initialSuppliers: Supplier[];
}

type SupplierFormState = {
  name: string;
  contact: string;
  website: string;
  leadTimeD: number;
  notes: string;
  preferred: boolean;
  fastest: boolean;
  emailContacts: Array<{ label: string; email: string }>;
};

const EMPTY_FORM: SupplierFormState = {
  name: "",
  contact: "",
  website: "",
  leadTimeD: 7,
  notes: "",
  preferred: false,
  fastest: false,
  emailContacts: [{ label: "Sales", email: "" }],
};

function readApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = (payload as { error?: unknown }).error;
  if (typeof candidate === "string") {
    return candidate;
  }

  if (Array.isArray(candidate)) {
    const first = candidate[0] as { message?: unknown } | undefined;
    if (first && typeof first.message === "string") {
      return first.message;
    }
  }

  return null;
}

export function SuppliersPageClient({ initialSuppliers }: SuppliersPageClientProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<{ open: boolean; supplierId?: string }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<SupplierFormState>(EMPTY_FORM);

  useEffect(() => {
    primeCachedData(TAB_DATA_CACHE_KEYS.suppliers, initialSuppliers);
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      if (filter === "preferred" && !supplier.preferred) {
        return false;
      }

      if (filter === "fastest" && !supplier.fastest) {
        return false;
      }

      if (!search.trim()) {
        return true;
      }

      const query = search.trim().toLowerCase();
      return [supplier.name, supplier.contact, supplier.website, supplier.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [filter, search, suppliers]);

  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null;
  const editingSupplier = suppliers.find((supplier) => supplier.id === editorState.supplierId) ?? null;
  const averageLeadTime = Math.round(
    suppliers.reduce((total, supplier) => total + supplier.leadTimeD, 0) / Math.max(suppliers.length, 1)
  );

  function openCreatePanel() {
    setError("");
    setFormData(EMPTY_FORM);
    setEditorState({ open: true });
  }

  function openEditPanel(supplier: Supplier) {
    setError("");
    setFormData({
      name: supplier.name,
      contact: supplier.contact ?? "",
      website: supplier.website ?? "",
      leadTimeD: supplier.leadTimeD,
      notes: supplier.notes ?? "",
      preferred: supplier.preferred,
      fastest: supplier.fastest,
      emailContacts: supplier.emailContacts.length > 0 ? supplier.emailContacts.map((entry) => ({ ...entry })) : [{ label: "Sales", email: supplier.contact ?? "" }],
    });
    setEditorState({ open: true, supplierId: supplier.id });
  }

  function addEmailContact() {
    setFormData((current) => ({
      ...current,
      emailContacts: [...current.emailContacts, { label: "", email: "" }],
    }));
  }

  function updateEmailContact(index: number, field: "label" | "email", value: string) {
    setFormData((current) => ({
      ...current,
      emailContacts: current.emailContacts.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: value } : entry)),
    }));
  }

  function removeEmailContact(index: number) {
    setFormData((current) => ({
      ...current,
      emailContacts: current.emailContacts.length === 1 ? [{ label: "", email: "" }] : current.emailContacts.filter((_, entryIndex) => entryIndex !== index),
    }));
  }

  async function handleSave() {
    setError("");

    if (!formData.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    if (formData.website.trim()) {
      try {
        new URL(formData.website.trim());
      } catch {
        setError("Please enter a valid website URL.");
        return;
      }
    }

    const emailContacts = formData.emailContacts
      .map((entry) => ({ label: entry.label.trim(), email: entry.email.trim().toLowerCase() }))
      .filter((entry) => entry.label || entry.email);

    if (emailContacts.some((entry) => !entry.label || !entry.email)) {
      setError("Each supplier email needs both a position and an email address.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(editorState.supplierId ? `/api/suppliers/${editorState.supplierId}` : "/api/suppliers", {
        method: editorState.supplierId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          contact: formData.contact.trim(),
          website: formData.website.trim() || undefined,
          leadTimeD: formData.leadTimeD,
          notes: formData.notes.trim(),
          isPreferred: formData.preferred,
          isFastest: formData.fastest,
          emailContacts,
        }),
      });

      if (response.ok) {
        invalidateCachedData(TAB_DATA_CACHE_KEYS.suppliers);
        window.location.reload();
        return;
      }

      const payload = await response.json().catch(() => null);
      setError(readApiError(payload) || "Failed to create supplier.");
    } catch {
      setError("Failed to create supplier.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSupplier(id: string) {
    setError("");

    if (!confirm("Are you sure you want to delete this supplier?")) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });

      if (response.ok) {
        invalidateCachedData(TAB_DATA_CACHE_KEYS.suppliers);
        window.location.reload();
        return;
      }

      const payload = await response.json().catch(() => null);
      setError(readApiError(payload) || "Failed to delete supplier.");
    } catch {
      setError("Failed to delete supplier.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={<Badge tone="teal">Vendor Workspace</Badge>}
        title="Keep supplier decisions clean and fast"
        description="Show the field team which vendors are quickest, which ones are already preferred, and where the next purchase path is already wired."
        actions={<Button variant="primary" onClick={openCreatePanel}>Add supplier</Button>}
      />

      {error ? (
        <PageSection>
          <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">{error}</Card>
        </PageSection>
      ) : null}

      <PageSection className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Suppliers" value={String(suppliers.length)} hint="Active vendors in the workspace" tone="blue" icon={Truck} />
        <StatCard label="Preferred" value={String(suppliers.filter((supplier) => supplier.preferred).length)} hint="Already linked to stocked items" tone="teal" icon={Star} />
        <StatCard label="Fastest" value={String(suppliers.filter((supplier) => supplier.fastest).length)} hint="Shortest lead-time vendors" tone="green" icon={TimerReset} />
        <StatCard label="Avg lead" value={`${averageLeadTime}d`} hint="Average delivery lead time" tone="orange" icon={Mail} />
      </PageSection>

      <PageSection>
        <Card className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Supplier controls</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/78">Filter by preference or speed, then open the supplier panel without leaving the list.</p>
            </div>
            <Badge tone="slate">{filteredSuppliers.length} showing</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
            <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search suppliers" />
            <FilterTabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: String(suppliers.length) },
                { value: "preferred", label: "Preferred", count: String(suppliers.filter((supplier) => supplier.preferred).length) },
                { value: "fastest", label: "Fastest", count: String(suppliers.filter((supplier) => supplier.fastest).length) },
              ]}
            />
          </div>
        </Card>
      </PageSection>

      <PageSection className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {filteredSuppliers.length > 0 ? (
          filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">{supplier.name}</h2>
                    {supplier.preferred ? <Badge tone="teal">Preferred</Badge> : null}
                    {supplier.fastest ? <Badge tone="green">Fastest</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300/78">{supplier.linkedItemCount} linked items • {supplier.leadTimeD} day lead time</p>
                </div>
                <Badge tone="blue">{supplier.rating}/5</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Contact</p>
                  <p className="mt-3 text-sm text-white">{supplier.contact || "No contact"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Website</p>
                  <p className="mt-3 truncate text-sm text-white">{supplier.website || "No website"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button variant="secondary" onClick={() => setSelectedSupplierId(supplier.id)}>Open details</Button>
                <Button variant="secondary" onClick={() => openEditPanel(supplier)}>
                  <SquarePen className="h-4 w-4" />
                  Edit
                </Button>
                {supplier.website ? <Button variant="ghost" href={supplier.website} target="_blank" rel="noreferrer">Open site</Button> : null}
              </div>
            </Card>
          ))
        ) : (
          <Card className="text-center lg:col-span-2 xl:col-span-3">
            <h2 className="text-lg font-semibold text-white">No suppliers match the current view</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300/78">Adjust the filters or search terms to surface a different vendor.</p>
          </Card>
        )}
      </PageSection>

      <SidePanel
        open={editorState.open}
        onClose={() => setEditorState({ open: false })}
        title={editorState.supplierId ? "Edit supplier" : "Add supplier"}
        description="Set the vendor profile, flag preferred or fastest options, and keep the right email contacts ready for purchasing."
        footer={
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button className="flex-1" variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editorState.supplierId ? "Save changes" : "Save supplier"}</Button>
            <Button className="flex-1" variant="secondary" onClick={() => setEditorState({ open: false })}>Cancel</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Name</span>
            <input value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Contact</span>
            <input value={formData.contact} onChange={(event) => setFormData({ ...formData, contact: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Website</span>
            <input value={formData.website} onChange={(event) => setFormData({ ...formData, website: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lead time</span>
            <input type="number" min={0} value={formData.leadTimeD} onChange={(event) => setFormData({ ...formData, leadTimeD: Number(event.target.value) || 0 })} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleCard label="Preferred" description="Pin this vendor as a preferred option in the supplier workspace." checked={formData.preferred} onToggle={() => setFormData((current) => ({ ...current, preferred: !current.preferred }))} />
            <ToggleCard label="Fastest" description="Highlight this vendor for quick-turn fulfillment." checked={formData.fastest} onToggle={() => setFormData((current) => ({ ...current, fastest: !current.fastest }))} />
          </div>
          <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Email contacts</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Add as many supplier contacts as needed with a custom role like sales, support, accounts, or dispatch.</p>
              </div>
              <Button variant="secondary" onClick={addEmailContact}>
                <Plus className="h-4 w-4" />
                Add email
              </Button>
            </div>
            <div className="space-y-3">
              {formData.emailContacts.map((entry, index) => (
                <div key={`email-contact-${index}`} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
                  <label className="space-y-2">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Position</span>
                    <input value={entry.label} onChange={(event) => updateEmailContact(index, "label", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" placeholder="Sales" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Email</span>
                    <input type="email" value={entry.email} onChange={(event) => updateEmailContact(index, "email", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" placeholder="sales@supplier.com" />
                  </label>
                  <div className="flex items-end">
                    <Button variant="ghost" onClick={() => removeEmailContact(index)}>
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Notes</span>
            <textarea value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} rows={4} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
          </label>
        </div>
      </SidePanel>

      <SidePanel
        open={selectedSupplier !== null}
        onClose={() => setSelectedSupplierId(null)}
        title={selectedSupplier?.name ?? "Supplier detail"}
        description={selectedSupplier ? `${selectedSupplier.leadTimeD} day lead time` : undefined}
        footer={selectedSupplier ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => openEditPanel(selectedSupplier)}>
              <SquarePen className="h-4 w-4" />
              Edit supplier
            </Button>
            <Button variant="danger" onClick={() => deleteSupplier(selectedSupplier.id)} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete supplier"}
            </Button>
          </div>
        ) : null}
      >
        {selectedSupplier ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {selectedSupplier.preferred ? <Badge tone="teal">Preferred supplier</Badge> : null}
              {selectedSupplier.fastest ? <Badge tone="green">Fastest route</Badge> : null}
              <Badge tone="blue">{selectedSupplier.rating}/5 rating</Badge>
            </div>
            <Card className="space-y-4 bg-white/[0.04]">
              <SupplierDetail label="Contact" value={selectedSupplier.contact || "No contact"} icon={Mail} />
              <SupplierDetail label="Website" value={selectedSupplier.website || "No website"} icon={Globe} />
              <SupplierDetail label="Linked items" value={String(selectedSupplier.linkedItemCount)} icon={Truck} />
            </Card>
            <Card className="space-y-3 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email contacts</p>
              {selectedSupplier.emailContacts.length > 0 ? selectedSupplier.emailContacts.map((entry) => (
                <div key={`${selectedSupplier.id}-${entry.label}-${entry.email}`} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{entry.label}</p>
                    <p className="mt-1 text-sm text-slate-300">{entry.email}</p>
                  </div>
                  <Badge tone="slate">Email</Badge>
                </div>
              )) : <p className="text-sm text-slate-400">No supplier emails saved yet.</p>}
            </Card>
            {selectedSupplier.notes ? <p className="text-sm leading-6 text-slate-300/78">{selectedSupplier.notes}</p> : null}
          </div>
        ) : null}
      </SidePanel>
    </PageShell>
  );
}

function SupplierDetail({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Mail }) {
  return (
    <div className="flex items-center gap-4">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-200">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-2 text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

function ToggleCard({ label, description, checked, onToggle }: { label: string; description: string; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`rounded-[1.5rem] border px-4 py-4 text-left transition-colors ${checked ? "border-emerald-400/30 bg-emerald-500/[0.08]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
        </div>
        <Badge tone={checked ? "green" : "slate"}>{checked ? "On" : "Off"}</Badge>
      </div>
    </button>
  );
}

export default SuppliersPageClient;