import { useMemo, useState } from "react";
import { useItems, type InventoryItem } from "../hooks/useItems";
import { useCategories } from "../hooks/useCategories";
import { useLocations } from "../hooks/useLocations";
import { loadActivity, type ActivityEvent } from "../lib/activityStore";
import {
  loadNotificationRecipients,
  buildJobCompleteMailto,
} from "../lib/notificationStore";

import {
  createJob,
  closeJob,
  reopenJob,
  exportJobCSV,
  loadJobs,
  loadJobUsage,
  logJobUsage,
  type Job,
  type JobUsageLine,
} from "../lib/jobsStore";

const SELECTED_JOB_KEY = "loadout.selectedJobId";

function totalQty(item: InventoryItem) {
  return (item.stockByLocation ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0);
}
function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dashboardCard">
      <div className="dashboardCardTitle">{title}</div>
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="dashboardBadge">
      {children}
    </span>
  );
}

function downloadTextFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function activityLabel(ev: ActivityEvent) {
  switch (ev.type) {
    case "ADD_ITEM": return "Added item";
    case "EDIT_ITEM": return "Edited item";
    case "DELETE_ITEM": return "Deleted item";
    case "RECEIVE": return "Received";
    case "TAKE_OUT": return "Took out";
    case "MOVE": return "Moved";
    case "CATEGORY_CHANGE": return "Category";
    case "PHOTO_CHANGE": return "Photo";
    default: return ev.type;
  }
}

