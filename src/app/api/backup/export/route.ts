import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import JSZip from "jszip";

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

export async function GET() {
  const [items, suppliers, transactions, shareLog] = await Promise.all([
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.inventoryTransaction.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.shareLog.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const zip = new JSZip();

  zip.file("items.csv", toCSV(items as unknown as Record<string, unknown>[]));
  zip.file("suppliers.csv", toCSV(suppliers as unknown as Record<string, unknown>[]));
  zip.file("transactions.csv", toCSV(transactions as unknown as Record<string, unknown>[]));
  zip.file("share_log.csv", toCSV(shareLog as unknown as Record<string, unknown>[]));

  const manifest = {
    generatedAt: new Date().toISOString(),
    counts: {
      items: items.length,
      suppliers: suppliers.length,
      transactions: transactions.length,
    },
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const uint8 = new Uint8Array(buffer);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="loadout-backup-${date}.zip"`,
      "Content-Length": uint8.byteLength.toString(),
    },
  });
}
