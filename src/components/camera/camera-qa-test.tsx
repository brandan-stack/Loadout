// src/components/camera/camera-qa-test.tsx - QA test component for camera functionality

"use client";

import { useState, useRef, useEffect } from "react";
import {
  getBrowserInfo,
  getCameraConstraints,
  getCameraAccessGuidance,
  canUseCameraScanning,
} from "@/lib/browser-detection";
import { hasCameraSupport, requestCameraPermission } from "@/lib/camera/permissions";
import { scanBarcodeFromVideo } from "@/lib/camera/barcode-scanner";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function CameraQATest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [currentTest, setCurrentTest] = useState("");
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof getBrowserInfo> | null>(null);

  useEffect(() => {
    setBrowserInfo(getBrowserInfo());
  }, []);

  const runQATests = async () => {
    setTesting(true);
    const testResults: TestResult[] = [];

    // Test 1: Browser detection
    setCurrentTest("Browser Detection");
    const info = getBrowserInfo();
    testResults.push({
      name: "Browser Detection",
      passed: !!info,
      message: `Detected: ${info.isIOS ? "iOS" : ""}${info.isAndroid ? "Android" : ""}${
        info.isDesktop ? "Desktop" : ""
      } ${info.isChrome ? "Chrome" : ""}${info.isSafari ? "Safari" : ""}${
        info.isFirefox ? "Firefox" : ""
      }`.trim() || "Browser detected",
    });

    // Test 2: Camera API availability
    setCurrentTest("Camera API Support");
    const apiAvailable = !!navigator.mediaDevices?.getUserMedia;
    testResults.push({
      name: "Camera API Availability",
      passed: apiAvailable,
      message: apiAvailable ? "getUserMedia API available" : "Camera API not supported",
    });

    // Test 3: Camera support check
    setCurrentTest("Device Camera Support");
    const cameraSupportCheck = await canUseCameraScanning();
    testResults.push({
      name: "Camera Scanning Eligibility",
      passed: cameraSupportCheck.canUse,
      message: cameraSupportCheck.reason || "Device supports camera scanning",
    });

    // Test 4: Camera permission request
    setCurrentTest("Camera Permission");
    const permResult = await requestCameraPermission();
    testResults.push({
      name: "Camera Permission Request",
      passed: permResult.state === "granted" || permResult.state === "prompt",
      message: `Permission state: ${permResult.state}`,
    });

    // Test 5: Video stream
    setCurrentTest("Video Stream");
    let videoStreamOK = false;
    try {
      if (permResult.state === "granted") {
        const constraints = getCameraConstraints();
        const stream = await navigator.mediaDevices.getUserMedia(constraints as any);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = resolve;
            }
          });
          videoStreamOK = true;
          // Stop stream
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    } catch (err) {
      console.error("Stream test error:", err);
    }
    testResults.push({
      name: "Video Stream Initialization",
      passed: videoStreamOK,
      message: videoStreamOK ? "Video stream started successfully" : "Could not start video stream",
    });

    // Test 6: Canvas support (for barcode scanning)
    setCurrentTest("Canvas/Barcode Support");
    const canvasSupported = !!document.createElement("canvas").getContext("2d");
    testResults.push({
      name: "Canvas API (Barcode Detection)",
      passed: canvasSupported,
      message: canvasSupported
        ? "Canvas 2D context available for barcode scanning"
        : "Canvas API not available",
    });

    setResults(testResults);
    setCurrentTest("");
    setTesting(false);
  };

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Camera Scanning QA Test</h1>
        {browserInfo && (
          <p className="text-sm text-gray-600">
            {browserInfo.isIOS && "iPhone/iPad"}
            {browserInfo.isAndroid && "Android"}
            {browserInfo.isDesktop && "Desktop"} -{" "}
            {browserInfo.isChrome && "Chrome"}
            {browserInfo.isSafari && "Safari"}
            {browserInfo.isFirefox && "Firefox"}
          </p>
        )}
      </div>

      <GlassBubbleCard className="mb-6">
        <button
          onClick={runQATests}
          disabled={testing}
          className="w-full px-4 py-2 text-white rounded disabled:bg-gray-400"
          style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
        >
          {testing ? `Running: ${currentTest}...` : "Run QA Tests"}
        </button>

        {results.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center mb-4 p-3 bg-gray-100 rounded">
              <span className="font-semibold">Test Results</span>
              <span
                className={`text-lg font-bold ${
                  passedCount === totalCount ? "text-slate-100" : "text-amber-600"
                }`}
              >
                {passedCount}/{totalCount} passed
              </span>
            </div>

            {results.map((result) => (
              <div
                key={result.name}
                className={`p-3 rounded border-l-4 ${
                  result.passed
                    ? "bg-slate-900/70 border-slate-400"
                    : "bg-red-50 border-red-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.name}</span>
                  <span className={result.passed ? "text-slate-100" : "text-red-600"}>
                    {result.passed ? "✓" : "✗"}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{result.message}</p>
              </div>
            ))}
          </div>
        )}
      </GlassBubbleCard>

      {browserInfo && (
        <GlassBubbleCard>
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              {getCameraAccessGuidance().title}
            </h3>
            <ol className="list-decimal list-inside space-y-2">
              {getCameraAccessGuidance().steps.map((step, idx) => (
                <li key={idx} className="text-sm text-gray-700">
                  {step}
                </li>
              ))}
            </ol>
            <p className="text-xs text-gray-600 italic bg-blue-50 p-2 rounded">
              {getCameraAccessGuidance().note}
            </p>
          </div>
        </GlassBubbleCard>
      )}

      <video ref={videoRef} style={{ display: "none" }} />
    </div>
  );
}
