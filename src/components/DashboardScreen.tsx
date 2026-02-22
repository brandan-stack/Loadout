import { useMemo, useState } from "react";
import { useItems, type InventoryItem } from "../hooks/useItems";
import { useCategories } from "../hooks/useCategories";
import { useLocations } from "../hooks/useLocations";
import { loadActivity, type ActivityEvent } from "../lib/activityStore";

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

const bg = "#0b0c0e";
const surface = "#111214";
const panel = "#17181b";
const border = "rgba(255,255,255,0.12)";
const border2 = "rgba(255,255,255,0.18)";
const text = "rgba(255,255,255,0.95)";
const muted = "rgba(255,255,255,0.72)";

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: `1px solid ${border2}`,
  background: "rgba(255,255,255,0.08)",
  color: text,
  fontWeight: 1000,
  cursor: "pointer",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 12,
  border: `1px solid ${border2}`,
  background: panel,
  color: text,
  outline: "none",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: 14 }}>
      <div style={{ fontWeight: 1000, fontSize: 13, color: muted, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: "rgba(255,255,255,0.06)",
        fontSize: 11,
        fontWeight: 1000,
      }}
    >
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

  const [jobName, setJobName] = useState("");
  const [jobCustomer, setJobCustomer] = useState("");
  const [jobPO, setJobPO] = useState("");

  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id ?? "");

  // Use parts UI
  const [useSearch, setUseSearch] = useState("");
  const [useQty, setUseQty] = useState("1");
  const [useLoc, setUseLoc] = useState<string>("");
  const [useNote, setUseNote] = useState("");

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) ?? null, [jobs, selectedJobId]);

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
        const hay = [it.name, it.partNumber, it.manufacturer, it.model, it.serial].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [itemsApi.items, useSearch]);

  function createNewJob() {
    const name = jobName.trim();
    if (!name) return;
    const job = createJob({ name, customer: jobCustomer, po: jobPO });
    const next = [job, ...loadJobs()];
    setJobs(next);
    setSelectedJobId(job.id);
    setJobName("");
    setJobCustomer("");
    setJobPO("");
  }

  function toggleJobStatus(job: Job) {
    if (job.status === "open") closeJob(job.id);
    else reopenJob(job.id);
    setJobs(loadJobs());
  }

  function exportSelectedJob() {
    if (!selectedJob) return;
    const out = exportJobCSV(selectedJob.id);
    if (!out) return;
    downloadTextFile(out.filename, out.csv);
  }

  function useParts(item: InventoryItem) {
    if (!selectedJob) {
      alert("Create/select a job first.");
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
  }

  return (
    <div style={{ padding: 16, background: bg, color: text, minHeight: "calc(100vh - 56px)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btn} onClick={() => setRefresh((x) => x + 1)}>Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
        <Card title="Items">
          <div style={{ fontSize: 26, fontWeight: 1000 }}>{stats.items}</div>
          <div style={{ fontSize: 12, color: muted }}>Unique inventory items</div>
        </Card>
        <Card title="Total stock">
          <div style={{ fontSize: 26, fontWeight: 1000 }}>{stats.totalStock}</div>
          <div style={{ fontSize: 12, color: muted }}>All quantities across locations</div>
        </Card>
        <Card title="Low stock alerts">
          <div style={{ fontSize: 26, fontWeight: 1000 }}>{stats.lowStock}</div>
          <div style={{ fontSize: 12, color: muted }}>Items at or below threshold</div>
        </Card>
        <Card title="Jobs open">
          <div style={{ fontSize: 26, fontWeight: 1000 }}>{stats.jobsOpen}</div>
          <div style={{ fontSize: 12, color: muted }}>Work in progress</div>
        </Card>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 12, marginTop: 12 }}>
        <Card title="Jobs • Used parts (for invoicing)">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 }}>
            <input style={input} value={jobName} onChange={(e) => setJobName(e.target.value)} placeholder="Job name (e.g. PG Sawmill Repair)" />
            <input style={input} value={jobCustomer} onChange={(e) => setJobCustomer(e.target.value)} placeholder="Customer (optional)" />
            <input style={input} value={jobPO} onChange={(e) => setJobPO(e.target.value)} placeholder="PO / WO (optional)" />
            <button style={btn} onClick={createNewJob}>Create</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center" }}>
            <select
              style={input}
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.status === "open" ? "🟢" : "⚫"} {j.name}
                </option>
              ))}
            </select>

            <button
              style={btn}
              onClick={() => {
                if (!selectedJob) return;
                toggleJobStatus(selectedJob);
              }}
              disabled={!selectedJob}
            >
              {selectedJob?.status === "open" ? "Close job" : "Reopen"}
            </button>

            <button style={btn} onClick={exportSelectedJob} disabled={!selectedJob}>
              Export job CSV
            </button>
          </div>

          <div style={{ marginTop: 12, padding: 12, border: `1px solid ${border}`, borderRadius: 14, background: panel }}>
            <div style={{ fontWeight: 1000, marginBottom: 10 }}>Use parts on selected job</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 1fr", gap: 10 }}>
              <input style={input} value={useSearch} onChange={(e) => setUseSearch(e.target.value)} placeholder="Search item (name, PN, model…)" />
              <input style={input} value={useQty} onChange={(e) => setUseQty(e.target.value)} inputMode="numeric" placeholder="Qty" />
              <select style={input} value={useLoc} onChange={(e) => setUseLoc(e.target.value)}>
                <option value="">Missing Location</option>
                {roots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div style={{ marginTop: 10 }}>
              <input style={input} value={useNote} onChange={(e) => setUseNote(e.target.value)} placeholder="Note (optional) e.g. Used during alignment / emergency repair" />
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {filteredItems.map((it) => (
                <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "center", border: `1px solid ${border}`, borderRadius: 14, padding: 10, background: "rgba(255,255,255,0.04)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: muted }}>{categoryLabel(it)} • PN: {it.partNumber || "—"}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge>Total: {totalQty(it)}</Badge>
                      <Badge>Low: {it.lowStock ?? "—"}</Badge>
                    </div>
                  </div>
                  <button style={btn} onClick={() => useParts(it)} disabled={!selectedJob}>
                    Use on job
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 1000, marginBottom: 8 }}>Recent job usage</div>
            <div style={{ display: "grid", gap: 8 }}>
              {usage.slice(0, 8).map((u) => (
                <div key={u.id} style={{ border: `1px solid ${border}`, borderRadius: 14, padding: 10, background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <Badge>{fmt(u.ts)}</Badge>
                    <div style={{ fontWeight: 1000 }}>{u.jobName}</div>
                    <div style={{ color: muted }}>•</div>
                    <div style={{ fontWeight: 1000 }}>{u.itemName}</div>
                    <Badge>Qty: {u.qty}</Badge>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: muted }}>
                    PN: {u.partNumber || "—"} {u.note ? `• Note: ${u.note}` : ""}
                  </div>
                </div>
              ))}
              {usage.length === 0 ? <div style={{ color: muted }}>No job usage logged yet.</div> : null}
            </div>
          </div>
        </Card>

        <div style={{ display: "grid", gap: 12 }}>
          <Card title="Restock list (worst first)">
            {restock.length === 0 ? (
              <div style={{ color: muted }}>No low-stock items. You’re good.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {restock.map(({ it, t, low, need }) => (
                  <div key={it.id} style={{ border: `1px solid ${border}`, borderRadius: 14, padding: 10, background: "rgba(255,0,0,0.10)", display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                      <div style={{ fontSize: 12, color: muted }}>{categoryLabel(it)}</div>
                      <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Badge>In: {t}</Badge>
                        <Badge>Low: {low}</Badge>
                        <Badge>Need: {need}</Badge>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: muted }}>PN</div>
                      <div style={{ fontWeight: 1000 }}>{it.partNumber || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Recent activity (audit log)">
            {activity.length === 0 ? (
              <div style={{ color: muted }}>No activity yet.</div>
            ) : (
              <div style={{ border: `1px solid ${border}`, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
                {activity.slice(0, 12).map((ev) => (
                  <div key={ev.id} style={{ padding: 10, borderBottom: `1px solid ${border}`, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" }}>
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