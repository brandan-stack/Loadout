"use client";

import { useState, useRef } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

type Step = "upload" | "map" | "preview" | "importing" | "done";

interface ImportResult {
  index: number;
  name: string;
  status: "ok" | "error" | "duplicate";
  message?: string;
}

interface ImportSummary {
  total: number;
  ok: number;
  errors: number;
  duplicates: number;
  dryRun: boolean;
  results: ImportResult[];
}

const ITEM_FIELDS = [
  { value: "name", label: "Name *" },
  { value: "barcode", label: "Barcode" },
  { value: "description", label: "Description" },
  { value: "quantityOnHand", label: "Quantity" },
  { value: "lowStockAmberThreshold", label: "Amber Threshold" },
  { value: "lowStockRedThreshold", label: "Red Threshold" },
  { value: "unitOfMeasure", label: "Unit of Measure" },
  { value: "__skip", label: "— Skip —" },
];

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
  return { headers, rows };
}

export default function ImportWizardPage() {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setRows(r);
      // Auto-map headers with matching field names
      const autoMap: Record<string, string> = {};
      h.forEach((header) => {
        const normalised = header.toLowerCase().replace(/\s+/g, "");
        const match = ITEM_FIELDS.find(
          (f) => f.value !== "__skip" && f.value.toLowerCase() === normalised
        );
        autoMap[header] = match ? match.value : "__skip";
      });
      setMapping(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
  }

  async function runDryRun() {
    setStep("preview");
    const res = await fetch("/api/import/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, mapping: buildMapping(), dryRun: true }),
    });
    setPreview(await res.json());
  }

  async function runImport() {
    setStep("importing");
    const res = await fetch("/api/import/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, mapping: buildMapping(), dryRun: false }),
    });
    setSummary(await res.json());
    setStep("done");
  }

  function buildMapping(): Record<string, string> {
    const m: Record<string, string> = {};
    for (const [col, field] of Object.entries(mapping)) {
      if (field !== "__skip") m[col] = field;
    }
    return m;
  }

  function reset() {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setPreview(null);
    setSummary(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
      <h1 className="text-2xl sm:text-4xl font-bold mb-2">Import Wizard</h1>
      <p className="text-gray-600 mb-8">Import items from a CSV file.</p>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <GlassBubbleCard>
          <h2 className="font-bold text-lg mb-4">Step 1 — Upload CSV</h2>
          <p className="text-sm text-gray-500 mb-4">
            The CSV must have a header row. Required: <strong>name</strong>.
          </p>
          <label className="block w-full cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
            <p className="text-gray-500">Click to select a CSV file</p>
            <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
          </label>
        </GlassBubbleCard>
      )}

      {/* Step 2: Map columns */}
      {step === "map" && (
        <GlassBubbleCard>
          <h2 className="font-bold text-lg mb-2">Step 2 — Map Columns</h2>
          <p className="text-sm text-gray-500 mb-4">
            {rows.length} rows found. Map CSV columns to item fields.
          </p>
          <div className="space-y-3 mb-6">
            {headers.map((h) => (
              <div key={h} className="grid grid-cols-1 sm:grid-cols-[minmax(0,12rem)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                <span className="text-sm font-mono text-gray-700 break-all">{h}</span>
                <span className="text-gray-400 hidden sm:inline">→</span>
                <select
                  value={mapping[h] ?? "__skip"}
                  onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {ITEM_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={reset} className="px-4 py-2 text-sm border rounded hover:bg-gray-100">
              Back
            </button>
            <button
              onClick={runDryRun}
              className="flex-1 py-2 text-white text-sm rounded"
              style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
            >
              Preview Import
            </button>
          </div>
        </GlassBubbleCard>
      )}

      {/* Step 3: Preview / Dry Run */}
      {step === "preview" && !preview && (
        <GlassBubbleCard>
          <p className="text-center text-gray-500 py-8">Validating rows…</p>
        </GlassBubbleCard>
      )}

      {step === "preview" && preview && (
        <GlassBubbleCard>
          <h2 className="font-bold text-lg mb-4">Step 3 — Preview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 text-center">
            <div className="rounded-xl p-3 bg-slate-900/70 border border-white/10">
              <p className="text-2xl font-bold text-slate-100">{preview.ok}</p>
              <p className="text-xs text-slate-400">Ready to import</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-amber-600">{preview.duplicates}</p>
              <p className="text-xs text-amber-700">Duplicates skipped</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-600">{preview.errors}</p>
              <p className="text-xs text-red-700">Errors</p>
            </div>
          </div>

          {preview.results.filter((r) => r.status !== "ok").length > 0 && (
            <div className="mb-4 max-h-48 overflow-y-auto space-y-1">
              {preview.results
                .filter((r) => r.status !== "ok")
                .map((r) => (
                  <div
                    key={r.index}
                    className={`p-2 text-xs rounded ${
                      r.status === "duplicate"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    Row {r.index + 1}: <strong>{r.name}</strong> — {r.message}
                  </div>
                ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setStep("map")}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
            >
              Back
            </button>
            <button
              onClick={runImport}
              disabled={preview.ok === 0}
              className="flex-1 py-2 text-white text-sm rounded disabled:bg-gray-400"
              style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
            >
              Import {preview.ok} items
            </button>
          </div>
        </GlassBubbleCard>
      )}

      {/* Importing */}
      {step === "importing" && (
        <GlassBubbleCard>
          <p className="text-center text-gray-500 py-8">Importing items…</p>
        </GlassBubbleCard>
      )}

      {/* Done */}
      {step === "done" && summary && (
        <GlassBubbleCard>
          <h2 className="font-bold text-lg mb-4 text-slate-100">Import Complete!</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 text-center">
            <div className="rounded-xl p-3 bg-slate-900/70 border border-white/10">
              <p className="text-2xl font-bold text-slate-100">{summary.ok}</p>
              <p className="text-xs text-slate-400">Items imported</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-gray-600">{summary.total - summary.ok}</p>
              <p className="text-xs text-gray-700">Skipped</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="w-full py-2 text-white rounded"
            style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
          >
            Import Another File
          </button>
        </GlassBubbleCard>
      )}
    </main>
  );
}
