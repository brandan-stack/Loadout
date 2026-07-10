// Allow CSS side-effect imports (e.g. import "./globals.css" in layout.tsx)
declare module "*.css" {}

type BarcodeFormat =
	| "aztec"
	| "code_128"
	| "code_39"
	| "code_93"
	| "codabar"
	| "data_matrix"
	| "ean_13"
	| "ean_8"
	| "itf"
	| "pdf417"
	| "qr_code"
	| "upc_a"
	| "upc_e"
	| "unknown";

interface DetectedBarcode {
	rawValue?: string;
	format?: BarcodeFormat;
}

interface BarcodeDetector {
	detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

declare var BarcodeDetector: {
	prototype: BarcodeDetector;
	new (options?: { formats?: BarcodeFormat[] }): BarcodeDetector;
};
