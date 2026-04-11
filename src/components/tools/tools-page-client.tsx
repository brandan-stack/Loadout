"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  ClipboardCheck,
  ClipboardList,
  Hammer,
  PackageCheck,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  SquarePen,
  UserPlus,
  Wrench,
} from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { SidePanel } from "@/components/panels/SidePanel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import {
  createOfflineMutationPayload,
  getOfflineQueueSummary,
  runMutationWithOfflineSupport,
  subscribeToOfflineQueue,
  type OfflineQueueSummary,
} from "@/lib/offline-queue";
import { canViewFinancialValue, type FinancialVisibilityMode } from "@/lib/financial-visibility";

type ToolsTab = "my-tools" | "company-tools" | "sign-outs";
type ToolScope = "PERSONAL" | "COMPANY";
type ToolTransactionAction = "request" | "assign" | "checkout" | "return" | "accept_return";

interface ToolUser {
  id: string;
  name: string;
}

export interface PersonalTool {
  id: string;
  name: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  category?: string;
  cost?: number;
  condition: string;
  notes?: string;
  photoUrl?: string;
  defaultLocation?: string;
  updatedAt: string;
  owner?: ToolUser;
}

export interface CompanyTool {
  id: string;
  assetTag?: string;
  name: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  category?: string;
  cost?: number;
  replacementValue?: number;
  condition: string;
  currentStatus: string;
  defaultLocation?: string;
  notes?: string;
  photoUrl?: string;
  lastTransactionAt?: string;
  updatedAt: string;
  assignedUser?: ToolUser;
}

export interface ToolSignout {
  id: string;
  status: string;
  transactionType: string;
  requestedAt: string;
  checkedOutAt?: string;
  dueBackAt?: string;
  returnRequestedAt?: string;
  returnedAt?: string;
  acceptedAt?: string;
  notes?: string;
  issueReported?: string;
  syncStatus: string;
  holderUser?: ToolUser;
  requestedByUser?: ToolUser;
  approvedByUser?: ToolUser;
  acceptedByUser?: ToolUser;
  tool: {
    id: string;
    name: string;
    assetTag?: string;
    currentStatus: string;
  };
}

interface ToolDraft {
  scope: ToolScope;
  assetTag: string;
  name: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  category: string;
  cost: string;
  replacementValue: string;
  condition: string;
  defaultLocation: string;
  notes: string;
  photoUrl: string;
  ownerId: string;
  assignedUserId: string;
}

interface TransactionDraft {
  action: ToolTransactionAction;
  holderUserId: string;
  dueBackAt: string;
  notes: string;
  issueReported: string;
}

interface ToolsPageClientProps {
  currentUserId: string;
  financialVisibilityMode: FinancialVisibilityMode;
  workflowConfig: {
    requireReturnAcceptance: boolean;
    allowOfflineCompanyToolFlows: boolean;
  };
  permissions: {
    canViewOwnTools: boolean;
    canAddOwnTools: boolean;
    canEditOwnTools: boolean;
    canViewCompanyTools: boolean;
    canRequestCompanyTools: boolean;
    canCheckoutCompanyTools: boolean;
    canReturnCompanyTools: boolean;
    canAcceptToolReturns: boolean;
    canManageCompanyTools: boolean;
  };
  initialPersonalTools: PersonalTool[];
  initialCompanyTools: CompanyTool[];
  initialSignouts: ToolSignout[];
  initialUsers: ToolUser[];
}

const EMPTY_TOOL_DRAFT: ToolDraft = {
  scope: "PERSONAL",
  assetTag: "",
  name: "",
  manufacturer: "",
  modelNumber: "",
  serialNumber: "",
  category: "",
  cost: "",
  replacementValue: "",
  condition: "Good",
  defaultLocation: "",
  notes: "",
  photoUrl: "",
  ownerId: "",
  assignedUserId: "",
};

const EMPTY_TRANSACTION_DRAFT: TransactionDraft = {
  action: "request",
  holderUserId: "",
  dueBackAt: "",
  notes: "",
  issueReported: "",
};

