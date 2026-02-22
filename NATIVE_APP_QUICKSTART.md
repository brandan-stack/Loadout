# Loadout - App Development Quick Start

Welcome to **Loadout** native app development! This guide will get you up and running with iOS and Android builds.

## 📋 Quick Overview

- **App Name**: Loadout
- **Package ID**: `com.brandan.loadout`
- **Authentication**: PIN-based (default: `1234`)
- **Platforms**: iOS 14.0+, Android 26+
- **Framework**: Capacitor + React

## 🚀 Getting Started

### 1. Build the Web App

```bash
npm install
npm run build
```

### 2. Generate Native Projects

Already done! You now have:
- `ios/App/` - iOS native project
- `android/` - Android native project

### 3. Sync Changes

Whenever you update the web code:

```bash
npm run build
npm run sync           # Syncs to both iOS and Android
# or
npm run sync:ios      # iOS only
npm run sync:android  # Android only
```

## 🍎 iOS Development

### Prerequisites

```bash
# Check Xcode installation
xcode-select --install

# Verify CocoaPods
pod --version
```

### Quick Start

```bash
# Sync and open in Xcode
npm run sync:ios
open ios/App/App.xcworkspace
```

Then:
1. Select target device/simulator
2. Press ⌘R to run
3. View logs in Debug area (⌘⇧Y)

**Testing on Device:**
- Connect iPhone via USB
- Trust computer on device
- Select device in Xcode
- Press ⌘R

[Full iOS Guide →](IOS_ANDROID_DEVELOPMENT.md#ios-development)

## 🤖 Android Development

### Prerequisites

```bash
# Install Android SDK tools via Android Studio
# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Library/Android/sdk

# Verify JDK
java -version  # Should be 11+
```

### Quick Start

```bash
# Sync and open in Android Studio
npm run sync:android
open android
```

Then:
1. Create or start Android emulator
2. Click Run 'app' (green play button)
3. View logs in Logcat

**Testing on Device:**
- Enable USB Debugging on Android device
- Connect via USB
- Run app from Android Studio

[Full Android Guide →](IOS_ANDROID_DEVELOPMENT.md#android-development)

## 🔐 PIN Authentication

### Default PIN for Testing
```
PIN: 1234
```

### Change PIN for Production

1. Launch app
2. Tap Settings ⚙️
3. Scroll to "Security"
4. Tap "Change Admin PIN"
5. Enter new PIN (remember it!)

## 📦 Building for Distribution

### iOS App Store

```bash
npm run build
npm run sync:ios

# In Xcode:
# Product > Archive
# Select Distribute App > App Store Connect
# Follow upload prompts
```

[Full iOS Submission →](APP_STORE_GUIDE.md#ios-app-store-submission)

### Android Google Play

```bash
cd android
./gradlew bundleRelease
# Upload app-release.aab to Google Play Console
```

[Full Android Submission →](APP_STORE_GUIDE.md#android-google-play-store-submission)

## 📱 Testing Checklist

Before submitting:

- [ ] Test on iPhone and iPad (different sizes)
- [ ] Test on multiple Android devices
- [ ] Verify PIN authentication works (default: 1234)
- [ ] Test adding/editing inventory items
- [ ] Test search and filtering
- [ ] Check landscape and portrait orientations
- [ ] Verify offline functionality
- [ ] Check data persistence
- [ ] Test all role-based permissions (Admin, Stock, Invoicing, Viewer)
- [ ] Test low-stock alerts
- [ ] Verify activity logging

## 🛠️ Common Commands

```bash
# Development
npm run dev                # Web dev server
npm run dev:network        # Web on network

# Building
npm run build              # Build web assets
npm run sync               # Sync to both platforms
npm run sync:ios           # Sync iOS only
npm run sync:android       # Sync Android only

# Linting
npm run lint              # Check code quality
```

## 📚 Documentation

- **[APP_STORE_GUIDE.md](APP_STORE_GUIDE.md)** - App Store & Play Store submission
- **[IOS_ANDROID_DEVELOPMENT.md](IOS_ANDROID_DEVELOPMENT.md)** - Native development details
- **[NETWORK_ACCESS.md](NETWORK_ACCESS.md)** - Web access from mobile devices
- **[README.md](README.md)** - Full project documentation

## 🐛 Troubleshooting

### iOS

**Xcode won't build?**
```bash
cd ios/App
pod repo update
pod install
```

**Device not recognized?**
- Unplug and reconnect
- Restart Xcode
- Try different USB cable

### Android

**Gradle build failing?**
```bash
cd android
./gradlew clean
./gradlew build
```

**Emulator slow?**
- Assign more RAM in emulator settings
- Enable hardware acceleration
- Use newer API level (30+)

## 💡 Development Tips

1. **Hot Reload**: Changes to React code auto-reload on connected device
2. **USB Debugging**: Keep enabled on Android for faster iterations
3. **Simulator**: iOS simulator is faster but test on real device before release
4. **Network Access**: Use `npm run sync:ios` or `npm run sync:android` only after building web
5. **Settings**: The app's Settings screen is where you change PIN and manage users

## 🔑 Key Features for Testing

- ✅ Multi-location inventory tracking
- ✅ Low-stock alerting
- ✅ Photo attachment to items
- ✅ Role-based access control
- ✅ Activity logging
- ✅ PIN-protected security
- ✅ Full offline support
- ✅ Responsive UI on all screen sizes

## 📞 Support

- Check device logs for errors
- Review browser console (Chrome DevTools)
- Ensure web version works: `npm run dev`
- Verify Android/iOS prerequisites are installed

## Next Steps

1. **Set up your environment:**
   - iOS: Install Xcode
   - Android: Install Android Studio

2. **Test locally:**
   - `npm run sync:ios` + Xcode
   - `npm run sync:android` + Android Studio

3. **Prepare for app stores:**
   - Read [APP_STORE_GUIDE.md](APP_STORE_GUIDE.md)
   - Create app listings
   - Generate screenshots and icons

4. **Submit for review:**
   - Follow submission guides for each platform
   - Test thoroughly before submitting
   - Monitor for approval/rejection feedback

Good luck with Loadout! 🚀
