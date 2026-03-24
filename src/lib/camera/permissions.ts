// src/lib/camera/permissions.ts - Camera permission handling for iOS/Android/Desktop

export interface CameraPermissionStatus {
  state: "prompt" | "granted" | "denied";
  message: string;
}

export async function requestCameraPermission(): Promise<CameraPermissionStatus> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      state: "denied",
      message: "Camera not supported on this device",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    // Stop the stream immediately after getting permission
    stream.getTracks().forEach((track) => track.stop());

    return {
      state: "granted",
      message: "Camera access granted",
    };
  } catch (error) {
    const err = error as DOMException;
    if (err.name === "NotAllowedError") {
      return {
        state: "denied",
        message: "Camera permission denied by user",
      };
    }
    return {
      state: "prompt",
      message: `Camera error: ${err.message}`,
    };
  }
}

export function hasCameraSupport(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}
