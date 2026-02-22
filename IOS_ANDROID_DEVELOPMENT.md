# iOS & Android Native Development Guide

Complete guide to developing, testing, and building Loadout for iOS and Android.

## Initial Setup

### Sync Web Assets

After making changes to the web code, sync to native platforms:

```bash
npm run build
npm run sync
```

This updates:
- `ios/App/App/public/` (web assets)
- `android/app/src/main/assets/public/` (web assets)

## iOS Development

### Prerequisites

- **macOS** (10.14 or higher)
- **Xcode** 12 or later
  - Install from App Store or https://developer.apple.com/download/
- **CocoaPods** (usually comes with Xcode)
  ```bash
  sudo gem install cocoapods
  ```
- **iOS Deployment Target**: 14.0+

### Setup

1. Sync the web assets:
   ```bash
   npm run sync:ios
   ```

2. Open the iOS project:
   ```bash
   open ios/App/App.xcworkspace
   ```
   **Note**: Always open `.xcworkspace`, not `.xcodeproj`

3. In Xcode, select your Mac or connected device in the scheme selector (top left)

### Running on Simulator

1. In Xcode: Product > Destination > Simulator (choose device)
2. Product > Run (⌘R)
3. App launches in simulator, auto-reload enabled

### Running on Physical Device

1. Connect iPhone via USB
2. Trust the computer on device
3. In Xcode, select device from scheme selector
4. Product > Run (⌘R)
5. App installs and launches

### Building for Distribution

#### Build for Testing:

```bash
# Archive for testing (internal/external testing)
Product > Archive
Organizer > Distribute App > Ad Hoc
Select export method and signing certificates
```

#### Build for App Store:

```bash
# Archive for App Store review
Product > Archive
Organizer > Distribute App > App Store Connect
Follow prompts, upload to App Store Connect
```

### Debugging

- **View Logs**: View > Debug Area (⌘⇧Y)
- **Break on Exceptions**: Debug > Breakpoints > Create Exception Breakpoint
- **Safari Developer Tools**: 
  - On device: Develop > [Device Name] > App
  - Inspect web content and JavaScript

### Signing Certificates

#### Automatic Signing (Easiest)

1. Xcode > Preferences > Accounts
2. Add Apple ID if needed
3. Select project > Signing & Capabilities
4. Check "Automatically manage signing"
5. Select Team from dropdown

#### Manual Signing

1. Go to https://developer.apple.com/account/
2. Certificates, Identifiers & Profiles
3. Create certificate matching your bundle ID
4. Download and install certificate
5. Configure in Xcode manually

### Common Issues

**"Unable to locate the executable"**
- Clean build folder: Shift+⌘K
- Rebuild: ⌘B

**"Code signing identity not found"**
- Fix: Go to Signing & Capabilities > Re-select Team

**"App not showing home screen"**
- Check: Console for JavaScript errors
- Verify: `capacitor.config.ts` has correct `webDir: 'dist'`

## Android Development

### Prerequisites

- **Android SDK** 
  - Android Studio (recommended)
  - Download from: https://developer.android.com/studio
- **JDK 11+**
  ```bash
  java -version
  ```
- **ANDROID_HOME** environment variable set
  - macOS/Linux:
    ```bash
    export ANDROID_HOME=$HOME/Library/Android/sdk
    export PATH=$PATH:$ANDROID_HOME/emulator
    export PATH=$PATH:$ANDROID_HOME/tools
    export PATH=$PATH:$ANDROID_HOME/tools/bin
    ```

### Setup

1. Install Android SDK components (via Android Studio):
   - Android SDK Platform 30+
   - Android Virtual Device (Emulator)
   - Build Tools 33+

2. Sync web assets:
   ```bash
   npm run sync:android
   ```

3. Open Android project:
   ```bash
   open android
   ```
   Or in Android Studio: File > Open > Select `android` folder

### Running on Emulator

1. Create virtual device:
   - Android Studio > Device Manager
   - Create new device (Pixel 4/5/6 recommended)
   - Select API 30+ (minimum 26)

2. Start emulator:
   ```bash
   # List available devices
   emulator -list-avds
   
   # Start device
   emulator -avd <device_name>
   ```

