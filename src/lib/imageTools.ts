function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Unable to decode image."));
    img.onload = () => resolve(img);
    img.src = dataUrl;
  });
}

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

export async function imageFileToOptimizedDataUrl(
  file: File,
  opts?: {
    maxOriginalBytes?: number;
    maxWidth?: number;
    maxHeight?: number;
    targetBytes?: number;
  }
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  const maxOriginalBytes = opts?.maxOriginalBytes ?? 1_200_000;
  const maxWidth = opts?.maxWidth ?? 1600;
  const maxHeight = opts?.maxHeight ?? 1600;
  const targetBytes = opts?.targetBytes ?? 850_000;

  const originalDataUrl = await readFileAsDataUrl(file);

  if (file.size <= maxOriginalBytes) {
    return originalDataUrl;
  }

  const img = await loadImage(originalDataUrl);
  const size = fitWithin(img.width, img.height, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return originalDataUrl;
  }

  ctx.drawImage(img, 0, 0, size.width, size.height);

  let quality = 0.82;
  let compressed = canvas.toDataURL("image/jpeg", quality);

  while (estimateDataUrlBytes(compressed) > targetBytes && quality > 0.5) {
    quality -= 0.08;
    compressed = canvas.toDataURL("image/jpeg", quality);
  }

  return compressed;
}
