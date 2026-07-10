// src/lib/camera/barcode-scanner.ts - QR/Barcode scanner with jsQR

import jsQR from "jsqr";

export interface ScanResult {
  code: string;
  type: "barcode" | "qr";
  timestamp: number;
}

const BARCODE_FORMATS: string[] = [
  "qr_code",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "itf",
  "codabar",
];

let detector: BarcodeDetector | null | undefined;

function getDetector() {
  if (detector !== undefined) {
    return detector;
  }

  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    detector = null;
    return detector;
  }

  detector = new BarcodeDetector({ formats: BARCODE_FORMATS as BarcodeFormat[] });
  return detector;
}

/**
 * Scan barcode/QR code from video element using canvas + jsQR
 */
export async function scanBarcodeFromVideo(
  videoElement: HTMLVideoElement
): Promise<ScanResult | null> {
  // Check video is ready
  if (!videoElement.videoWidth || !videoElement.videoHeight) {
    return null;
  }

  // Create off-screen canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  // Draw current frame
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Scan with jsQR
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const barcodeDetector = getDetector();
  if (barcodeDetector) {
    try {
      const codes = await barcodeDetector.detect(canvas);
      if (codes.length > 0) {
        const first = codes.find((entry) => entry.rawValue)?.rawValue;
        if (first) {
          return {
            code: first,
            type: "barcode",
            timestamp: Date.now(),
          };
        }
      }
    } catch {
      // Fall through to jsQR fallback.
    }
  }

  const code = jsQR(imageData.data, canvas.width, canvas.height);

  if (code) {
    return {
      code: code.data,
      type: "qr", // jsQR detects QR codes and various barcodes
      timestamp: Date.now(),
    };
  }

  return null;
}

export function parseBarcode(raw: string): string {
  // Normalize barcode format (remove spaces, uppercase, etc)
  return raw.trim().toUpperCase();
}

/**
 * Validate barcode format (length constraints)
 */
export function isValidBarcode(barcode: string): boolean {
  const normalized = parseBarcode(barcode);
  return normalized.length > 0 && normalized.length < 200;
}
