import type { InventoryItem } from "../hooks/useItems";

type RootLoc = { id: string; name: string };

function esc(s: any) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function totalQty(it: InventoryItem) {
  return (it.stockByLocation ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0);
}

function locName(roots: RootLoc[], id: string) {
  if (!id) return "Missing Location";
  return roots.find((r) => r.id === id)?.name ?? id;
}

export function openPrintReport(opts: {
  title: string;
  roots: RootLoc[];
  items: InventoryItem[];
  categoryLabel: (it: InventoryItem) => string;
  activityLines: string[];
  restock: Array<{
    name: string;
    pn: string;
    cat: string;
    inStock: number;
    low: number;
    need: number;
    photo?: string;
  }>;
  mode: "location" | "category";
}) {
  const { title, roots, items, categoryLabel, activityLines, restock, mode } = opts;

  type Row = {
    item: InventoryItem;
    locId: string;
    locQty: number;
    total: number;
    cat: string;
  };

  const rows: Row[] = [];
  for (const it of items) {
    const cat = categoryLabel(it);
    const t = totalQty(it);
    const stock = it.stockByLocation?.length ? it.stockByLocation : [{ locationId: "", quantity: 0 }];
    for (const r of stock) {
      rows.push({
        item: it,
        locId: String(r.locationId ?? ""),
        locQty: Number(r.quantity ?? 0),
        total: t,
        cat,
      });
    }
  }

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = mode === "location" ? locName(roots, r.locId) : r.cat || "Uncategorized";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const groupKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
  for (const k of groupKeys) {
    groups.get(k)!.sort((a, b) => (a.item.name || "").localeCompare(b.item.name || ""));
  }

  const headerDate = new Date().toLocaleString();

  const restockHtml =
    restock.length === 0
      ? `<div class="muted">No low-stock items 🎉</div>`
      : `
      <div class="grid">
        ${restock
          .slice(0, 20)
          .map(
            (r) => `
          <div class="card warn">
            <div class="row">
              ${
                r.photo
                  ? `<img class="thumb" src="${r.photo}" />`
                  : `<div class="thumb ph"></div>`
              }
              <div class="grow">
                <div class="name">${esc(r.name)}</div>
                <div class="muted">${esc(r.cat)}</div>
                <div class="chips">
                  <span class="chip">In: <b>${r.inStock}</b></span>
                  <span class="chip">Low: <b>${r.low}</b></span>
                  <span class="chip">Need: <b>${r.need}</b></span>
                </div>
              </div>
              <div class="pn">
                <div class="muted">PN</div>
                <div class="mono">${esc(r.pn || "—")}</div>
              </div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>`;

  const activityHtml =
    activityLines.length === 0
      ? `<div class="muted">No activity yet.</div>`
      : `
      <div class="list">
        ${activityLines
          .slice(0, 40)
          .map((l) => `<div class="line mono">${esc(l)}</div>`)
          .join("")}
      </div>`;

  const sectionsHtml = groupKeys
    .map((key) => {
      const list = groups.get(key)!;

      const tableRows = list
        .map((r) => {
          const it = r.item;
          const low = typeof it.lowStock === "number" ? it.lowStock : 0;
          const lowBadge =
            low > 0 && r.total <= low ? `<span class="chip danger">LOW ${r.total}/${low}</span>` : "";

          return `
          <tr>
            <td class="cell-name">
              <div class="row">
                ${
                  it.photoDataUrl
                    ? `<img class="thumb sm" src="${it.photoDataUrl}" />`
                    : `<div class="thumb sm ph"></div>`
                }
                <div class="grow">
                  <div class="name">${esc(it.name)}</div>
                  <div class="muted small">${esc(r.cat)}</div>
                  <div class="muted small mono">PN: ${esc(it.partNumber || "—")} • Mfr: ${esc(
                    it.manufacturer || "—"
                  )} • Model: ${esc(it.model || "—")} • SN: ${esc(it.serial || "—")}</div>
                </div>
              </div>
            </td>
            <td class="mono">${esc(mode === "location" ? key : locName(roots, r.locId))}</td>
            <td class="num">${r.locQty}</td>
            <td class="num">${r.total}</td>
            <td>${lowBadge}</td>
          </tr>
        `;
        })
        .join("");

      return `
        <div class="section">
          <div class="section-title">${esc(key)}</div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Location</th>
                <th class="num">Qty here</th>
                <th class="num">Total</th>
                <th>Alert</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    :root {
      --bg:#ffffff;
      --ink:#111214;
      --muted:#5a5f69;
      --border:#e6e8ee;
      --panel:#f7f8fb;
      --warn:#fff3f3;
      --danger:#b00020;
    }
    *{box-sizing:border-box}
    body{margin:0;font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;color:var(--ink);background:var(--bg);}
    .wrap{max-width:1100px;margin:0 auto;padding:28px}
    .top{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:16px;margin-bottom:16px;}
    h1{margin:0;font-size:22px}
    .muted{color:var(--muted)}
    .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
    .small{font-size:12px}
    .summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0 20px;}
    .stat{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:12px;}
    .stat .n{font-weight:800;font-size:22px}
    .chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
    .chip{display:inline-flex;gap:6px;align-items:center;border:1px solid var(--border);background:#fff;border-radius:999px;padding:2px 8px;font-size:12px;}
    .chip.danger{border-color:#ffb3b3;background:var(--warn);color:var(--danger);font-weight:800}
    .grid{display:grid;grid-template-columns:1fr;gap:10px}
    .card{border:1px solid var(--border);border-radius:14px;padding:10px;background:#fff;}
    .card.warn{background:var(--warn);border-color:#ffd3d3}
    .row{display:flex;gap:12px;align-items:center}
    .grow{flex:1;min-width:0}
    .name{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .thumb{width:54px;height:54px;border-radius:12px;object-fit:cover;border:1px solid var(--border);background:var(--panel)}
    .thumb.sm{width:42px;height:42px;border-radius:10px}
    .thumb.ph{display:inline-block}
    .pn{text-align:right}
    .section{margin-top:18px}
    .section-title{font-weight:900;font-size:16px;margin:8px 0 10px}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid var(--border);padding:10px;vertical-align:top}
    th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left}
    td.num,th.num{text-align:right}
    .cell-name{width:56%}
    .list{border:1px solid var(--border);border-radius:14px;background:#fff;overflow:hidden}
    .line{padding:10px;border-bottom:1px solid var(--border);font-size:12px}
    .line:last-child{border-bottom:none}
    @media print {.no-print{display:none !important;}.wrap{padding:0 10px}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div>
        <h1>${esc(title)}</h1>
        <div class="muted small">Generated: ${esc(headerDate)} • Mode: ${esc(mode === "location" ? "Grouped by Location" : "Grouped by Category")}</div>
      </div>
      <div class="no-print">
        <button onclick="window.print()" style="padding:10px 14px;border-radius:12px;border:1px solid #e6e8ee;background:#111214;color:#fff;font-weight:800;cursor:pointer;">
          Print / Save PDF
        </button>
      </div>
    </div>

    <div class="summary">
      <div class="stat"><div class="muted small">Items</div><div class="n">${items.length}</div></div>
      <div class="stat"><div class="muted small">Total stock</div><div class="n">${items.reduce((s, it) => s + totalQty(it), 0)}</div></div>
      <div class="stat"><div class="muted small">Low-stock items</div><div class="n">${restock.length}</div></div>
      <div class="stat"><div class="muted small">Report groups</div><div class="n">${groupKeys.length}</div></div>
    </div>

    <div class="section">
      <div class="section-title">Restock List</div>
      ${restockHtml}
      <div class="muted small" style="margin-top:8px">${restock.length > 20 ? `Showing top 20 of ${restock.length}.` : ""}</div>
    </div>

    <div class="section">
      <div class="section-title">Recent Activity</div>
      ${activityHtml}
      <div class="muted small" style="margin-top:8px">${activityLines.length > 40 ? `Showing latest 40 of ${activityLines.length}.` : ""}</div>
    </div>

    <div class="section">
      <div class="section-title">Inventory Breakdown</div>
      ${sectionsHtml}
    </div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Allow popups to export PDF/print.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}

// Backwards-compat alias (in case any older file expects this name)
export const openPrintReportLegacy = openPrintReport;