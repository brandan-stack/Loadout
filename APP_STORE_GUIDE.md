# Loadout App Store Submission Guide

Complete instructions for submitting Loadout to Apple App Store and Google Play Store.

## Pre-Submission Checklist

- [ ] App name: "Loadout"
- [ ] Package ID: `com.brandan.loadout`
- [ ] Version number updated
- [ ] App icons created (1024x1024px minimum)
- [ ] Screenshots taken for both platforms
- [ ] Privacy policy drafted
- [ ] Support/contact information ready
- [ ] Test on real devices
- [ ] PIN authentication tested (default: 1234)
- [ ] No console errors in production build

## App Icons & Assets

### Create Icons

You'll need the following icon sizes:

**iOS Icons:**
- 1024x1024px (App Store)
- 180x180px (iPhone)
- 120x120px (iPhone notification)
- 167x167px (iPad Pro)

**Android Icons:**
- 512x512px (Google Play Store)
- 192x192px (xxxhdpi)
- 144x144px (xxhdpi)
- 96x96px (xhdpi)
- 72x72px (hdpi)
- 48x48px (mdpi)

### Generate Icons with Online Tools

Use these free tools to create icons:
- **Icon Generator**: https://www.img2go.com/resize-image
- **App Icon Generator**: https://www.appicon.co/
- **Capacitor Assets**: https://capacitorjs.com/docs/guides/splash-screens-and-icons

### Placing Icons

**iOS:**
1. Open `ios/App/App/Assets.xcassets` in Xcode
2. Create an "AppIcon" image set
3. Drag icons to appropriate slots

**Android:**
1. Place icons in `android/app/src/main/res/mipmap-*/`
   - mipmap-xxxhdpi: 512x512
   - mipmap-xxhdpi: 384x384
   - mipmap-xhdpi: 192x192
   - mipmap-hdpi: 144x144
   - mipmap-mdpi: 96x96

## iOS App Store Submission

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com/
   - Accept latest agreements

2. **Create App ID**
   - Go to Certificates, Identifiers & Profiles
   - Create new App ID with identifier: `com.brandan.loadout`
   - Enable necessary capabilities (if needed)

### Step 1: Prepare Signing Assets

```bash
# In Xcode, go to Signing & Capabilities
# Select your Team
# Let Xcode auto-sign
```

### Step 2: Update App Store Info

In Xcode, update in General tab:
- **Bundle Identifier**: `com.brandan.loadout`
- **Version**: `1.0.0`
- **Build**: `1`
- **Deployment Target**: iOS 14.0+

### Step 3: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com/
2. Click "My Apps" > "+"
3. Select "New App"
4. **Platform**: iOS
5. **Name**: "Loadout"
6. **Primary Language**: English
7. **Bundle ID**: `com.brandan.loadout`
8. **SKU**: `com.brandan.loadout` (can be anything unique)
9. **Access**: Configure pricing and availability

### Step 4: Fill in App Information

**Pricing & Availability:**
- Set price (Free or Paid)
- Select countries/regions

**General Information:**
- Category: Productivity or Business
- Subtitle: "Smart Inventory Management"
- Description (up to 4000 characters):
  ```
  Loadout is a clean, fast inventory management system designed for mobile devices and laptops. Keep your inventory organized on any device, anywhere.
  
  Features:
  - Item management with photos
  - Multi-location tracking
  - Low-stock alerts
  - Activity logging
  - PIN-protected access
  - Role-based permissions
  - Search and filtering
  ```
- Keywords: inventory, management, tracking, organization, loadout
- Copyright: Brandan Stack
- Privacy Policy URL: `https://yoursite.com/privacy`
- Support URL: `https://yoursite.com/support`

**App Icon & Screenshots:**
- Upload 1024x1024 icon
- Take screenshots on iPhone and iPad Pro
- Each screenshot should be 2048x1536 or 1024x768
- Aim for 5-7 screenshots showing key features
- Add text overlays to explain features

**Version Release Notes:**
```
Version 1.0 - Initial Release

- Clean, fast inventory management system
- Multi-device sync (iOS, Android, Web)
- PIN-protected authentication
- Item tracking with photos
- Location-based stock management
- Low-stock alerts and notifications
```

### Step 5: Review & Submit

1. Complete all sections (checkmarks should appear)
2. Click "Submit for Review"
3. Select Phased Release (optional)
4. Apple will review (typically 24-48 hours)
5. Once approved, app goes live

### Step 6: Build & Upload

In Xcode:
```
Product > Archive
Organizer window appears > Distribute App
Select "App Store" > Upload
Follow prompts
```

