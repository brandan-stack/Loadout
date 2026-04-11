"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BriefcaseBusiness,
  Boxes,
  CircleAlert,
  FolderOpen,
  PackageMinus,
  PackagePlus,
  RotateCcw,
  ScanLine,
  Warehouse,
} from "lucide-react";
import {
  createOfflineMutationPayload,
  getOfflineQueueSummary,
  runMutationWithOfflineSupport,
  subscribeToOfflineQueue,
  type OfflineQueueSummary,
} from "@/lib/offline-queue";
import { canViewFinancialValue, type FinancialVisibilityMode } from "@/lib/financial-visibility";
import { StatCard } from "@/components/cards/StatCard";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { SidePanel } from "@/components/panels/SidePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";

export interface InventoryPageSupplier {
  id: string;
  name: string;
  leadTimeD: number;
}

export interface InventoryPageLocation {
  id: string;
  name: string;
  description?: string;
}

export interface InventoryPageJob {
  id: string;
  jobNumber: string;
  description?: string;
  customer: string;
  date: string;
  status: string;
}

export interface InventoryPageItem {
  id: string;
  name: string;
  manufacturer?: string;
  partNumber?: string;
  modelNumber?: string;
  category?: string;
  description?: string;
  photoUrl?: string;
  quantityOnHand: number;
  lowStockAmberThreshold: number;
  lowStockRedThreshold: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  defaultLocationId?: string;
  defaultLocationName?: string;
  lastUnitCost?: number;
  unitOfMeasure: string;
  lastMovementAt?: string;
  lastMovementType?: string;
  linkedJobsCount: number;
}

interface ItemCatalogClientProps {
  financialVisibilityMode: FinancialVisibilityMode;
  permissions: {
    canAddInventory: boolean;
    canEditInventory: boolean;
    canMoveInventory: boolean;
    canRemoveInventory: boolean;
    canUseInventoryOnJob: boolean;
    canReturnInventoryFromJob: boolean;
  };
  initialItems: InventoryPageItem[];
  initialSuppliers: InventoryPageSupplier[];
  initialLocations: InventoryPageLocation[];
  initialJobs: InventoryPageJob[];
  initialSelectedItemId?: string;
}

type StockFilter = "all" | "low" | "critical";
type MovementAction = "move_stock" | "use_on_job" | "return_from_job" | "receive_stock" | "adjust_quantity";
type CreateItemDraft = {
  name: string;
  manufacturer: string;
  partNumber: string;
  modelNumber: string;
  category: string;
  description: string;
  quantityOnHand: string;
  lowStockAmberThreshold: string;
  lowStockRedThreshold: string;
  preferredSupplierId: string;
  unitOfMeasure: string;
  locationId: string;
  lastUnitCost: string;
};
type MovementDraft = {
  action: MovementAction;
  quantity: string;
  quantityDelta: string;
  fromLocationId: string;
  toLocationId: string;
  jobId: string;
  supplierCost: string;
  notes: string;
};

const EMPTY_CREATE_DRAFT: CreateItemDraft = {
  name: "",
  manufacturer: "",
  partNumber: "",
  modelNumber: "",
  category: "",
  description: "",
  quantityOnHand: "0",
  lowStockAmberThreshold: "5",
  lowStockRedThreshold: "2",
  preferredSupplierId: "",
  unitOfMeasure: "units",
  locationId: "",
  lastUnitCost: "",
};