function parseMoney(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatMoney(value?: number) {
  if (value === undefined) {
    return "Hidden";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusTone(status: string): "blue" | "green" | "orange" | "red" | "slate" {
  const normalized = status.toLowerCase();

  if (normalized.includes("damaged") || normalized.includes("lost")) {
    return "red";
  }
  if (normalized.includes("overdue") || normalized.includes("pending") || normalized.includes("requested") || normalized.includes("service")) {
    return "orange";
  }
  if (normalized.includes("available") || normalized.includes("returned") || normalized.includes("accepted")) {
    return "green";
  }
  if (normalized.includes("assigned") || normalized.includes("checked")) {
    return "blue";
  }

  return "slate";
}

function createQueuedTransactionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildSearchText(values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function createToolDraft(scope: ToolScope, tool?: PersonalTool | CompanyTool): ToolDraft {
  if (!tool) {
    return {
      ...EMPTY_TOOL_DRAFT,
      scope,
    };
  }

  const companyTool = scope === "COMPANY" ? (tool as CompanyTool) : undefined;
  const personalTool = scope === "PERSONAL" ? (tool as PersonalTool) : undefined;

  return {
    scope,
    assetTag: companyTool?.assetTag ?? "",
    name: tool.name,
    manufacturer: tool.manufacturer ?? "",
    modelNumber: tool.modelNumber ?? "",
    serialNumber: tool.serialNumber ?? "",
    category: tool.category ?? "",
    cost: tool.cost?.toString() ?? "",
    replacementValue: companyTool?.replacementValue?.toString() ?? "",
    condition: tool.condition,
    defaultLocation: (companyTool?.defaultLocation ?? personalTool?.defaultLocation) ?? "",
    notes: tool.notes ?? "",
    photoUrl: tool.photoUrl ?? "",
    ownerId: personalTool?.owner?.id ?? "",
    assignedUserId: companyTool?.assignedUser?.id ?? "",
  };
}

function createOptimisticSignout(
  tool: CompanyTool,
  action: ToolTransactionAction,
  currentUserId: string,
  users: ToolUser[],
  draft: TransactionDraft,
  requireReturnAcceptance: boolean
): ToolSignout {
  const requestedAt = new Date().toISOString();
  const holderUser = users.find((user) => user.id === (draft.holderUserId || currentUserId));
  const requestedByUser = users.find((user) => user.id === currentUserId);

  return {
    id: `queued-${createQueuedTransactionId()}`,
    status:
      action === "request"
        ? "Requested"
        : action === "assign"
          ? "Assigned"
          : action === "checkout"
            ? "Checked Out"
            : action === "return"
              ? requireReturnAcceptance
                ? "Return Pending"
                : "Returned"
              : "Returned",
    transactionType: action,
    requestedAt,
    checkedOutAt: action === "checkout" ? requestedAt : undefined,
    dueBackAt: draft.dueBackAt || undefined,
    returnRequestedAt: action === "return" ? requestedAt : undefined,
    returnedAt: action === "return" ? requestedAt : undefined,
    acceptedAt: action === "accept_return" ? requestedAt : undefined,
    notes: normalizeOptionalText(draft.notes),
    issueReported: normalizeOptionalText(draft.issueReported),
    syncStatus: "queued_sync",
    holderUser,
    requestedByUser,
    tool: {
      id: tool.id,
      name: tool.name,
      assetTag: tool.assetTag,
      currentStatus:
        action === "request"
          ? "Requested"
          : action === "assign"
            ? "Assigned"
            : action === "checkout"
              ? "Checked Out"
              : action === "return"
                ? requireReturnAcceptance
                  ? "Return Pending"
                  : "Available"
                : "Available",
    },
  };
}

export function ToolsPageClient({
  currentUserId,
  financialVisibilityMode,
  workflowConfig,
  permissions,
  initialPersonalTools,
  initialCompanyTools,
  initialSignouts,
  initialUsers,
}: ToolsPageClientProps) {
  const [personalTools, setPersonalTools] = useState(initialPersonalTools);
  const [companyTools, setCompanyTools] = useState(initialCompanyTools);
  const [signouts, setSignouts] = useState(initialSignouts);
  const [users, setUsers] = useState(initialUsers);
  const [activeTab, setActiveTab] = useState<ToolsTab>(permissions.canViewOwnTools ? "my-tools" : permissions.canViewCompanyTools ? "company-tools" : "sign-outs");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [savingTool, setSavingTool] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [deletingToolId, setDeletingToolId] = useState<string | null>(null);
  const [toolPanelState, setToolPanelState] = useState<{ open: boolean; scope: ToolScope; toolId?: string }>({ open: false, scope: "PERSONAL" });
  const [toolDraft, setToolDraft] = useState<ToolDraft>(createToolDraft("PERSONAL"));
  const [transactionPanelState, setTransactionPanelState] = useState<{ open: boolean; toolId?: string; action: ToolTransactionAction }>({ open: false, action: "request" });
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>(EMPTY_TRANSACTION_DRAFT);
  const [queueSummary, setQueueSummary] = useState<OfflineQueueSummary>(getOfflineQueueSummary());

  useEffect(() => subscribeToOfflineQueue(() => setQueueSummary(getOfflineQueueSummary())), []);

  const canSeeBaseCost = canViewFinancialValue(financialVisibilityMode, "base") || canViewFinancialValue(financialVisibilityMode, "supplier");
  const canSeeReplacementValue = canViewFinancialValue(financialVisibilityMode, "total") || canSeeBaseCost;

  const filteredPersonalTools = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return personalTools;
    }

    return personalTools.filter((tool) =>
      buildSearchText([
        tool.name,
        tool.manufacturer,
        tool.modelNumber,
        tool.serialNumber,
        tool.category,
        tool.defaultLocation,
        tool.owner?.name,
      ]).includes(query)
    );
  }, [personalTools, search]);

  const filteredCompanyTools = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return companyTools;
    }

    return companyTools.filter((tool) =>
      buildSearchText([
        tool.assetTag,
        tool.name,
        tool.manufacturer,
        tool.modelNumber,
        tool.serialNumber,
        tool.category,
        tool.currentStatus,
        tool.assignedUser?.name,
        tool.defaultLocation,
      ]).includes(query)
    );
  }, [companyTools, search]);

  const filteredSignouts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return signouts;
    }

    return signouts.filter((entry) =>
      buildSearchText([
        entry.tool.assetTag,
        entry.tool.name,
        entry.status,
        entry.transactionType,
        entry.holderUser?.name,
        entry.requestedByUser?.name,
        entry.notes,
        entry.issueReported,
      ]).includes(query)
    );
  }, [signouts, search]);

  const activeCheckouts = signouts.filter((entry) => ["Checked Out", "Assigned", "Overdue"].includes(entry.status)).length;
  const pendingReturns = signouts.filter((entry) => entry.status === "Return Pending").length;

  async function refreshWorkspace() {
    const response = await fetch("/api/tools", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to refresh tools workspace.");
    }

    const payload = await response.json();
    setPersonalTools(payload.personalTools ?? []);
    setCompanyTools(payload.companyTools ?? []);
    setSignouts(payload.signouts ?? []);
    setUsers(payload.users ?? []);
  }

  function openToolPanel(scope: ToolScope, tool?: PersonalTool | CompanyTool) {
    setError("");
    setToolPanelState({ open: true, scope, toolId: tool?.id });
    setToolDraft(createToolDraft(scope, tool));
  }

  function openTransactionPanel(action: ToolTransactionAction, tool: CompanyTool) {
    setError("");
    setTransactionPanelState({ open: true, toolId: tool.id, action });
    setTransactionDraft({
      ...EMPTY_TRANSACTION_DRAFT,
      action,
      holderUserId: action === "request" ? currentUserId : tool.assignedUser?.id ?? "",
    });
  }

  function updateQueuedCompanyTool(toolId: string, action: ToolTransactionAction, draft: TransactionDraft) {
    setCompanyTools((current) =>
      current.map((tool) => {
        if (tool.id !== toolId) {
          return tool;
        }

        const assignedUser = users.find((user) => user.id === (draft.holderUserId || currentUserId));
        return {
          ...tool,
          currentStatus:
            action === "request"
              ? "Requested"
              : action === "assign"
                ? "Assigned"
                : action === "checkout"
                  ? "Checked Out"
                  : action === "return"
                    ? workflowConfig.requireReturnAcceptance
                      ? "Return Pending"
                      : "Available"
                    : "Available",
          assignedUser:
            action === "return" || action === "accept_return"
              ? undefined
              : assignedUser ?? tool.assignedUser,
          lastTransactionAt: new Date().toISOString(),
        };
      })
    );
  }

  async function handleSaveTool() {
    if (!toolDraft.name.trim()) {
      setError("Tool name is required.");
      return;
    }
    if (toolDraft.scope === "PERSONAL" && !permissions.canAddOwnTools && !toolPanelState.toolId) {
      setError("You do not have permission to add personal tools.");
      return;
    }
    if (toolDraft.scope === "COMPANY" && !permissions.canManageCompanyTools) {
      setError("You do not have permission to manage company tools.");
      return;
    }

    setSavingTool(true);
    setError("");

    const payload = {
      scope: toolDraft.scope,
      assetTag: normalizeOptionalText(toolDraft.assetTag),
      name: toolDraft.name.trim(),
      manufacturer: normalizeOptionalText(toolDraft.manufacturer),
      modelNumber: normalizeOptionalText(toolDraft.modelNumber),
      serialNumber: normalizeOptionalText(toolDraft.serialNumber),
      category: normalizeOptionalText(toolDraft.category),
      cost: parseMoney(toolDraft.cost),
      replacementValue: parseMoney(toolDraft.replacementValue),
      condition: normalizeOptionalText(toolDraft.condition),
      defaultLocation: normalizeOptionalText(toolDraft.defaultLocation),
      notes: normalizeOptionalText(toolDraft.notes),
      photoUrl: normalizeOptionalText(toolDraft.photoUrl),
      ownerId: normalizeOptionalText(toolDraft.ownerId),
      assignedUserId: normalizeOptionalText(toolDraft.assignedUserId),
    };

    try {
      const response = await fetch(toolPanelState.toolId ? `/api/tools/${toolPanelState.toolId}` : "/api/tools", {
        method: toolPanelState.toolId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to save tool.");
      }

      await refreshWorkspace();
      setToolPanelState({ open: false, scope: toolDraft.scope });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Failed to save tool.");
    } finally {
      setSavingTool(false);
    }
  }

  async function handleDeleteTool(toolId: string) {
    if (!confirm("Archive this tool?")) {
      return;
    }

    setDeletingToolId(toolId);
    setError("");

    try {
      const response = await fetch(`/api/tools/${toolId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to archive tool.");
      }

      await refreshWorkspace();
      if (toolPanelState.toolId === toolId) {
        setToolPanelState({ open: false, scope: toolPanelState.scope });
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Failed to archive tool.");
    } finally {
      setDeletingToolId(null);
    }
  }

  async function handleSubmitTransaction() {
    const companyTool = companyTools.find((tool) => tool.id === transactionPanelState.toolId);
    if (!companyTool) {
      return;
    }
    if (!workflowConfig.allowOfflineCompanyToolFlows && typeof navigator !== "undefined" && !navigator.onLine) {
      setError("Offline company tool flows are currently disabled in settings.");
      return;
    }
    if (transactionDraft.action === "assign" && !transactionDraft.holderUserId) {
      setError("Choose a user before assigning this tool.");
      return;
    }
    if (transactionDraft.action === "checkout" && !transactionDraft.holderUserId && !companyTool.assignedUser?.id) {
      setError("Choose who is checking this tool out.");
      return;
    }

    setSavingTransaction(true);
    setError("");

    const payload = createOfflineMutationPayload({
      action: transactionDraft.action,
      holderUserId: normalizeOptionalText(transactionDraft.holderUserId),
      dueBackAt: normalizeOptionalText(transactionDraft.dueBackAt),
      notes: normalizeOptionalText(transactionDraft.notes),
      issueReported: normalizeOptionalText(transactionDraft.issueReported),
    });

    try {
      const result = await runMutationWithOfflineSupport({
        url: `/api/tools/${companyTool.id}/transactions`,
        method: "POST",
        scope: "tools",
        body: payload,
      });

      if (result.queued) {
        updateQueuedCompanyTool(companyTool.id, transactionDraft.action, transactionDraft);
        setSignouts((current) => [
          createOptimisticSignout(
            companyTool,
            transactionDraft.action,
            currentUserId,
            users,
            transactionDraft,
            workflowConfig.requireReturnAcceptance
          ),
          ...current,
        ]);
      } else {
        const response = result.response;
        if (!response) {
          throw new Error("Tool transaction response was missing.");
        }

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "Failed to save tool transaction.");
        }

        await refreshWorkspace();
      }

      setTransactionPanelState({ open: false, action: transactionDraft.action });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Failed to save tool transaction.");
    } finally {
      setSavingTransaction(false);
    }
  }

  const selectedCompanyTool = companyTools.find((tool) => tool.id === transactionPanelState.toolId);

  return (
    <PageShell className="form-screen">
      <PageHeader
        eyebrow={<Badge tone="blue">Tools Workspace</Badge>}
        title="Track private tools and shared assets separately"
        description="Personal tools stay owner-scoped. Company tools move through request, assignment, checkout, return, and acceptance without losing transaction history or offline accountability."
        actions={
          <>
            {permissions.canAddOwnTools ? (
              <Button variant="secondary" onClick={() => openToolPanel("PERSONAL")}>
                <UserPlus className="h-4 w-4" />
                Add my tool
              </Button>
            ) : null}
            {permissions.canManageCompanyTools ? (
              <Button variant="primary" onClick={() => openToolPanel("COMPANY")}>
                <Hammer className="h-4 w-4" />
                Add company tool
              </Button>
            ) : null}
          </>
        }
      />

      {error ? (
        <PageSection>
          <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">{error}</Card>
        </PageSection>
      ) : null}

      <PageSection className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="My Tools" value={String(personalTools.length)} hint="Owner-scoped equipment" tone="blue" icon={Wrench} />
        <StatCard label="Company Tools" value={String(companyTools.length)} hint="Shared accountable assets" tone="teal" icon={Hammer} />
        <StatCard label="Active Sign-outs" value={String(activeCheckouts)} hint="Assigned or checked out" tone={activeCheckouts > 0 ? "orange" : "green"} icon={ClipboardList} />
        <StatCard label="Pending Returns" value={String(pendingReturns)} hint="Waiting for acceptance" tone={pendingReturns > 0 ? "orange" : "green"} icon={PackageCheck} />
        <StatCard label="Queued Ops" value={String(queueSummary.total)} hint="Offline tool actions waiting" tone={queueSummary.total > 0 ? "orange" : "green"} icon={RotateCcw} />
      </PageSection>

      <PageSection>
        <Card className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Tool operations</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/78">Users only see the sections their permissions allow. Shared-tool requests and returns can queue offline and surface sync conflicts instead of silently overwriting status.</p>
            </div>
            <Badge tone="slate">{queueSummary.conflict > 0 ? `${queueSummary.conflict} conflicts need review` : "Sync state healthy"}</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tool name, asset tag, user, condition, or status" />
            <div className="grid gap-2 sm:grid-cols-3">
              {permissions.canViewOwnTools ? (
                <TabButton label="My Tools" active={activeTab === "my-tools"} onClick={() => setActiveTab("my-tools")} />
              ) : null}
              {permissions.canViewCompanyTools || permissions.canManageCompanyTools ? (
                <TabButton label="Company Tools" active={activeTab === "company-tools"} onClick={() => setActiveTab("company-tools")} />
              ) : null}
              {(permissions.canRequestCompanyTools || permissions.canCheckoutCompanyTools || permissions.canReturnCompanyTools || permissions.canAcceptToolReturns || permissions.canManageCompanyTools) ? (
                <TabButton label="Sign-outs" active={activeTab === "sign-outs"} onClick={() => setActiveTab("sign-outs")} />
              ) : null}
            </div>
          </div>
        </Card>
      </PageSection>

      {activeTab === "my-tools" ? (
        <PageSection className="space-y-4">
          {filteredPersonalTools.map((tool) => {
            const canEditTool = permissions.canManageCompanyTools || (permissions.canEditOwnTools && (tool.owner?.id === currentUserId || !tool.owner));
            return (
              <Card key={tool.id} className="rounded-[1.8rem] border-white/8 bg-[linear-gradient(180deg,rgba(11,19,34,0.94),rgba(10,15,27,0.82))] p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <ToolThumb name={tool.name} photoUrl={tool.photoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">{tool.name}</h3>
                        <Badge tone="slate">{tool.condition}</Badge>
                        {tool.category ? <Badge tone="blue">{tool.category}</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{[tool.manufacturer, tool.modelNumber ? `Model ${tool.modelNumber}` : null, tool.serialNumber ? `S/N ${tool.serialNumber}` : null].filter(Boolean).join(" • ") || "No brand or model details yet"}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoPill label="Owner" value={tool.owner?.name || "Private owner"} />
                        <InfoPill label="Location" value={tool.defaultLocation || "No location set"} />
                        <InfoPill label="Updated" value={formatDateTime(tool.updatedAt)} />
                        {canSeeBaseCost ? <InfoPill label="Purchase cost" value={formatMoney(tool.cost)} /> : null}
                      </div>
                      {tool.notes ? <p className="mt-4 text-sm leading-6 text-slate-400">{tool.notes}</p> : null}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:w-[13rem]">
                    {canEditTool ? <Button variant="secondary" onClick={() => openToolPanel("PERSONAL", tool)}><SquarePen className="h-4 w-4" />Edit</Button> : null}
                    {canEditTool ? <Button variant="danger" onClick={() => handleDeleteTool(tool.id)} disabled={deletingToolId === tool.id}>{deletingToolId === tool.id ? "Archiving..." : "Archive"}</Button> : null}
                  </div>
                </div>
              </Card>
            );
          })}
          {filteredPersonalTools.length === 0 ? <EmptyState title="No personal tools in view" description="Add a private tool or broaden the search to see more personal equipment." /> : null}
        </PageSection>
      ) : null}

      {activeTab === "company-tools" ? (
        <PageSection className="space-y-4">
          {filteredCompanyTools.map((tool) => {
            const canRequest = permissions.canRequestCompanyTools && ["Available", "Returned"].includes(tool.currentStatus);
            const canAssign = permissions.canManageCompanyTools && tool.currentStatus !== "Return Pending";
            const canCheckout = (permissions.canCheckoutCompanyTools || permissions.canManageCompanyTools) && !["Checked Out", "Return Pending"].includes(tool.currentStatus);
            const canReturn = permissions.canReturnCompanyTools && ["Assigned", "Checked Out", "Overdue"].includes(tool.currentStatus);
            return (
              <Card key={tool.id} className="rounded-[1.8rem] border-white/8 bg-[linear-gradient(180deg,rgba(11,19,34,0.94),rgba(10,15,27,0.82))] p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <ToolThumb name={tool.name} photoUrl={tool.photoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">{tool.name}</h3>
                        <Badge tone={getStatusTone(tool.currentStatus)}>{tool.currentStatus}</Badge>
                        {tool.assetTag ? <Badge tone="slate">{tool.assetTag}</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{[tool.manufacturer, tool.modelNumber ? `Model ${tool.modelNumber}` : null, tool.serialNumber ? `S/N ${tool.serialNumber}` : null].filter(Boolean).join(" • ") || "No brand or serial metadata yet"}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoPill label="Assigned user" value={tool.assignedUser?.name || "Unassigned"} />
                        <InfoPill label="Default location" value={tool.defaultLocation || "No location set"} />
                        <InfoPill label="Condition" value={tool.condition} />
                        <InfoPill label="Last movement" value={formatDateTime(tool.lastTransactionAt || tool.updatedAt)} />
                      </div>
                      {(canSeeBaseCost || canSeeReplacementValue) ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:max-w-[28rem]">
                          {canSeeBaseCost ? <InfoPill label="Company cost" value={formatMoney(tool.cost)} /> : null}
                          {canSeeReplacementValue ? <InfoPill label="Replacement value" value={formatMoney(tool.replacementValue)} /> : null}
                        </div>
                      ) : null}
                      {tool.notes ? <p className="mt-4 text-sm leading-6 text-slate-400">{tool.notes}</p> : null}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:w-[15rem]">
                    {permissions.canManageCompanyTools ? <Button variant="secondary" onClick={() => openToolPanel("COMPANY", tool)}><SquarePen className="h-4 w-4" />Edit</Button> : null}
                    {canRequest ? <Button variant="secondary" onClick={() => openTransactionPanel("request", tool)}><SearchCheck className="h-4 w-4" />Request</Button> : null}
                    {canAssign ? <Button variant="secondary" onClick={() => openTransactionPanel("assign", tool)}><UserPlus className="h-4 w-4" />Assign</Button> : null}
                    {canCheckout ? <Button variant="primary" onClick={() => openTransactionPanel("checkout", tool)}><ClipboardList className="h-4 w-4" />Checkout</Button> : null}
                    {canReturn ? <Button variant="secondary" onClick={() => openTransactionPanel("return", tool)}><RotateCcw className="h-4 w-4" />Return</Button> : null}
                    {permissions.canManageCompanyTools ? <Button variant="danger" onClick={() => handleDeleteTool(tool.id)} disabled={deletingToolId === tool.id}>{deletingToolId === tool.id ? "Archiving..." : "Archive"}</Button> : null}
                  </div>
                </div>
              </Card>
            );
          })}
          {filteredCompanyTools.length === 0 ? <EmptyState title="No company tools in view" description="There are no shared assets matching this search or this user cannot view the company tools workspace." /> : null}
        </PageSection>
      ) : null}

      {activeTab === "sign-outs" ? (
        <PageSection className="space-y-4">
          {filteredSignouts.map((entry) => {
            const tool = companyTools.find((companyTool) => companyTool.id === entry.tool.id);
            const canAcceptReturn = permissions.canAcceptToolReturns && entry.status === "Return Pending" && tool;
            return (
              <Card key={entry.id} className="space-y-4 rounded-[1.8rem] border-white/8 bg-[linear-gradient(180deg,rgba(11,19,34,0.94),rgba(10,15,27,0.82))] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">{entry.tool.name}</h3>
                      {entry.tool.assetTag ? <Badge tone="slate">{entry.tool.assetTag}</Badge> : null}
                      <Badge tone={getStatusTone(entry.status)}>{entry.status}</Badge>
                      <Badge tone="blue">{entry.transactionType}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">Holder: {entry.holderUser?.name || "Unassigned"} • Requested by {entry.requestedByUser?.name || "Unknown"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={entry.syncStatus === "queued_sync" ? "orange" : entry.syncStatus === "synced" ? "green" : "slate"}>{formatLabel(entry.syncStatus)}</Badge>
                    {canAcceptReturn && tool ? <Button variant="primary" onClick={() => openTransactionPanel("accept_return", tool)}><ClipboardCheck className="h-4 w-4" />Accept return</Button> : null}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoPill label="Requested" value={formatDateTime(entry.requestedAt)} />
                  <InfoPill label="Checked out" value={formatDateTime(entry.checkedOutAt)} />
                  <InfoPill label="Due back" value={formatDateTime(entry.dueBackAt)} />
                  <InfoPill label="Returned" value={formatDateTime(entry.returnedAt || entry.acceptedAt)} />
                </div>
                {(entry.notes || entry.issueReported) ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {entry.notes ? <InfoPill label="Notes" value={entry.notes} multiline /> : null}
                    {entry.issueReported ? <InfoPill label="Issue reported" value={entry.issueReported} multiline /> : null}
                  </div>
                ) : null}
              </Card>
            );
          })}
          {filteredSignouts.length === 0 ? <EmptyState title="No sign-out activity yet" description="Requests, active checkouts, pending returns, and accepted returns will appear here." /> : null}
        </PageSection>
      ) : null}

      <SidePanel
        open={toolPanelState.open}
        onClose={() => setToolPanelState({ open: false, scope: toolPanelState.scope })}
        title={toolPanelState.toolId ? `Edit ${toolDraft.scope === "COMPANY" ? "company" : "personal"} tool` : `Add ${toolDraft.scope === "COMPANY" ? "company" : "personal"} tool`}
        description={toolDraft.scope === "COMPANY" ? "Company tools stay in the shared asset workflow and can be assigned, checked out, returned, and accepted." : "Personal tools are isolated by owner and never blend into the shared company asset pool."}
        footer={
          <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={handleSaveTool} disabled={savingTool}>{savingTool ? "Saving..." : toolPanelState.toolId ? "Save changes" : "Create tool"}</Button>
            <Button variant="secondary" onClick={() => setToolPanelState({ open: false, scope: toolPanelState.scope })}>Cancel</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <SelectField
            label="Tool scope"
            value={toolDraft.scope}
            onChange={(value) => {
              const nextScope = value as ToolScope;
              setToolDraft((current) => ({ ...current, scope: nextScope, ownerId: nextScope === "PERSONAL" ? current.ownerId : "", assignedUserId: nextScope === "COMPANY" ? current.assignedUserId : "" }));
            }}
            disabled={Boolean(toolPanelState.toolId)}
            options={[
              { value: "PERSONAL", label: "Personal" },
              { value: "COMPANY", label: "Company" },
            ]}
          />
          <TextField label="Tool name" value={toolDraft.name} onChange={(value) => setToolDraft((current) => ({ ...current, name: value }))} />
          {toolDraft.scope === "COMPANY" ? <TextField label="Asset tag" value={toolDraft.assetTag} onChange={(value) => setToolDraft((current) => ({ ...current, assetTag: value }))} /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Brand" value={toolDraft.manufacturer} onChange={(value) => setToolDraft((current) => ({ ...current, manufacturer: value }))} />
            <TextField label="Model" value={toolDraft.modelNumber} onChange={(value) => setToolDraft((current) => ({ ...current, modelNumber: value }))} />
            <TextField label="Serial number" value={toolDraft.serialNumber} onChange={(value) => setToolDraft((current) => ({ ...current, serialNumber: value }))} />
            <TextField label="Category" value={toolDraft.category} onChange={(value) => setToolDraft((current) => ({ ...current, category: value }))} />
            <TextField label="Condition" value={toolDraft.condition} onChange={(value) => setToolDraft((current) => ({ ...current, condition: value }))} />
            <TextField label="Location" value={toolDraft.defaultLocation} onChange={(value) => setToolDraft((current) => ({ ...current, defaultLocation: value }))} />
            {canSeeBaseCost ? <TextField label={toolDraft.scope === "COMPANY" ? "Company cost" : "Purchase cost"} type="number" value={toolDraft.cost} onChange={(value) => setToolDraft((current) => ({ ...current, cost: value }))} /> : null}
            {toolDraft.scope === "COMPANY" && canSeeReplacementValue ? <TextField label="Replacement value" type="number" value={toolDraft.replacementValue} onChange={(value) => setToolDraft((current) => ({ ...current, replacementValue: value }))} /> : null}
          </div>
          {toolDraft.scope === "PERSONAL" && permissions.canManageCompanyTools ? (
            <SelectField label="Owner" value={toolDraft.ownerId} onChange={(value) => setToolDraft((current) => ({ ...current, ownerId: value }))} options={[{ value: "", label: "Current user" }, ...users.map((user) => ({ value: user.id, label: user.name }))]} />
          ) : null}
          {toolDraft.scope === "COMPANY" ? (
            <SelectField label="Assigned user" value={toolDraft.assignedUserId} onChange={(value) => setToolDraft((current) => ({ ...current, assignedUserId: value }))} options={[{ value: "", label: "Unassigned" }, ...users.map((user) => ({ value: user.id, label: user.name }))]} />
          ) : null}
          <TextField label="Photo URL" value={toolDraft.photoUrl} onChange={(value) => setToolDraft((current) => ({ ...current, photoUrl: value }))} />
          <TextareaField label="Notes" value={toolDraft.notes} onChange={(value) => setToolDraft((current) => ({ ...current, notes: value }))} />
        </div>
      </SidePanel>

      <SidePanel
        open={transactionPanelState.open}
        onClose={() => setTransactionPanelState({ open: false, action: transactionPanelState.action })}
        title={selectedCompanyTool ? `${formatLabel(transactionDraft.action)} • ${selectedCompanyTool.name}` : "Tool action"}
        description="Shared tool actions preserve the full transaction trail and can queue offline when the field device loses connectivity."
        footer={
          <div className="flex flex-col gap-3">
            {!workflowConfig.allowOfflineCompanyToolFlows ? <Card className="border-amber-400/20 bg-amber-500/[0.08] text-amber-100">Offline company-tool actions are disabled in settings. When offline, this action will be blocked instead of queued.</Card> : null}
            <Button variant="primary" onClick={handleSubmitTransaction} disabled={savingTransaction}>{savingTransaction ? "Saving..." : "Submit action"}</Button>
            <Button variant="secondary" onClick={() => setTransactionPanelState({ open: false, action: transactionPanelState.action })}>Cancel</Button>
          </div>
        }
      >
        {selectedCompanyTool ? (
          <div className="space-y-4">
            <Card className="space-y-3 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-white">{selectedCompanyTool.name}</p>
                {selectedCompanyTool.assetTag ? <Badge tone="slate">{selectedCompanyTool.assetTag}</Badge> : null}
                <Badge tone={getStatusTone(selectedCompanyTool.currentStatus)}>{selectedCompanyTool.currentStatus}</Badge>
              </div>
              <p className="text-sm text-slate-300">Assigned to {selectedCompanyTool.assignedUser?.name || "no one"} • {selectedCompanyTool.defaultLocation || "no default location"}</p>
            </Card>

            {(transactionDraft.action === "assign" || transactionDraft.action === "checkout") ? (
              <SelectField label="User" value={transactionDraft.holderUserId} onChange={(value) => setTransactionDraft((current) => ({ ...current, holderUserId: value }))} options={users.map((user) => ({ value: user.id, label: user.name }))} />
            ) : null}
            {(transactionDraft.action === "assign" || transactionDraft.action === "checkout") ? <TextField label="Due back" type="datetime-local" value={transactionDraft.dueBackAt} onChange={(value) => setTransactionDraft((current) => ({ ...current, dueBackAt: value }))} /> : null}
            <TextareaField label="Notes" value={transactionDraft.notes} onChange={(value) => setTransactionDraft((current) => ({ ...current, notes: value }))} />
            {transactionDraft.action === "return" ? <TextareaField label="Issue report" value={transactionDraft.issueReported} onChange={(value) => setTransactionDraft((current) => ({ ...current, issueReported: value }))} /> : null}
            {transactionDraft.action === "return" && workflowConfig.requireReturnAcceptance ? <Card className="border-sky-400/20 bg-sky-500/[0.08] text-sky-100">This workspace requires an authorized user to accept returns before the tool becomes available again.</Card> : null}
          </div>
        ) : null}
      </SidePanel>
    </PageShell>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${active ? "border-sky-400/20 bg-sky-500/[0.08] text-sky-100" : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"}`}
    >
      {label}
    </button>
  );
}

function ToolThumb({ name, photoUrl }: { name: string; photoUrl?: string }) {
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.04]">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-500">
          <Hammer className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

function InfoPill({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-3 py-3">
      <p className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-medium text-slate-100 ${multiline ? "whitespace-pre-wrap leading-6" : ""}`}>{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-white/8 bg-white/[0.03] p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-slate-400">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </Card>
  );
}

function TextField({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-60" />
    </label>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
    </label>
  );
}

function SelectField({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-60">
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

