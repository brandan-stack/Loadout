// Tests for camera permission handling

import { requestCameraPermission, hasCameraSupport } from "@/lib/camera/permissions";

describe("Camera Permissions", () => {
  let originalMediaDevices: MediaDevices | undefined;

  beforeEach(() => {
    originalMediaDevices = global.navigator.mediaDevices;

    Object.defineProperty(global.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: jest.fn(() => [{ stop: jest.fn() }] as any),
        }),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(global.navigator, "mediaDevices", {
      configurable: true,
      value: originalMediaDevices,
    });
  });

  it("should report camera support when available", () => {
    expect(hasCameraSupport()).toBe(true);
  });

  it("should request camera permission successfully", async () => {
    const result = await requestCameraPermission();
    expect(result.state).toBe("granted");
  });
});