3. Run app:
   ```bash
   cd android
   ./gradlew installDebug
   ```
   Or in Android Studio: Run > Run 'app'

### Running on Physical Device

1. **Enable USB Debugging:**
   - Settings > About Phone > Build Number (tap 7x)
   - Settings > Developer Options > USB Debugging (on)
   - Connect via USB

2. **Build & Install:**
   ```bash
   cd android
   ./gradlew installDebug
   ```

3. **Launch:** App appears in home screen

### Building for Release

```bash
# Build signed APK for testing
cd android
./gradlew assembleRelease

# Build signed AAB for Play Store (recommended)
./gradlew bundleRelease
```

Outputs:
- APK: `app/build/outputs/apk/release/app-release.apk`
- AAB: `app/build/outputs/bundle/release/app-release.aab`

### Debugging

#### Logcat (View Logs)

```bash
# View all logs
adb logcat

# Filter by app tag
adb logcat | grep "CapacitorIonicApp"

# In Android Studio: View > Tool Windows > Logcat
```

#### Chrome DevTools

```bash
# Connect device/emulator via adb
# Then navigate to chrome://inspect/#devices
# Click "Inspect" on your app
```

#### Debugging APK

```bash
# Build debug APK with debugging
cd android
./gradlew installDebug
```

### Signing Configuration

Create `android/release-keys.gradle`:

```gradle
ext.key = [
    keystorePath: file('/path/to/my-release-key.keystore'),
    keystorePassword: 'your-keystore-password',
    keyAlias: 'my-key-alias',
    keyAliasPassword: 'your-key-password'
]
```

Then in `build.gradle`:

```gradle
signingConfigs {
    release {
        storeFile ext.key['keystorePath']
        storePassword ext.key['keystorePassword']
        keyAlias ext.key['keyAlias']
        keyPassword ext.key['keyAliasPassword']
    }
}
```

### Common Issues

**"Gradle build failed"**
- Run: `./gradlew clean`
- Then: `./gradlew build`

**"Emulator not starting"**
- Increase allocated RAM in emulator settings
- Check AVD configuration

**"Device not detected"**
```bash
# Restart adb
adb kill-server
adb start-server

# List devices
adb devices
```

**"Permission denied" (macOS/Linux)**
```bash
chmod +x android/gradlew
```

## Testing Guide

### Manual Testing

1. **Launch app** - PIN authentication screen appears
2. **Enter default PIN** - `1234` (change in settings for production!)
3. **Navigate features:**
   - Add inventory items
   - Search and filter
   - Test stock adjustments
   - Verify activity logging
4. **Test on different screen sizes:**
   - Small phones (5")
   - Medium phones (6")
   - Tablets (7-12")
   - Landscape orientation

### Automated Testing

Setup Jest for React component tests:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

Create test file `src/components/__tests__/InventoryScreen.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import InventoryScreen from '../InventoryScreen';

describe('InventoryScreen', () => {
  it('renders inventory header', () => {
    render(<InventoryScreen />);
    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });
});
```

### Performance Testing

- iOS: Xcode > Product > Profile > Instruments
- Android: Android Studio > Profiler > CPU/Memory/Network
- Check for:
  - Memory leaks
  - Slow frames (target 60 FPS)
  - Excessive re-renders

## Deployment

### iOS App Store

See [APP_STORE_GUIDE.md](APP_STORE_GUIDE.md) - iOS section

### Google Play Store

See [APP_STORE_GUIDE.md](APP_STORE_GUIDE.md) - Android section

## Version Management

Update version in `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brandan.loadout',
  appName: 'Loadout',
  webDir: 'dist'
};

export default config;
```

Then update in native projects:
- **iOS**: In Xcode, General tab > Version, Build
- **Android**: In `android/app/build.gradle` > `versionCode`, `versionName`

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/apis/ios)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/apis/android)
- [Xcode Documentation](https://developer.apple.com/xcode/)
- [Android Studio Guide](https://developer.android.com/studio)
- [Firebase for iOS](https://firebase.google.com/docs/ios/setup)
- [Firebase for Android](https://firebase.google.com/docs/android/setup)
