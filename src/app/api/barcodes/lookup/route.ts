// src/app/api/barcodes/lookup/route.ts - Barcode lookup API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";

interface BarcodeResult {
  found: boolean;
  item?: {
    id: string;
    name: string;
    barcode: string;
    quantityOnHand: number;
    lowStockRedThreshold: number;
    lowStockAmberThreshold: number;
  };
  message?: string;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }

    const barcode = request.nextUrl.searchParams.get("barcode");

    if (!barcode || !barcode.trim()) {
      return NextResponse.json(
        { error: "Barcode required" },
        { status: 400 }
      );
    }

    const normalized = barcode.trim().toUpperCase();

    const item = await prisma.item.findFirst({
      where: {
        organizationId: auth.context.organizationId,
        barcode: normalized,
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        quantityOnHand: true,
        lowStockRedThreshold: true,
        lowStockAmberThreshold: true,
      },
    });

    if (item && item.barcode) {
      const result: BarcodeResult = {
        found: true,
        item: {
          id: item.id,
          name: item.name,
          barcode: item.barcode,
          quantityOnHand: item.quantityOnHand,
          lowStockRedThreshold: item.lowStockRedThreshold,
          lowStockAmberThreshold: item.lowStockAmberThreshold,
        },
        message: `Found: ${item.name}`,
      };
      return NextResponse.json(result);
    }

    const result: BarcodeResult = {
      found: false,
      message: `Barcode not found. Create new item?`,
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return NextResponse.json(
      { error: "Barcode lookup failed" },
      { status: 500 }
    );
  }
}
