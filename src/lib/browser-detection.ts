// src/lib/browser-detection.ts - Browser and device detection utilities

/**
 * Detects browser and OS information
 */
export function getBrowserInfo() {
  const ua = navigator.userAgent;

  return {
    isIOS: /iPad|iPhone|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    isChrome: /Chrome/.test(ua),
    isFirefox: /Firefox/.test(ua),
    isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
    isEdge: /Edg/.test(ua),
    isMobile: /Mobile/.test(ua),
    isTablet: /iPad/.test(ua),
    isDesktop: !(/Mobile|iPad|iPhone|Android/.test(ua)),
  };
}

/**
 * Gets camera support and constraints for current browser
 */
export function getCameraConstraints() {
  const info = getBrowserInfo();

  // iOS Safari (iPhone/iPad)
  if (info.isIOS && info.isSafari) {
    return {
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        // iOS specific
        aspectRatio: { ideal: 16 / 9 },
      },
      audio: false,
    };
  }

  // Android Chrome
  if (info.isAndroid && info.isChrome) {
    return {
      video: {
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };
  }

  // Desktop (Chrome, Firefox, Edge)
  return {
    video: {
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };
}

/**
 * Returns device-specific guidance for camera access
 */
export function getCameraAccessGuidance() {
  const info = getBrowserInfo();

  if (info.isIOS && info.isSafari) {
    return {
      title: "iPhone Camera Access",
      steps: [
        'Tap "Allow" when prompted to grant camera access',
        "If denied, go to Settings > [App Name] > Camera and enable",
        "Reload the page after enabling",
      ],
      note: "Camera must be enabled in app settings for barcode scanning to work",
    };
  }

  if (info.isAndroid && info.isChrome) {
    return {
      title: "Android Camera Access",
      steps: [
        'Tap "Allow" when prompted to grant camera access',
        'If denied, go to Settings > Apps > [App Name] > Permissions > Camera and enable',
        "Return to the app (Android may auto-refresh)",
      ],
      note: "Ensure good lighting for faster barcode detection",
    };
  }

  if (info.isDesktop) {
    return {
      title: "Desktop Camera Access",
      steps: [
        "Follow your browser's camera permission prompt",
        "If using an external camera, ensure it's properly connected",
        "For Chrome/Edge, check Settings > Privacy > Site Settings > Camera",
      ],
      note: "Desktop scanning works best with high-resolution webcams",
    };
  }

  return {
    title: "Camera Access",
    steps: ["Allow camera access when prompted"],
    note: "Camera scanning is not available on this device",
  };
}

/**
 * Checks if device meets minimum camera requirements
 */
export async function canUseCameraScanning(): Promise<{
  canUse: boolean;
  reason?: string;
}> {
  const info = getBrowserInfo();

  // Check if mediaDevices API is available
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      canUse: false,
      reason: "Camera API not supported on this device",
    };
  }

  // iPhone on older Safari versions
  if (info.isIOS && info.isSafari) {
    const version = parseInt(ua.match(/Version\/(\d+)/)?.[1] || "0");
    if (version < 16) {
      return {
        canUse: false,
        reason: "Requires iOS 16+ for camera scanning",
      };
    }
  }

  // Android on very old Chrome
  if (info.isAndroid && info.isChrome) {
    const version = parseInt(ua.match(/Chrome\/(\d+)/)?.[1] || "0");
    if (version < 80) {
      return {
        canUse: false,
        reason: "Requires Chrome 80+ for camera scanning",
      };
    }
  }

  return { canUse: true };
}

// Get UA for version checking
const ua = navigator.userAgent;
