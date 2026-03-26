// src/app/api/ai/identify-item/route.ts - AI-powered item photo analysis

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI photo analysis requires an OPENAI_API_KEY environment variable. Add it in your Vercel project settings under Environment Variables.",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image too large. Please use an image under 10 MB." },
        { status: 413 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
        { status: 415 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" },
              },
              {
                type: "text",
                text: `Analyze this image of an inventory item or tool and extract product information. 
Respond with ONLY a valid JSON object (no markdown fences, no extra text) with exactly these fields:
{
  "name": "short product name or type (e.g. 'Hex Bolt M8x20', 'Cordless Drill', 'Steel Pipe')",
  "manufacturer": "brand or manufacturer if visible or clearly inferrable, else empty string",
  "partNumber": "part number or SKU if visible on label/packaging, else empty string",
  "modelNumber": "model number if visible, else empty string",
  "description": "1-2 sentence description of what this item is and its likely use",
  "material": "primary material type if applicable (e.g. stainless steel, nylon, rubber, aluminum)",
  "confidence": "high if clearly identifiable, medium if reasonably certain, low if uncertain"
}
If a field cannot be determined, use an empty string. Prioritize accuracy over guessing.`,
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      console.error("OpenAI API error:", err);
      return NextResponse.json(
        { error: err?.error?.message || "AI service unavailable. Try again later." },
        { status: 503 }
      );
    }

    const aiResult = await response.json();
    const content: string = aiResult.choices?.[0]?.message?.content ?? "{}";

    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      // Try extracting JSON from surrounding text
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = {};
        }
      }
    }

    return NextResponse.json({
      name: (parsed.name ?? "").trim(),
      manufacturer: (parsed.manufacturer ?? "").trim(),
      partNumber: (parsed.partNumber ?? "").trim(),
      modelNumber: (parsed.modelNumber ?? "").trim(),
      description: (parsed.description ?? "").trim(),
      material: (parsed.material ?? "").trim(),
      confidence: (parsed.confidence ?? "low").trim(),
    });
  } catch (error) {
    console.error("AI identify item error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image. Please try again." },
      { status: 500 }
    );
  }
}