function createMovementDraft(item?: InventoryPageItem, action: MovementAction = "receive_stock"): MovementDraft {
  return {
    action,
    quantity: "1",
    quantityDelta: action === "adjust_quantity" ? "0" : "",
    fromLocationId: item?.defaultLocationId ?? "",
    toLocationId: item?.defaultLocationId ?? "",
    jobId: "",
    supplierCost: item?.lastUnitCost?.toString() ?? "",
    notes: "",
  };
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseInteger(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseCurrency(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getStockTone(item: InventoryPageItem): "green" | "orange" | "red" {
  if (item.quantityOnHand <= item.lowStockRedThreshold) {
    return "red";
  }
  if (item.quantityOnHand <= item.lowStockAmberThreshold) {
    return "orange";
  }
  return "green";
}

function getStockLabel(item: InventoryPageItem) {
  const tone = getStockTone(item);
  if (tone === "red") {
    return "Critical";
  }
  if (tone === "orange") {
    return "Low";
  }
  return "Healthy";
}

function formatDateTime(value?: string) {
  if (!value) {
    return "No movement yet";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "No movement yet" : parsed.toLocaleString();
}

function formatMoney(value?: number) {
  if (value === undefined) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function buildItemSearchText(item: InventoryPageItem) {
  return [
    item.name,
    item.manufacturer,
    item.partNumber,
    item.modelNumber,
    item.category,
    item.description,
    item.preferredSupplierName,
    item.defaultLocationName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function applyMovementOptimistically(
  item: InventoryPageItem,
  draft: MovementDraft,
  locations: InventoryPageLocation[],
  jobs: InventoryPageJob[]
) {
  const quantity = parseInteger(draft.quantity) ?? 0;
  const quantityDelta = parseInteger(draft.quantityDelta) ?? 0;
  const next = { ...item };
  const now = new Date().toISOString();

  if (draft.action === "receive_stock") {
    next.quantityOnHand += quantity;
    next.lastUnitCost = parseCurrency(draft.supplierCost) ?? next.lastUnitCost;
    next.defaultLocationId = draft.toLocationId || next.defaultLocationId;
  }

  if (draft.action === "move_stock") {
    next.defaultLocationId = draft.toLocationId || next.defaultLocationId;
  }

  if (draft.action === "adjust_quantity") {
    next.quantityOnHand += quantityDelta;
  }

  if (draft.action === "use_on_job") {
    next.quantityOnHand -= quantity;
    next.linkedJobsCount += 1;
  }

  if (draft.action === "return_from_job") {
    next.quantityOnHand += quantity;
  }

  const locationName = locations.find((location) => location.id === (draft.toLocationId || next.defaultLocationId))?.name;
  const jobNumber = jobs.find((job) => job.id === draft.jobId)?.jobNumber;

  next.defaultLocationName = locationName ?? next.defaultLocationName;
  next.lastMovementAt = now;
  next.lastMovementType =
    draft.action === "use_on_job" && jobNumber
      ? `${draft.action}:${jobNumber}`
      : draft.action;

  return next;
}

export function ItemCatalogClient({
  financialVisibilityMode,
  permissions,
  initialItems,
  initialSuppliers,
  initialLocations,
  initialJobs,
  initialSelectedItemId,
}: ItemCatalogClientProps) {
  const [items, setItems] = useState(initialItems);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [locations] = useState(initialLocations);
  const [jobs] = useState(initialJobs);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialSelectedItemId ?? initialItems[0]?.id ?? null);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateItemDraft>(EMPTY_CREATE_DRAFT);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [movementItemId, setMovementItemId] = useState<string | null>(null);
  const [movementDraft, setMovementDraft] = useState<MovementDraft>(createMovementDraft());
  const [movementError, setMovementError] = useState("");
  const [submittingMovement, setSubmittingMovement] = useState(false);
  const [queueSummary, setQueueSummary] = useState<OfflineQueueSummary>(getOfflineQueueSummary());

  useEffect(() => subscribeToOfflineQueue(() => setQueueSummary(getOfflineQueueSummary())), []);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const movementItem = items.find((item) => item.id === movementItemId) ?? null;
  const lowCount = items.filter((item) => getStockTone(item) === "orange").length;
  const criticalCount = items.filter((item) => getStockTone(item) === "red").length;
  const visibleBase = canViewFinancialValue(financialVisibilityMode, "base");
  const visibleTotal = canViewFinancialValue(financialVisibilityMode, "total");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const tone = getStockTone(item);
      if (stockFilter === "critical" && tone !== "red") {
        return false;
      }
      if (stockFilter === "low" && tone === "green") {
        return false;
      }
      if (!query) {
        return true;
      }
      return buildItemSearchText(item).includes(query);
    });
  }, [items, search, stockFilter]);

  async function refreshItems() {
    const response = await fetch("/api/items", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to refresh inventory");
    }
    const payload = (await response.json()) as InventoryPageItem[];
    setItems(payload);
    setSuppliers((current) => current);
  }

  function openMovement(item: InventoryPageItem, action: MovementAction) {
    setMovementItemId(item.id);
    setMovementDraft(createMovementDraft(item, action));
    setMovementError("");
  }

  async function handleCreateItem() {
    const quantityOnHand = parseInteger(createDraft.quantityOnHand);
    const lowThreshold = parseInteger(createDraft.lowStockAmberThreshold);
    const criticalThreshold = parseInteger(createDraft.lowStockRedThreshold);

    if (!createDraft.name.trim()) {
      setCreateError("Item name is required.");
      return;
    }
    if (quantityOnHand === undefined || quantityOnHand < 0) {
      setCreateError("Quantity on hand must be a whole number of 0 or greater.");
      return;
    }
    if (lowThreshold === undefined || lowThreshold < 1) {
      setCreateError("Low threshold must be at least 1.");
      return;
    }
    if (criticalThreshold === undefined || criticalThreshold < 0 || criticalThreshold > lowThreshold) {
      setCreateError("Critical threshold must be 0 or greater and not exceed the low threshold.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createDraft.name.trim(),
          manufacturer: normalizeOptionalText(createDraft.manufacturer),
          partNumber: normalizeOptionalText(createDraft.partNumber),
          modelNumber: normalizeOptionalText(createDraft.modelNumber),
          category: normalizeOptionalText(createDraft.category),
          description: normalizeOptionalText(createDraft.description),
          quantityOnHand,
          lowStockAmberThreshold: lowThreshold,
          lowStockRedThreshold: criticalThreshold,
          preferredSupplierId: normalizeOptionalText(createDraft.preferredSupplierId),
          lastUnitCost: parseCurrency(createDraft.lastUnitCost),
          unitOfMeasure: normalizeOptionalText(createDraft.unitOfMeasure) ?? "units",
          locationId: normalizeOptionalText(createDraft.locationId),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to add item.");
      }

      await refreshItems();
      setShowCreatePanel(false);
      setCreateDraft(EMPTY_CREATE_DRAFT);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to add item.");
    } finally {
      setCreating(false);
    }
  }

  async function handleMovementSubmit() {
    if (!movementItem) {
      return;
    }

    const quantity = parseInteger(movementDraft.quantity);
    const quantityDelta = parseInteger(movementDraft.quantityDelta);

    if (["move_stock", "use_on_job", "return_from_job", "receive_stock"].includes(movementDraft.action) && (!quantity || quantity < 1)) {
      setMovementError("Quantity must be a whole number greater than zero.");
      return;
    }
    if (movementDraft.action === "move_stock" && (!movementDraft.fromLocationId || !movementDraft.toLocationId)) {
      setMovementError("Choose both source and destination locations.");
      return;
    }
    if (movementDraft.action === "use_on_job" && !movementDraft.jobId) {
      setMovementError("Select a job before logging usage.");
      return;
    }
    if (movementDraft.action === "return_from_job" && (!movementDraft.jobId || !movementDraft.toLocationId)) {
      setMovementError("Select the job and return location.");
      return;
    }
    if (movementDraft.action === "adjust_quantity" && quantityDelta === undefined) {
      setMovementError("Adjustment amount must be a whole number.");
      return;
    }

    setSubmittingMovement(true);
    setMovementError("");

    const payload = createOfflineMutationPayload({
      action: movementDraft.action,
      quantity,
      quantityDelta,
      fromLocationId: normalizeOptionalText(movementDraft.fromLocationId),
      toLocationId: normalizeOptionalText(movementDraft.toLocationId),
      jobId: normalizeOptionalText(movementDraft.jobId),
      supplierCost: parseCurrency(movementDraft.supplierCost),
      notes: normalizeOptionalText(movementDraft.notes),
    });

    try {
      const result = await runMutationWithOfflineSupport({
        url: `/api/items/${movementItem.id}/movements`,
        method: "POST",
        scope: "inventory",
        body: payload,
      });

      if (result.queued) {
        const optimistic = applyMovementOptimistically(movementItem, movementDraft, locations, jobs);
        setItems((current) => current.map((item) => (item.id === optimistic.id ? optimistic : item)));
      } else {
        const response = result.response;
        if (!response) {
          throw new Error("Movement response was missing.");
        }

        if (!response.ok) {
          const responsePayload = await response.json().catch(() => null);
          throw new Error(responsePayload?.error || "Failed to save movement.");
        }

        const updated = (await response.json()) as InventoryPageItem;
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      }

      setMovementItemId(null);
    } catch (error) {
      setMovementError(error instanceof Error ? error.message : "Failed to save movement.");
    } finally {
      setSubmittingMovement(false);
    }
  }

  return (
    <PageShell className="form-screen">
      <PageHeader
        eyebrow={<Badge tone="blue">Inventory Workspace</Badge>}
        title="Move stock with job context"
        description="Keep the existing dark operational shell, but make each record actionable. Stock movement, job usage, and offline submission all sit directly inside the inventory workspace."
        actions={
          <>
            <Button variant="secondary" href="/scan">
              <ScanLine className="h-4 w-4" />
              Scan
            </Button>
            {permissions.canAddInventory ? (
              <Button variant="primary" onClick={() => { setCreateError(""); setShowCreatePanel(true); }}>
                <PackagePlus className="h-4 w-4" />
                Add item
              </Button>
            ) : null}
          </>
        }
      />

      <PageSection className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Records" value={String(items.length)} hint="Tracked inventory items" tone="blue" icon={Boxes} />
        <StatCard label="Low stock" value={String(lowCount)} hint="Watch soon" tone={lowCount > 0 ? "orange" : "green"} icon={Warehouse} />
        <StatCard label="Critical" value={String(criticalCount)} hint="Needs action first" tone={criticalCount > 0 ? "red" : "green"} icon={CircleAlert} />
        <StatCard label="Locations" value={String(locations.length)} hint="Stock points active" tone="teal" icon={ArrowRightLeft} />
        <StatCard label="Queued" value={String(queueSummary.total)} hint="Offline mutations waiting" tone={queueSummary.total > 0 ? "orange" : "green"} icon={RotateCcw} />
      </PageSection>

      <PageSection>
        <Card className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Operational inventory records</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/78">Search across manufacturer, part number, category, location, and supplier, then trigger the right stock action without flattening the page into a generic grid.</p>
            </div>
            <Badge tone="slate">{filteredItems.length} showing</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
            <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, manufacturer, category, supplier, or location" />
            <FilterTabs
              value={stockFilter}
              onChange={(value) => setStockFilter(value as StockFilter)}
              options={[
                { value: "all", label: "All records", count: String(items.length) },
                { value: "low", label: "Low stock", count: String(lowCount + criticalCount) },
                { value: "critical", label: "Critical", count: String(criticalCount) },
              ]}
            />
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const tone = getStockTone(item);
            return (
              <Card key={item.id} className="rounded-[1.8rem] border-white/8 bg-[linear-gradient(180deg,rgba(11,19,34,0.94),rgba(10,15,27,0.82))] p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.04]">
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.photoUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-500">
                          <Boxes className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">{item.name}</h3>
                        <Badge tone={tone}>{getStockLabel(item)}</Badge>
                        {item.category ? <Badge tone="slate">{item.category}</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-300">
                        {[item.manufacturer, item.partNumber ? `Part ${item.partNumber}` : null, item.modelNumber ? `Model ${item.modelNumber}` : null]
                          .filter(Boolean)
                          .join(" • ") || "No manufacturer or part metadata yet"}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <DataPill label="Location" value={item.defaultLocationName || "Unassigned"} />
                        <DataPill label="Supplier" value={item.preferredSupplierName || "Not linked"} />
                        <DataPill label="Last movement" value={formatDateTime(item.lastMovementAt)} />
                        <DataPill label="Linked jobs" value={String(item.linkedJobsCount)} />
                      </div>
                      {item.description ? <p className="mt-4 text-sm leading-6 text-slate-400">{item.description}</p> : null}
                    </div>
                  </div>

                  <div className="xl:w-[19rem]">
                    <div className="grid grid-cols-2 gap-3">
                      <MetricBox label="On hand" value={`${item.quantityOnHand} ${item.unitOfMeasure}`} />
                      <MetricBox label="Thresholds" value={`${item.lowStockRedThreshold} / ${item.lowStockAmberThreshold}`} helpText="Critical / low" />
                      {visibleBase ? <MetricBox label="Base cost" value={formatMoney(item.lastUnitCost)} /> : null}
                      {visibleTotal ? <MetricBox label="Stock total" value={formatMoney((item.lastUnitCost ?? 0) * item.quantityOnHand)} /> : null}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button variant="secondary" onClick={() => setSelectedItemId(item.id)}>
                        <FolderOpen className="h-4 w-4" />
                        Open
                      </Button>
                      {permissions.canAddInventory ? (
                        <Button variant="secondary" onClick={() => openMovement(item, "receive_stock")}>
                          <PackagePlus className="h-4 w-4" />
                          Add
                        </Button>
                      ) : null}
                      {permissions.canRemoveInventory ? (
                        <Button variant="secondary" onClick={() => openMovement(item, "adjust_quantity")}>
                          <PackageMinus className="h-4 w-4" />
                          Remove
                        </Button>
                      ) : null}
                      {permissions.canMoveInventory ? (
                        <Button variant="secondary" onClick={() => openMovement(item, "move_stock")}>
                          <ArrowRightLeft className="h-4 w-4" />
                          Move
                        </Button>
                      ) : null}
                      {permissions.canUseInventoryOnJob ? (
                        <Button variant="primary" onClick={() => openMovement(item, "use_on_job")}>
                          <BriefcaseBusiness className="h-4 w-4" />
                          Use on job
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </PageSection>

      <SidePanel
        open={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        title="Add inventory item"
        description="Capture the key record fields without leaving the inventory workspace."
        footer={
          <div className="flex flex-col gap-3">
            {createError ? <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">{createError}</Card> : null}
            <Button variant="primary" onClick={handleCreateItem} disabled={creating}>
              {creating ? "Saving..." : "Save item"}
            </Button>
            <Button variant="secondary" onClick={() => setShowCreatePanel(false)}>Cancel</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormInput label="Item name" value={createDraft.name} onChange={(value) => setCreateDraft((current) => ({ ...current, name: value }))} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Manufacturer" value={createDraft.manufacturer} onChange={(value) => setCreateDraft((current) => ({ ...current, manufacturer: value }))} />
            <FormInput label="Part number" value={createDraft.partNumber} onChange={(value) => setCreateDraft((current) => ({ ...current, partNumber: value }))} />
            <FormInput label="Model number" value={createDraft.modelNumber} onChange={(value) => setCreateDraft((current) => ({ ...current, modelNumber: value }))} />
            <FormInput label="Category" value={createDraft.category} onChange={(value) => setCreateDraft((current) => ({ ...current, category: value }))} />
          </div>
          <FormTextarea label="Description" value={createDraft.description} onChange={(value) => setCreateDraft((current) => ({ ...current, description: value }))} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Quantity on hand" type="number" value={createDraft.quantityOnHand} onChange={(value) => setCreateDraft((current) => ({ ...current, quantityOnHand: value }))} />
            <FormInput label="Unit type" value={createDraft.unitOfMeasure} onChange={(value) => setCreateDraft((current) => ({ ...current, unitOfMeasure: value }))} />
            <FormInput label="Low threshold" type="number" value={createDraft.lowStockAmberThreshold} onChange={(value) => setCreateDraft((current) => ({ ...current, lowStockAmberThreshold: value }))} />
            <FormInput label="Critical threshold" type="number" value={createDraft.lowStockRedThreshold} onChange={(value) => setCreateDraft((current) => ({ ...current, lowStockRedThreshold: value }))} />
          </div>
          <SelectInput
            label="Supplier"
            value={createDraft.preferredSupplierId}
            onChange={(value) => setCreateDraft((current) => ({ ...current, preferredSupplierId: value }))}
            options={[{ value: "", label: "No supplier linked" }, ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))]}
          />
          <SelectInput
            label="Location"
            value={createDraft.locationId}
            onChange={(value) => setCreateDraft((current) => ({ ...current, locationId: value }))}
            options={[{ value: "", label: "No default location" }, ...locations.map((location) => ({ value: location.id, label: location.name }))]}
          />
          {visibleBase ? <FormInput label="Base cost" type="number" value={createDraft.lastUnitCost} onChange={(value) => setCreateDraft((current) => ({ ...current, lastUnitCost: value }))} /> : null}
        </div>
      </SidePanel>

      <SidePanel
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItemId(null)}
        title={selectedItem?.name ?? "Inventory item"}
        description={selectedItem ? `${selectedItem.defaultLocationName || "Unassigned"} • ${selectedItem.unitOfMeasure}` : undefined}
        footer={
          selectedItem ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {permissions.canMoveInventory ? <Button variant="secondary" onClick={() => openMovement(selectedItem, "move_stock")}>Move stock</Button> : null}
              {permissions.canUseInventoryOnJob ? <Button variant="primary" onClick={() => openMovement(selectedItem, "use_on_job")}>Use on job</Button> : null}
            </div>
          ) : null
        }
      >
        {selectedItem ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={getStockTone(selectedItem)}>{getStockLabel(selectedItem)}</Badge>
              <Badge tone="slate">{selectedItem.quantityOnHand} {selectedItem.unitOfMeasure}</Badge>
            </div>
            {selectedItem.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedItem.photoUrl} alt={selectedItem.name} className="w-full rounded-[1.5rem] border border-white/10 object-cover" />
            ) : null}
            <Card className="space-y-4 bg-white/[0.04]">
              <DetailRow label="Manufacturer" value={selectedItem.manufacturer || "Not set"} />
              <DetailRow label="Part number" value={selectedItem.partNumber || "Not set"} />
              <DetailRow label="Model number" value={selectedItem.modelNumber || "Not set"} />
              <DetailRow label="Category" value={selectedItem.category || "Not set"} />
              <DetailRow label="Supplier" value={selectedItem.preferredSupplierName || "Not linked"} />
              <DetailRow label="Last movement" value={formatDateTime(selectedItem.lastMovementAt)} />
              <DetailRow label="Linked jobs" value={String(selectedItem.linkedJobsCount)} />
              {visibleBase ? <DetailRow label="Base cost" value={formatMoney(selectedItem.lastUnitCost)} /> : null}
              {visibleTotal ? <DetailRow label="Stock total" value={formatMoney((selectedItem.lastUnitCost ?? 0) * selectedItem.quantityOnHand)} /> : null}
            </Card>
            {selectedItem.description ? <p className="text-sm leading-6 text-slate-300/78">{selectedItem.description}</p> : null}
          </div>
        ) : null}
      </SidePanel>

      <SidePanel
        open={Boolean(movementItem)}
        onClose={() => setMovementItemId(null)}
        title={movementItem ? `Move ${movementItem.name}` : "Inventory movement"}
        description="Log stock movement, job usage, returns, receiving, or a direct adjustment from one operational drawer."
        footer={
          <div className="flex flex-col gap-3">
            {movementError ? <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">{movementError}</Card> : null}
            <Button variant="primary" onClick={handleMovementSubmit} disabled={submittingMovement}>
              {submittingMovement ? "Saving..." : queueSummary.total > 0 ? "Save movement" : "Save movement"}
            </Button>
            <Button variant="secondary" onClick={() => setMovementItemId(null)}>Cancel</Button>
          </div>
        }
      >
        {movementItem ? (
          <div className="space-y-4">
            <SelectInput
              label="Action"
              value={movementDraft.action}
              onChange={(value) => setMovementDraft((current) => createMovementDraft(movementItem, value as MovementAction))}
              options={[
                { value: "move_stock", label: "Move stock" },
                { value: "use_on_job", label: "Use on job" },
                { value: "return_from_job", label: "Return from job" },
                { value: "receive_stock", label: "Receive stock" },
                { value: "adjust_quantity", label: "Adjust quantity" },
              ]}
            />

            {movementDraft.action === "move_stock" ? (
              <>
                <SelectInput label="From location" value={movementDraft.fromLocationId} onChange={(value) => setMovementDraft((current) => ({ ...current, fromLocationId: value }))} options={locations.map((location) => ({ value: location.id, label: location.name }))} />
                <SelectInput label="To location" value={movementDraft.toLocationId} onChange={(value) => setMovementDraft((current) => ({ ...current, toLocationId: value }))} options={locations.map((location) => ({ value: location.id, label: location.name }))} />
                <FormInput label="Quantity" type="number" value={movementDraft.quantity} onChange={(value) => setMovementDraft((current) => ({ ...current, quantity: value }))} />
              </>
            ) : null}

            {movementDraft.action === "use_on_job" ? (
              <>
                <SearchableJobSelect jobs={jobs} value={movementDraft.jobId} onChange={(value) => setMovementDraft((current) => ({ ...current, jobId: value }))} />
                <FormInput label="Quantity used" type="number" value={movementDraft.quantity} onChange={(value) => setMovementDraft((current) => ({ ...current, quantity: value }))} />
                <SelectInput label="From location" value={movementDraft.fromLocationId} onChange={(value) => setMovementDraft((current) => ({ ...current, fromLocationId: value }))} options={[{ value: "", label: "Default location" }, ...locations.map((location) => ({ value: location.id, label: location.name }))]} />
              </>
            ) : null}

            {movementDraft.action === "return_from_job" ? (
              <>
                <SearchableJobSelect jobs={jobs} value={movementDraft.jobId} onChange={(value) => setMovementDraft((current) => ({ ...current, jobId: value }))} />
                <FormInput label="Quantity returned" type="number" value={movementDraft.quantity} onChange={(value) => setMovementDraft((current) => ({ ...current, quantity: value }))} />
                <SelectInput label="Return location" value={movementDraft.toLocationId} onChange={(value) => setMovementDraft((current) => ({ ...current, toLocationId: value }))} options={locations.map((location) => ({ value: location.id, label: location.name }))} />
              </>
            ) : null}

            {movementDraft.action === "receive_stock" ? (
              <>
                <FormInput label="Quantity received" type="number" value={movementDraft.quantity} onChange={(value) => setMovementDraft((current) => ({ ...current, quantity: value }))} />
                <SelectInput label="Receive into" value={movementDraft.toLocationId} onChange={(value) => setMovementDraft((current) => ({ ...current, toLocationId: value }))} options={[{ value: "", label: "Default location" }, ...locations.map((location) => ({ value: location.id, label: location.name }))]} />
                {visibleBase ? <FormInput label="Supplier cost" type="number" value={movementDraft.supplierCost} onChange={(value) => setMovementDraft((current) => ({ ...current, supplierCost: value }))} /> : null}
              </>
            ) : null}

            {movementDraft.action === "adjust_quantity" ? (
              <>
                <FormInput label="Adjustment amount" type="number" value={movementDraft.quantityDelta} onChange={(value) => setMovementDraft((current) => ({ ...current, quantityDelta: value }))} />
                <p className="text-xs leading-5 text-slate-400">Use a positive number to add stock or a negative number to remove it.</p>
              </>
            ) : null}

            <FormTextarea label="Note" value={movementDraft.notes} onChange={(value) => setMovementDraft((current) => ({ ...current, notes: value }))} />
          </div>
        ) : null}
      </SidePanel>
    </PageShell>
  );
}

function MetricBox({ label, value, helpText }: { label: string; value: string; helpText?: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] px-3 py-3">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      {helpText ? <p className="mt-1 text-xs text-slate-500">{helpText}</p> : null}
    </div>
  );
}

function DataPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-3 py-3">
      <p className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
    </label>
  );
}

function FormTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none">
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function SearchableJobSelect({ jobs, value, onChange }: { jobs: InventoryPageJob[]; value: string; onChange: (value: string) => void }) {
  const [search, setSearch] = useState("");

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return jobs;
    }
    return jobs.filter((job) => `${job.jobNumber} ${job.description ?? ""} ${job.customer} ${job.status}`.toLowerCase().includes(query));
  }, [jobs, search]);

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Job</span>
      <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search job number, description, customer, or status" />
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-3">
        {filteredJobs.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => onChange(job.id)}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${value === job.id ? "border-sky-400/20 bg-sky-500/[0.08]" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{job.jobNumber}</p>
              <Badge tone="slate">{job.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-300">{job.description || "No description"}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{job.customer} • {new Date(job.date).toLocaleDateString()}</p>
          </button>
        ))}
        {filteredJobs.length === 0 ? <p className="px-2 py-3 text-sm text-slate-400">No jobs match this search.</p> : null}
      </div>
    </div>
  );
}

export default ItemCatalogClient;