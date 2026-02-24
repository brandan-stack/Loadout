# Loadout

**Loadout** - Clean, fast inventory management system designed for mobile devices (Android, iOS), tablets, laptops, and Android Auto. Keep your inventory organized on any device, anywhere.

## Features

- **Item Management**: Add, edit, and organize inventory items with part numbers, manufacturers, models, and serial numbers
- **Location Tracking**: Track inventory across multiple physical locations with hierarchical location trees
- **Stock Management**: Manage stock quantities with low-stock alerts and location-based tracking
- **Categories & Subcategories**: Organize items with customizable categories and subcategories
- **Search & Filters**: Quickly find items by name, part number, model, serial, or other attributes
- **Activity Logging**: Track all inventory changes and user actions
- **User Authentication**: PIN-protected access with role-based permissions (Admin, Stock, Invoicing, Viewer)
- **Photos**: Attach photos to items for visual identification
- **Job Management**: Create and manage inventory usage jobs with cost tracking
- **Responsive Design**: Optimized for mobile, tablet, and desktop displays
- **Native Apps**: Available on iOS App Store and Google Play Store

## Download

- 📱 **iOS**: [App Store Link - Coming Soon]
- 🤖 **Android**: [Google Play Store Link - Coming Soon]
- 💻 **Web**: `http://localhost:5173` (Development)

## Quick Start

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at:
- **Local**: `http://localhost:5173`
- **Mobile/Network**: `http://<your-computer-ip>:5173`

To access over network:
```bash
npm run dev:network
```

### Build

```bash

## Share Public Test URL (GitHub Pages)

This repo is configured to deploy to GitHub Pages automatically on every push to `main`.

Expected URL for this repository:

- `https://brandan-stack.github.io/Loadout/`

One-time setup in GitHub:

1. Go to **Settings → Pages** in your GitHub repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually in **Actions**).

After deploy completes, anyone with the URL can open and test the app.
npm run build
```

### Sync with Native Platforms

After building, sync changes to iOS and Android:

```bash
npm run sync          # Sync both platforms
npm run sync:ios      # Sync iOS only
npm run sync:android  # Sync Android only
```

## Mobile & Android Access

Access the web version on any device on your network:

1. Find your computer's IP address:
   - **macOS**: `ipconfig getifaddr en0`
   - **Linux**: `hostname -I`
   - **Windows**: `ipconfig` (look for IPv4 Address)

2. Open your mobile browser and navigate to: `http://<YOUR_IP>:5173`

**Example**: `http://192.168.1.100:5173`

## Native App Development

### iOS Development

Requirements:
- macOS with Xcode installed
- iOS deployment target: 14.0+
- Apple Developer account (for testing/distribution)

Build for iOS:
```bash
npm run build
npm run sync:ios
open ios/App/App.xcworkspace
```

### Android Development

Requirements:
- Android SDK installed
- JDK 11 or higher
- Google Play account (for distribution)

Build for Android:
```bash
npm run build
npm run sync:android
open android
```

Build APK for testing:
```bash
cd android
./gradlew build  # or ./gradlew.bat build on Windows
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Capacitor** - Native iOS/Android bridge
- **CSS** - Responsive styling for all device sizes

## Project Structure

```
src/
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Utilities and stores
├── assets/          # Static assets
├── App.tsx          # Main app component
├── index.css        # Global styles
└── theme.css        # Theme configuration

ios/                 # iOS native project
android/             # Android native project
public/              # Static assets
dist/                # Production build output
```

## App Store Submission

### iOS (Apple App Store)

1. Create an Apple Developer account
2. Generate signing certificates in Xcode
3. In Xcode:
   - Set bundle identifier to `com.brandan.loadout`
   - Set team/signing
   - Archive your app
   - Submit via App Store Connect
4. Complete app store metadata:
   - Screenshots (iPhone, iPad)
   - Description
   - Keywords
   - Privacy policy
   - Support URL

### Android (Google Play Store)

1. Create a Google Play Developer account
2. Generate a release keystore:
   ```bash
   keytool -genkey -v -keystore my-release-key.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
   ```
3. In Android Studio or build.gradle, configure signing
4. Build release APK or AAB:
   ```bash
   cd android
   ./gradlew app:bundleRelease
   ```
5. Submit to Play Console with:
   - APK/AAB file
   - Screenshots (various sizes)
   - Description
   - Privacy policy
   - Support URL

## Security & Testing

⚠️ **Important Security Notes:**

1. **PIN Authentication**: The app requires a PIN to access. Default testing PIN is `1234`
   - Change this before production deployment via settings
   - Admin account required to change security settings

2. **HTTPS & CORS**: For production:
   - Always use HTTPS
   - Configure proper CORS headers
   - Implement backend sync for data

3. **User Data**: 
   - Data is stored in browser localStorage
   - Consider implementing cloud sync for production
   - Review privacy policy for user data handling

4. **API Security**: 
   - Don't expose sensitive data in localStorage
   - Use secure authentication tokens
   - Validate all user inputs

## Testing on Devices

### iOS Device Testing

1. Connect iPhone to Mac via USB
2. Open iOS project in Xcode
3. Select device in Xcode
4. Click Build and Run
5. Trust developer certificate on device (Settings > General > VPN & Device Management)

### Android Device Testing

1. Enable USB Debugging on Android device
2. Connect via USB
3. Run:
   ```bash
   cd android
   ./gradlew installDebug
   ```
4. Or from Android Studio: Run > Run 'app'

## Documentation

- [Network Access Guide](NETWORK_ACCESS.md) - Detailed network setup
- [Capacitor iOS Guide](https://capacitorjs.com/docs/apis/ios)
- [Capacitor Android Guide](https://capacitorjs.com/docs/apis/android)
- [React Documentation](https://react.dev)

## License

This project is maintained by brandan-stack.

## Support

For issues, feature requests, or questions:
- Check the [NETWORK_ACCESS.md](NETWORK_ACCESS.md) guide
- Review Capacitor documentation
- Ensure PIN authentication is set correctly in Settings
