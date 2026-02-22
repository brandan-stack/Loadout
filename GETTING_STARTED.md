# 🎯 Loadout - Getting Started

Welcome! Your **Loadout** inventory management app is now ready for iOS and Android app store submission.

## ✅ What's Been Set Up

### Native App Framework
- ✅ **Capacitor** - React to native iOS/Android bridge
- ✅ **iOS Project** (`ios/App/`) - Ready for Xcode development
- ✅ **Android Project** (`android/`) - Ready for Android Studio development
- ✅ **Configuration** - `capacitor.config.ts` with app metadata

### App Details
- **App Name**: Loadout
- **Package ID**: `com.brandan.loadout`
- **PIN Authentication**: Default `1234` (change in app Settings)
- **Minimum Versions**: iOS 14.0+, Android 26+

### Documentation
1. **[NATIVE_APP_QUICKSTART.md](NATIVE_APP_QUICKSTART.md)** ← **START HERE**
2. [IOS_ANDROID_DEVELOPMENT.md](IOS_ANDROID_DEVELOPMENT.md) - Detailed native development
3. [APP_STORE_GUIDE.md](APP_STORE_GUIDE.md) - App store submission steps
4. [NETWORK_ACCESS.md](NETWORK_ACCESS.md) - Web version access
5. [README.md](README.md) - Full project documentation

## 🚀 Quick Start (5 Minutes)

### 1. Build Web Assets
```bash
npm install
npm run build
```

### 2. Test Web Version
```bash
npm run dev
# Open http://localhost:5173
# Default PIN: 1234
```

### 3. Prepare for Native Development

**For iOS:**
```bash
npm run sync:ios
open ios/App/App.xcworkspace
# In Xcode: Product > Run (⌘R)
```

**For Android:**
```bash
npm run sync:android
open android
# In Android Studio: Run > Run 'app'
```

## 📚 Documentation Structure

```
Project Root
├── 🆕 NATIVE_APP_QUICKSTART.md      ← Start here!
├── 🆕 IOS_ANDROID_DEVELOPMENT.md    ← Development guide
├── 🆕 APP_STORE_GUIDE.md            ← App store submission
├── 🆕 NETWORK_ACCESS.md             ← Web access guide
├── README.md                        ← Full project info
├── 🆕 capacitor.config.ts           ← Capacitor config
├── ios/                             ← iOS native project
├── android/                         ← Android native project
├── src/                             ← React source
└── dist/                            ← Built web assets
```

## 🔄 Development Workflow

Every time you change the code:

```bash
# 1. Update web code in src/
# 2. Build
npm run build

# 3. Sync to native
npm run sync:ios          # iOS only
npm run sync:android      # Android only
# or
npm run sync               # Both

# 4. Run in native IDE
# Xcode: ⌘R
# Android Studio: Run 'app'
```

## 🎯 Key Files to Know

### Configuration
- `capacitor.config.ts` - Capacitor settings (app name, package ID, web directory)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

### Native Projects
- `ios/App/App.xcworkspace` - Xcode development file
- `android/app/build.gradle` - Android build configuration
- `android/build.gradle` - Root Android configuration

### Web Source
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utilities and data storage
- `src/App.tsx` - Main app component

### Build Output
- `dist/` - Built web assets (synced to native projects)

## 🔐 PIN Authentication

### For Development/Testing
- **Default PIN**: `1234`
- **Default Users**: Admin (1234), Stock (1111), Invoicing (2222), Viewer (no PIN)

### Before Submitting to App Stores
1. Launch the app
2. Enter PIN: `1234`
3. Go to Settings ⚙️
4. Change Admin PIN to something secure
5. Manage user roles and PINs

⚠️ **IMPORTANT**: Change the default PIN before submitting to app stores!

## 📋 Pre-Submission Checklist

Before submitting to Apple App Store or Google Play:

