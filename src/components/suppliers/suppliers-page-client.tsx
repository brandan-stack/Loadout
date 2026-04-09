"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, Mail, Star, TimerReset, Truck } from "lucide-react";
import { TAB_DATA_CACHE_KEYS, invalidateCachedData, primeCachedData } from "@/lib/client-data-cache";
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
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    website: "",
    leadTimeD: 7,
    notes: "",
  });

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
  const averageLeadTime = Math.round(
    suppliers.reduce((total, supplier) => total + supplier.leadTimeD, 0) / Math.max(suppliers.length, 1)
  );

  async function handleCreate() {
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

    setSaving(true);

    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          contact: formData.contact.trim(),
          website: formData.website.trim() || undefined,
          notes: formData.notes.trim(),
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

  async function archiveSupplier(id: string) {
    setError("");

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });

      if (response.ok) {
        invalidateCachedData(TAB_DATA_CACHE_KEYS.suppliers);
        window.location.reload();
        return;
      }

      const payload = await response.json().catch(() => null);
      setError(readApiError(payload) || "Failed to archive supplier.");
    } catch {
      setError("Failed to archive supplier.");
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={<Badge tone="teal">Vendor Workspace</Badge>}
        title="Keep supplier decisions clean and fast"
        description="Show the field team which vendors are quickest, which ones are already preferred, and where the next purchase path is already wired."
        actions={<Button variant="primary" onClick={() => setShowCreatePanel(true)}>Add supplier</Button>}
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
        open={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        title="Add supplier"
        description="Create a vendor record without interrupting the list view."
        footer={
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button className="flex-1" variant="primary" onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Save supplier"}</Button>
            <Button className="flex-1" variant="secondary" onClick={() => setShowCreatePanel(false)}>Cancel</Button>
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
        footer={selectedSupplier ? <Button className="w-full" variant="danger" onClick={() => archiveSupplier(selectedSupplier.id)}>Archive supplier</Button> : null}
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

export default SuppliersPageClient;