Or via command line:
```bash
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \
  -derivedDataPath build archive -archivePath build/App.xcarchive
```

## Android Google Play Store Submission

### Prerequisites

1. **Google Play Account** ($25 one-time)
   - Sign up at https://console.cloud.google.com/
   - Create Play Developer account

2. **Release Keystore**
   ```bash
   keytool -genkey -v -keystore ./my-release-key.keystore -keyalg RSA \
     -keysize 2048 -validity 10000 -alias my-key-alias
   ```
   Save this keystore securely!

### Step 1: Configure Signing

In `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('path/to/my-release-key.keystore')
            storePassword 'your-store-password'
            keyAlias 'my-key-alias'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### Step 2: Build Release Bundle

```bash
cd android
./gradlew bundleRelease
```

Bundle will be at: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 3: Create App in Google Play Console

1. Go to https://play.google.com/console/
2. Click "Create app"
3. Enter name: "Loadout"
4. Select "Apps" as app type
5. Select "Free" or "Paid"

### Step 4: Fill in App Details

**Basic Details:**
- **App Title**: Loadout
- **Short Description** (80 chars):
  "Smart inventory management for any device"
- **Full Description** (4000 chars):
  ```
  Loadout is a clean, fast inventory management system designed for mobile devices and laptops. Keep your inventory organized on any device, anywhere.
  
  KEY FEATURES:
  - Item Management: Add, edit, and organize with part numbers, manufacturers, and serial numbers
  - Multi-Location Tracking: Track inventory across multiple locations
  - Stock Management: Manage quantities with low-stock alerts
  - Customizable Categories: Organize items your way
  - Search & Filters: Find items instantly
  - Activity Logging: Track all changes
  - PIN-Protected: Secure with authentication
  - Photo Support: Attach photos to items
  - Role-Based Access: Admin, Stock, Invoicing, Viewer roles
  - Responsive Design: Works on phones, tablets, and laptops
  
  PERFECT FOR:
  - Small business inventory
  - Warehouse management
  - Equipment tracking
  - Supply management
  - Field inventory
  
  PIN authentication ensures your inventory data stays secure. Default test PIN is 1234 - change this in Settings before production use.
  ```

**Category & Content Rating:**
- Primary category: Productivity or Business
- Content rating: Complete questionnaire

**Uploading Assets:**

Upload icon:
- 512x512px PNG (High quality)

Upload screenshots (at least 2-8 per orientation):
- Phone: 1080x1920 or 1440x2560 pixels
- Tablet: 1200x1824 pixels
- Show multiple features
- Add text/graphics explaining features

Optional: Upload video preview

### Step 5: Testing & Release

**Before Release:**
1. Add testers via "Internal Testing" track
2. Get feedback
3. Fix any issues
4. Increment version number

**Release Tracks:**
- **Internal Testing**: For your team
- **Closed Testing**: Limited user group
- **Open Testing**: Public beta
- **Production**: Live for everyone

### Step 6: Submit for Review

1. Upload APK/AAB to Production track
2. Fill in release notes (max 500 chars):
   ```
   Version 1.0 - Initial Release
   
   - Inventory management system
   - Multi-device sync
   - PIN-protected access
   - Offline support
   ```
3. Review pricing in each country
4. Submit for review
5. Google reviews typically complete in 2-7 days

## Post-Launch

### Monitoring

- Monitor crashes in App Store Connect / Play Console
- Check user reviews and ratings
- Address reported issues quickly
- Update at least monthly with improvements

### Updates

To release an update:
1. Increment version number in `capacitor.config.ts`
2. `npm run build`
3. `npm run sync`
4. Follow the build/submission steps above with new version

### Privacy & Legal

- Maintain updated privacy policy
- Keep support contact current
- Monitor and respond to reviews
- Comply with app store policies

## Troubleshooting

### iOS Issues

**"Provisioning profile not found"**
- Go to Xcode > Preferences > Accounts
- Click "Manage Certificates"
- Create new certificate

**"Failed to notarize"**
- Update Xcode and macOS
- Ensure 2FA is enabled

### Android Issues

**"Signature invalid"**
- Verify keystore path and passwords
- Regenerate signing config

**"App size too large"**
- Use App Bundle (AAB) format instead of APK
- Enable minification in build.gradle

## Resources

- [Apple App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)
- [Capacitor Deployment Guide](https://capacitorjs.com/docs/guides/deploying-to-app-stores)
- [iOS App Distribution](https://developer.apple.com/app-store/review/guidelines/)
- [Android App Policies](https://play.google.com/about/privacy-security-deception/deceptive-behavior/)