export default function DashboardScreen() {
  const itemsApi = useItems();
  const cats = useCategories();
  const locHook = useLocations() as any;
  const roots: Array<{ id: string; name: string }> = (locHook?.roots ?? locHook?.locations ?? locHook?.all ?? []) as any;

  const [refresh, setRefresh] = useState(0);

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>(() => loadJobs());
  const [usage, setUsage] = useState<JobUsageLine[]>(() => loadJobUsage());

  // Simplified: just job name/number to start a job
  const [jobName, setJobName] = useState("");

  // Persist selected job across reloads so parts can keep being added
  const [selectedJobId, setSelectedJobIdState] = useState<string>(() => {
    const saved = localStorage.getItem(SELECTED_JOB_KEY) ?? "";
    const allJobs = loadJobs();
    // Restore saved selection only if that job still exists and is open
    if (saved && allJobs.some((j) => j.id === saved && j.status === "open")) return saved;
    return allJobs.find((j) => j.status === "open")?.id ?? allJobs[0]?.id ?? "";
  });

  function setSelectedJobId(id: string) {
    setSelectedJobIdState(id);
    localStorage.setItem(SELECTED_JOB_KEY, id);
  }

  // Notification sent status (per job-complete action, cleared on next action)
  const [completionMsg, setCompletionMsg] = useState<string | null>(null);

  // Use parts UI
  const [useSearch, setUseSearch] = useState("");
  const [useQty, setUseQty] = useState("1");
  const [useLoc, setUseLoc] = useState<string>("");
  const [useNote, setUseNote] = useState("");

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  // Parts used on the currently selected job
  const jobUsageLines = useMemo(
    () => usage.filter((u) => u.jobId === selectedJobId).sort((a, b) => b.ts - a.ts),
    [usage, selectedJobId]
  );

  const activity = useMemo(() => loadActivity().slice().sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)), [refresh]);

  function categoryLabel(it: InventoryItem) {
    const catName = cats.getCategoryName(it.categoryId);
    const subName = it.subcategoryId ? cats.getSubName(it.categoryId, it.subcategoryId) : "";
    return subName ? `${catName} › ${subName}` : catName;
  }

  const stats = useMemo(() => {
    const items = itemsApi.items;
    const totalStock = items.reduce((s, it) => s + totalQty(it), 0);
    const lowStock = items.filter((it) => typeof it.lowStock === "number" && it.lowStock! > 0 && totalQty(it) <= it.lowStock!).length;
    return {
      items: items.length,
      totalStock,
      lowStock,
      jobsOpen: jobs.filter((j) => j.status === "open").length,
    };
  }, [itemsApi.items, jobs]);

  const restock = useMemo(() => {
    return itemsApi.items
      .filter((it) => typeof it.lowStock === "number" && it.lowStock! > 0 && totalQty(it) <= it.lowStock!)
      .map((it) => {
        const t = totalQty(it);
        const low = it.lowStock!;
        return { it, t, low, need: Math.max(0, low - t), ratio: low > 0 ? t / low : 1 };
      })
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 10);
  }, [itemsApi.items]);

  const filteredItems = useMemo(() => {
    const q = useSearch.trim().toLowerCase();
    if (!q) return itemsApi.items.slice(0, 20);
    return itemsApi.items
      .filter((it) => {
        const hay = [
          it.name,
          it.partNumber,
          `part number ${it.partNumber ?? ""}`,
          `pn ${it.partNumber ?? ""}`,
          it.manufacturer,
          `manufacturer ${it.manufacturer ?? ""}`,
          `brand ${it.manufacturer ?? ""}`,
          it.model,
          `model number ${it.model ?? ""}`,
          it.serial,
          `serial number ${it.serial ?? ""}`,
          `sn ${it.serial ?? ""}`,
          it.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [itemsApi.items, useSearch]);

  function startNewJob() {
    const name = jobName.trim();
    if (!name) return;
    const job = createJob({ name });
    setJobs(loadJobs());
    setSelectedJobId(job.id);
    setJobName("");
    setCompletionMsg(null);
  }

  function completeJob(job: Job) {
    closeJob(job.id);
    setJobs(loadJobs());
    setCompletionMsg(null);

    // Build parts summary for the notification email
    const lines = loadJobUsage().filter((l) => l.jobId === job.id);
    const recipients = loadNotificationRecipients();
    const hasRecipients = [recipients.salesEmail, recipients.partsEmail, recipients.invoicingEmail].some((e) => e.trim());

    if (hasRecipients) {
      const mailto = buildJobCompleteMailto({ job, lines, recipients });
      window.location.href = mailto;
      const notified = [
        recipients.salesEmail.trim() ? "sales" : "",
        recipients.partsEmail.trim() ? "parts" : "",
        recipients.invoicingEmail.trim() ? "invoicing" : "",
      ].filter(Boolean).join(", ");
      setCompletionMsg(`Job "${job.name}" marked complete. Notification email opened for: ${notified}.`);
    } else {
      setCompletionMsg(
        `Job "${job.name}" marked complete. (No notification emails configured — add them in Settings › Job Completion Notifications.)`
      );
    }
  }

  function reopenSelectedJob(job: Job) {
    reopenJob(job.id);
    setJobs(loadJobs());
    setCompletionMsg(null);
  }

  function exportSelectedJob() {
    if (!selectedJob) return;
    const out = exportJobCSV(selectedJob.id);
    if (!out) return;
    downloadTextFile(out.filename, out.csv);
  }

  function addPartsToJob(item: InventoryItem) {
    if (!selectedJob) {
      alert("Start or select an open job first.");
      return;
    }
    if (selectedJob.status !== "open") {
      alert("This job is complete. Reopen it to add more parts.");
      return;
    }

    const qty = Math.floor(Number(useQty));
    if (!Number.isFinite(qty) || qty <= 0) return;

    // remove from inventory (take out)
    itemsApi.adjustAtLocation(item.id, useLoc ?? "", -qty);

    // log to job usage
    logJobUsage({
      job: selectedJob,
      item,
      qty,
      locationId: useLoc ?? "",
      note: useNote.trim(),
    });

    setUsage(loadJobUsage());
    setRefresh((x) => x + 1);
    setUseNote("");
    // Intentionally do NOT clear useSearch, useQty, or useLoc so technician can
    // keep adding parts without losing their search context.
  }

  return (
    <div className="page dashboardPage">
      <div className="dashboardHeader">
        <div>
          <h2 className="dashboardTitle">Dashboard</h2>
          <div className="dashboardSubtitle">Parts used by job number, restock priorities, and recent activity.</div>
        </div>
        <div className="dashboardHeaderActions">
          <button className="btn" onClick={() => setRefresh((x) => x + 1)}>Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboardStats dashboardGapTop">
        <Card title="Items">
          <div className="dashboardStatValue">{stats.items}</div>
          <div className="dashboardStatNote">Unique inventory items</div>
        </Card>
        <Card title="Total stock">
          <div className="dashboardStatValue">{stats.totalStock}</div>
          <div className="dashboardStatNote">All quantities across locations</div>
        </Card>
        <Card title="Low stock alerts">
          <div className="dashboardStatValue">{stats.lowStock}</div>
          <div className="dashboardStatNote">Items at or below threshold</div>
        </Card>
        <Card title="Jobs open">
          <div className="dashboardStatValue">{stats.jobsOpen}</div>
          <div className="dashboardStatNote">Work in progress</div>
        </Card>
      </div>

      {/* Main grid */}
      <div className="dashboardMain dashboardGapTop">
        <Card title="Parts Used • Job Tracking">

          {/* Start a new job — simple single-field form */}
          <div className="dashboardSectionTitle">Start a new job</div>
          <div className="dashboardJobCreateGrid dashboardJobCreateSimple">
            <input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") startNewJob(); }}
              placeholder="Job number or name (e.g. WO-1042, PG Sawmill Repair)"
            />
            <button className="btn primary" onClick={startNewJob}>Start Job</button>
          </div>

          {/* Job selector + actions */}
          <div className="dashboardJobActions">
            <select
              value={selectedJobId}
              onChange={(e) => { setSelectedJobId(e.target.value); setCompletionMsg(null); }}
              disabled={!jobs.length}
            >
              {!jobs.length ? (
                <option value="">No jobs yet</option>
              ) : (
                jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.status === "open" ? "🟢" : "⚫"} {j.name}
                  </option>
                ))
              )}
            </select>

            {selectedJob?.status === "open" ? (
              <button
                className="btn primary"
                onClick={() => { if (selectedJob) completeJob(selectedJob); }}
                disabled={!selectedJob}
              >
                ✅ Job Complete
              </button>
            ) : (
              <button
                className="btn"
                onClick={() => { if (selectedJob) reopenSelectedJob(selectedJob); }}
                disabled={!selectedJob}
              >
                Reopen Job
              </button>
            )}

            <button className="btn" onClick={exportSelectedJob} disabled={!selectedJob}>
              Export CSV
            </button>
          </div>

          {/* Completion notification message */}
          {completionMsg && (
            <div className="dashboardCompletionMsg">
              {completionMsg}
            </div>
          )}

          {/* Parts used on selected job */}
          {selectedJob && (
            <div className="dashboardSection">
              <div className="dashboardSectionTitle">
                Parts used on <strong>{selectedJob.name}</strong>
                {selectedJob.status === "closed" && <span className="dashboardCompletedTag"> — Complete</span>}
              </div>
              <div className="dashboardStack">
                {jobUsageLines.length === 0 ? (
                  <div className="dashboardMuted">No parts logged for this job yet.</div>
                ) : (
                  jobUsageLines.map((u) => (
                    <div key={u.id} className="dashboardRowCard">
                      <div className="dashboardUsageTop">
                        <Badge>{fmt(u.ts)}</Badge>
                        <div className="dashboardStrong">{u.itemName}</div>
                        <Badge>Qty: {u.qty}</Badge>
                      </div>
                      <div className="dashboardUsageMeta">
                        Part#: {u.partNumber || "—"} {u.note ? `• ${u.note}` : ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Add parts panel — only shown for open jobs */}
          {selectedJob?.status === "open" && (
            <div className="dashboardUsePanel">
              <div className="dashboardSectionTitle">Add parts to job</div>

              <div className="dashboardUseGrid">
                <div>
                  <input value={useSearch} onChange={(e) => setUseSearch(e.target.value)} placeholder="Search item (Part Number, Brand, Model, Serial, Description…)" />
                  <div className="searchHints" aria-hidden="true">
                    <span className="searchHint">Part Number</span>
                    <span className="searchHint">Brand</span>
                    <span className="searchHint">Model Number</span>
                    <span className="searchHint">Serial Number</span>
                  </div>
                </div>
                <input value={useQty} onChange={(e) => setUseQty(e.target.value)} inputMode="numeric" placeholder="Quantity" />
                <select value={useLoc} onChange={(e) => setUseLoc(e.target.value)}>
                  <option value="">Location (optional)</option>
                  {roots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div className="dashboardUseNote">
                <input value={useNote} onChange={(e) => setUseNote(e.target.value)} placeholder="Note (optional) e.g. Used during alignment / emergency repair" />
              </div>

              <div className="dashboardResultCount">Matching items: {filteredItems.length}</div>

              <div className="dashboardItemsList">
                {filteredItems.map((it) => (
                  <div key={it.id} className="dashboardItemRow">
                    <div className="dashboardItemMain">
                      <div className="dashboardItemName">{it.name}</div>
                      <div className="dashboardItemMeta">{categoryLabel(it)} • Part#: {it.partNumber || "—"}</div>
                      <div className="dashboardPills">
                        <Badge>In Stock: {totalQty(it)}</Badge>
                        <Badge>Low: {it.lowStock ?? "—"}</Badge>
                      </div>
                    </div>
                    <button className="btn" onClick={() => addPartsToJob(it)}>
                      Add to Job
                    </button>
                  </div>
                ))}
                {!filteredItems.length ? <div className="muted">No matching inventory items.</div> : null}
              </div>
            </div>
          )}
        </Card>

        <div className="dashboardStack">
          <Card title="Restock list (worst first)">
            {restock.length === 0 ? (
              <div className="dashboardMuted">No low-stock items. You're good.</div>
            ) : (
              <div className="dashboardStack">
                {restock.map(({ it, t, low, need }) => (
                  <div key={it.id} className="dashboardRestockRow">
                    <div className="dashboardItemMain">
                      <div className="dashboardItemName">{it.name}</div>
                      <div className="dashboardItemMeta">{categoryLabel(it)}</div>
                      <div className="dashboardPills">
                        <Badge>In Stock: {t}</Badge>
                        <Badge>Low: {low}</Badge>
                        <Badge>Need to Reorder: {need}</Badge>
                      </div>
                    </div>
                    <div className="dashboardRightMeta">
                      <div className="dashboardItemMeta">Part Number</div>
                      <div className="dashboardStrong">{it.partNumber || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Recent activity (audit log)">
            {activity.length === 0 ? (
              <div className="dashboardMuted">No activity yet.</div>
            ) : (
              <div className="dashboardAuditList">
                {activity.slice(0, 12).map((ev) => (
                  <div key={ev.id} className="dashboardAuditRow">
                    {fmt(ev.ts)} • {activityLabel(ev)} • {ev.itemName ?? "—"} {typeof ev.qty === "number" ? `• Qty ${ev.qty}` : ""} {ev.note ? `• ${ev.note}` : ""}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
