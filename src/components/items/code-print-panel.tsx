"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { SidePanel } from "@/components/panels/SidePanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type CodeType = "barcode" | "qr";

function sanitizeCode(value: string) {
  return value.trim().toUpperCase();
}

export function CodePrintPanel({
  open,
  onClose,
  initialCode,
  initialName,
}: {
  open: boolean;
  onClose: () => void;
  initialCode?: string;
  initialName?: string;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeType, setCodeType] = useState<CodeType>("barcode");
  const [error, setError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  const normalizedCode = useMemo(() => sanitizeCode(code), [code]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(initialName ?? "Inventory Item");
    setCode(initialCode ?? "");
    setCodeType("barcode");
    setError("");
    setQrDataUrl(null);
  }, [open, initialCode, initialName]);

  useEffect(() => {
    if (!open || codeType !== "barcode" || !barcodeSvgRef.current) {
      return;
    }

    if (!normalizedCode) {
      barcodeSvgRef.current.innerHTML = "";
      setError("");
      return;
    }

    try {
      JsBarcode(barcodeSvgRef.current, normalizedCode, {
        format: "CODE128",
        width: 2,
        height: 82,
        margin: 8,
        displayValue: false,
        lineColor: "#111827",
        background: "#ffffff",
      });
      setError("");
    } catch {
      setError("Unable to generate barcode for this code value.");
    }
  }, [open, codeType, normalizedCode]);

  useEffect(() => {
    if (!open || codeType !== "qr") {
      return;
    }

    if (!normalizedCode) {
      setQrDataUrl(null);
      setError("");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(normalizedCode, {
          margin: 1,
          width: 320,
          errorCorrectionLevel: "M",
        });

        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Unable to generate QR code for this value.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, codeType, normalizedCode]);

  function handlePrint() {
    if (!normalizedCode) {
      setError("Enter a code value before printing.");
      return;
    }

    if (codeType === "barcode" && !barcodeSvgRef.current) {
      setError("Barcode preview is not ready.");
      return;
    }

    if (codeType === "qr" && !qrDataUrl) {
      setError("QR preview is not ready.");
      return;
    }

    const previewMarkup =
      codeType === "barcode"
        ? barcodeSvgRef.current?.outerHTML ?? ""
        : `<img src="${qrDataUrl}" alt="QR code" style="width:240px;height:240px;object-fit:contain;" />`;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=720");
    if (!printWindow) {
      setError("Unable to open print window. Check popup settings.");
      return;
    }

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print Code Label</title>
    <style>
      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        background: #ffffff;
        color: #0f172a;
      }
      .sheet {
        padding: 24px;
      }
      .label {
        width: 420px;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        padding: 18px;
      }
      .name {
        font-weight: 700;
        font-size: 18px;
      }
      .preview {
        margin: 14px 0;
        min-height: 110px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .code {
        margin-top: 8px;
        font-weight: 700;
        font-size: 16px;
        letter-spacing: 0.08em;
      }
      .type {
        margin-top: 4px;
        color: #334155;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="label">
        <div class="name">${(name || "Inventory Item").replace(/</g, "&lt;")}</div>
        <div class="preview">${previewMarkup}</div>
        <div class="code">${normalizedCode.replace(/</g, "&lt;")}</div>
        <div class="type">${codeType === "barcode" ? "Code 128 Barcode" : "QR Code"}</div>
      </div>
    </div>
  </body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Create or print code"
      description="Generate a printable barcode or QR code label. Enter any custom code value and print immediately."
      footer={
        <div className="flex flex-col gap-3">
          {error ? <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">{error}</Card> : null}
          <Button variant="primary" onClick={handlePrint}>Print label</Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Label name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
            placeholder="Inventory item"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Code value</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
            placeholder="SKU-000001"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Code type</span>
          <select
            value={codeType}
            onChange={(event) => setCodeType(event.target.value as CodeType)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="barcode">Barcode (Code 128)</option>
            <option value="qr">QR code</option>
          </select>
        </label>

        <Card className="border-white/8 bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preview</p>
          <div className="mt-4 flex min-h-[170px] items-center justify-center rounded-2xl border border-white/10 bg-white p-4">
            {codeType === "barcode" ? (
              <svg ref={barcodeSvgRef} role="img" aria-label="Barcode preview" />
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR preview" className="h-44 w-44 object-contain" />
            ) : (
              <p className="text-sm text-slate-500">Enter a code to preview</p>
            )}
          </div>
          <p className="mt-3 text-center font-mono text-sm text-slate-300">{normalizedCode || "No code value"}</p>
        </Card>
      </div>
    </SidePanel>
  );
}
