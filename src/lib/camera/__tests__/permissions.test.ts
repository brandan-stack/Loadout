// Tests for camera permission handling

import { requestCameraPermission, hasCameraSupport } from "@/lib/camera/permissions";

describe("Camera Permissions", () => {
  beforeEach(() => {
    // Mock navigator.mediaDevices
    jest.spyOn(global.navigator, "mediaDevices", "get").mockReturnValue({
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: jest.fn(() => [
          { stop: jest.fn() as any },
        ] as any),
      } as any),
    } as any);
  });

  it("should report camera support when available", () => {
    expect(hasCameraSupport()).toBe(true);
  });

  it("should request camera permission successfully", async () => {
    const result = await requestCameraPermission();
    expect(result.state).toBe("granted");
  });
});
