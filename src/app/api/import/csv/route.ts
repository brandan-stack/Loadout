import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ImportRowSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().optional(),
  description: z.string().optional(),
  quantityOnHand: z.coerce.number().int().min(0).default(0),
  lowStockAmberThreshold: z.coerce.number().int().min(0).default(5),
  lowStockRedThreshold: z.coerce.number().int().min(0).default(2),
  unitOfMeasure: z.string().optional(),
});

const ImportRequestSchema = z.object({
  rows: z.array(z.record(z.string())),
  mapping: z.record(z.string()), // csvColumn -> itemField
  dryRun: z.boolean().default(true),
});

type ImportResult = {
  index: number;
  name: string;
  status: "ok" | "error" | "duplicate";
  message?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ImportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { rows, mapping, dryRun } = parsed.data;
  const results: ImportResult[] = [];
  const toCreate: z.infer<typeof ImportRowSchema>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Apply field mapping
    const mapped: Record<string, string> = {};
    for (const [csvCol, itemField] of Object.entries(mapping)) {
      if (row[csvCol] !== undefined) mapped[itemField] = row[csvCol];
    }

    const rowParsed = ImportRowSchema.safeParse(mapped);
    if (!rowParsed.success) {
      results.push({
        index: i,
        name: mapped.name ?? `Row ${i + 1}`,
        status: "error",
        message: Object.values(rowParsed.error.flatten().fieldErrors).flat().join("; "),
      });
      continue;
    }

    // Check for duplicate barcode
    if (rowParsed.data.barcode) {
      const existingBarcode = await prisma.item.findUnique({
        where: { barcode: rowParsed.data.barcode },
      });
      if (existingBarcode) {
        results.push({
          index: i,
          name: rowParsed.data.name,
          status: "duplicate",
          message: `Barcode ${rowParsed.data.barcode} already exists`,
        });
        continue;
      }
    }

    results.push({ index: i, name: rowParsed.data.name, status: "ok" });
    toCreate.push(rowParsed.data);
  }

  if (!dryRun) {
    if (toCreate.length > 0) {
      await prisma.item.createMany({
        data: toCreate.map((item) => ({
          name: item.name,
          barcode: item.barcode || null,
          description: item.description || null,
          quantityOnHand: item.quantityOnHand,
          lowStockAmberThreshold: item.lowStockAmberThreshold,
          lowStockRedThreshold: item.lowStockRedThreshold,
          unitOfMeasure: item.unitOfMeasure ?? "each",
        })),
      });
    }
  }

  const summary = {
    total: rows.length,
    ok: results.filter((r) => r.status === "ok").length,
    errors: results.filter((r) => r.status === "error").length,
    duplicates: results.filter((r) => r.status === "duplicate").length,
    dryRun,
    results,
  };

  return NextResponse.json(summary);
}
