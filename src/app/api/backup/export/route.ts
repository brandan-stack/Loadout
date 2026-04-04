import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";
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

export async function GET(request: NextRequest) {
  try {
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }
    if (auth.context.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [items, suppliers, transactions, shareLog] = await Promise.all([
      prisma.item.findMany({ where: { organizationId: auth.context.organizationId }, orderBy: { name: "asc" } }),
      prisma.supplier.findMany({ where: { organizationId: auth.context.organizationId }, orderBy: { name: "asc" } }),
      prisma.inventoryTransaction.findMany({
        where: { item: { organizationId: auth.context.organizationId } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.shareLog.findMany({ where: { organizationId: auth.context.organizationId }, orderBy: { createdAt: "asc" } }),
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
  } catch (error) {
    console.error("Backup export error:", error);
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}