- [ ] Test on physical iOS device + iPad
- [ ] Test on multiple Android devices (different sizes)
- [ ] Verify PIN authentication works
- [ ] Test all inventory features (add, edit, search, filter)
- [ ] Check offline functionality
- [ ] Verify activity logging
- [ ] Test all user roles (Admin, Stock, Invoicing, Viewer)
- [ ] Change default PIN in Settings
- [ ] No console errors (`npm run build` checks this)
- [ ] Create app icons (1024x1024 minimum)
- [ ] Take screenshots for app stores
- [ ] Write app descriptions and privacy policy
- [ ] Test in landscape and portrait orientations

## 🎨 Icons & Assets

You'll need to create/provide:

### App Icons
- **1024x1024px** (Primary - used for marketing)
- Recommended: Use a professional icon
- Tools: Canva, Adobe Express, or hire a designer

### Screenshots
- **iOS**: At least 5 screenshots (2048x1536 or 1024x768)
- **Android**: At least 5 screenshots (1080x1920)
- Show: Adding items, searching, filtering, stock adjustments

### Icon Sources
- [App Icon Studio](https://www.appicon.co/)
- [IconKitchen](https://www.iconkitchen.com/)
- [Figma Apps](https://www.figma.com/community/explore)

Details in: [APP_STORE_GUIDE.md](APP_STORE_GUIDE.md#app-icons--assets)

## 🛠️ Prerequisites

### For iOS Development
- macOS (10.14+)
- Xcode 12+
- CocoaPods (`sudo gem install cocoapods`)

### For Android Development
- Android Studio
- Android SDK (API 30+)
- JDK 11+
- `ANDROID_HOME` environment variable set

## 🚀 Next Steps

1. **Read [NATIVE_APP_QUICKSTART.md](NATIVE_APP_QUICKSTART.md)**
   - Quick commands and common tasks

2. **Set up development environment:**
   - Install Xcode (for iOS)
   - Install Android Studio (for Android)

3. **Test locally:**
   - `npm run sync:ios` + Xcode
   - `npm run sync:android` + Android Studio

4. **Build app icons and screenshots**
   - See [APP_STORE_GUIDE.md](APP_STORE_GUIDE.md#app-icons--assets)

5. **Create app listings:**
   - [Apple App Store Connect](https://appstoreconnect.apple.com/)
   - [Google Play Console](https://play.google.com/console/)

6. **Submit for review:**
   - Follow guides in [APP_STORE_GUIDE.md](APP_STORE_GUIDE.md)

## 💡 Useful Commands

```bash
# Web development
npm run dev              # Local development server
npm run dev:network      # Access from mobile on network

# Building
npm run build            # Build web assets

# Native development
npm run sync             # Sync to iOS and Android
npm run sync:ios         # Sync iOS only
npm run sync:android     # Sync Android only

# Code quality
npm run lint             # Check for linting issues

# Testing
npm run preview          # Preview production build locally
npm run preview:network  # Preview over network
```

## 🐛 Troubleshooting

### App Won't Launch?
1. Check PIN is `1234`
2. Verify web assets synced: `npm run build && npm run sync`
3. Check browser console for errors

### Native App Won't Build?
- iOS: `cd ios/App && pod repo update && pod install`
- Android: `cd android && ./gradlew clean && ./gradlew build`

### Can't See Web Version?
```bash
npm run dev:network
# Check the "Network" URL printed in terminal
# Use that IP on mobile device
```

## 📞 Support Resources

- [Capacitor Documentation](https://capacitorjs.com/)
- [React Documentation](https://react.dev/)
- [Apple Developer Docs](https://developer.apple.com/documentation/)
- [Android Developer Docs](https://developer.android.com/docs)

## 📢 Important Security Notes

### Authentication
- The app uses PIN-based authentication
- Default test PIN: `1234`
- **Change this in Settings before submitting to app stores!**

### Data Protection
- Inventory data stored locally on device
- Consider implementing cloud sync for production
- No data leaves device by default
- Implement proper privacy policy

### App Store Requirements
- Include privacy policy URL
- Disclose data collection practices
- Update privacy policy with your practices

## 🎉 You're Ready!

Everything needed to build and submit **Loadout** to the app stores is set up and documented.

Next: Read [NATIVE_APP_QUICKSTART.md](NATIVE_APP_QUICKSTART.md) for specific commands!
