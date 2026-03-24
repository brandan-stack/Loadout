// src/components/camera/scan-view.tsx - Reusable camera/scan UI component

"use client";

import { useRef, useState, useEffect } from "react";
import { requestCameraPermission, hasCameraSupport } from "@/lib/camera/permissions";
import { scanBarcodeFromVideo } from "@/lib/camera/barcode-scanner";
import { ScanActionPanel } from "./scan-action-panel";

interface ScanViewProps {
  onScan: (code: string, itemId: string, action: string) => void;
  onCancel: () => void;
}

export function ScanView({ onScan, onCancel }: ScanViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [permission, setPermission] = useState<"asking" | "granted" | "denied">(
    "asking"
  );
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState("");
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleRequestCamera = async () => {
    const result = await requestCameraPermission();
    if (result.state === "granted") {
      setPermission("granted");
      startCamera();
    } else {
      setPermission("denied");
      setError(result.message);
    }
  };

  const startCamera = async () => {
    if (!videoRef.current || !hasCameraSupport()) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      setScanning(true);
      startScanning();
    } catch (err) {
      setError("Failed to start camera");
    }
  };

  const startScanning = () => {
    if (!videoRef.current) return;

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !videoRef.current.readyState) return;

      try {
        const result = await scanBarcodeFromVideo(videoRef.current);
        if (result) {
          setScannedBarcode(result.code);
          setScanning(false);
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
        }
      } catch (err) {
        // Continue scanning
      }
    }, 300);
  };

  useEffect(() => {
    const videoElement = videoRef.current;

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      const stream = videoElement?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      setScannedBarcode(manualInput.trim());
      setManualInput("");
    }
  };

  // If barcode was scanned, show action panel
  if (scannedBarcode) {
    return (
      <ScanActionPanel
        barcode={scannedBarcode}
        onDismiss={() => {
          setScannedBarcode(null);
          setScanning(true);
          startScanning();
        }}
        onSuccess={(itemId, action) => {
          onScan(scannedBarcode, itemId, action);
        }}
      />
    );
  }

  return (
    <div className="glass-bubble p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Scan Item</h2>

      {!hasCameraSupport() ? (
        <div className="text-center p-4 bg-amber-50 rounded-lg mb-4">
          <p className="text-amber-900">
            Camera not supported on this device
          </p>
        </div>
      ) : null}

      {permission === "asking" && (
        <div className="text-center mb-4">
          <p className="text-gray-700 mb-4">
            Camera access needed to scan barcodes
          </p>
          <button
            onClick={handleRequestCamera}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Allow Camera Access
          </button>
        </div>
      )}

      {permission === "granted" && (
        <div className="mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg bg-black"
            style={{ aspectRatio: "9/12" }}
          />
          {scanning && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              Scanning...
            </p>
          )}
        </div>
      )}

      {permission === "denied" && (
        <div className="bg-red-50 p-4 rounded-lg mb-4 text-red-900">
          <p>{error}</p>
        </div>
      )}

      {/* Manual barcode entry fallback */}
      <form onSubmit={handleManualSubmit} className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-700">
          Or enter barcode manually:
        </label>
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="SKU-000001"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="w-full mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Search
        </button>
      </form>

      <button
        onClick={onCancel}
        className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
      >
        Cancel
      </button>
    </div>
  );
}
