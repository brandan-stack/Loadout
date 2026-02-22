# Network Access Guide

This guide explains how to access the Inventory App from mobile devices, tablets, and Android Auto.

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Find your local IP address:**
   - **macOS**: `ipconfig getifaddr en0`
   - **Linux**: `hostname -I`
   - **Windows**: `ipconfig` (look for IPv4 Address)

3. **Access from your device:**
   Open your browser and navigate to: `http://<YOUR_IP>:5173`
   
   Example: `http://192.168.1.100:5173`

## Network Setup by Device Type

### Mobile Devices & Tablets (Android, iPhone, iPad)

1. Ensure your mobile device is on the **same WiFi network** as your development machine
2. Open your mobile browser (Chrome, Safari, Firefox, etc.)
3. Enter the IP address and port: `http://<YOUR_IP>:5173`
4. The responsive design will automatically adapt to your device's screen size

**Tips:**
- Bookmark the page for quick access
- For physical devices, ensure WiFi is stable
- Test on both portrait and landscape orientations

### Android Auto

Android Auto allows you to use web apps on your vehicle's infotainment system.

1. **Enable Developer Options on your Android device:**
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back and open Developer Options
   - Enable "Enable ADB over Network" or "USB Debugging"

2. **Connect your Android device to the same WiFi as your development machine**

3. **Access via Android Auto:**
   - Some Android vehicles support web apps through Google Assistant or the native browser
   - Navigate to: `http://<YOUR_IP>:5173`

4. **For car infotainment systems:**
   - Check your vehicle's specific instructions for web app access
   - Some systems may require HTTPS (see Production Deployment below)

### Laptops & Desktops

1. Open a browser and navigate to: `http://<YOUR_IP>:5173`
2. Or access locally with: `http://localhost:5173`

## Production Deployment

For production use (especially with Android Auto), you'll need:

1. **HTTPS enabled** - Most Android Auto systems require HTTPS
2. **Valid domain name** - Android Auto may restrict localhost/IP-only access
3. **CORS configuration** - If accessing from cross-origin requests

### Suggested Production Setup:

```bash
# Build the app
npm run build

# Deploy to a server with:
- SSL/TLS certificate (HTTPS)
- Proper security headers
- CORS configuration if needed
```

Popular deployment options:
- **Vercel** - Free tier available, automatic HTTPS
- **Netlify** - Free tier with HTTPS
- **Firebase Hosting** - Easy setup with HTTPS
- **AWS Amplify** - Scalable with HTTPS
- **Your own server** - With Nginx/Apache and Let's Encrypt SSL

## Troubleshooting

### Can't connect from mobile device?
1. **Check WiFi**: Ensure both devices are on the same network
2. **Check firewall**: Your development machine's firewall might block port 5173
   - Windows Defender: Allow Vite through firewall
   - macOS: System Preferences > Security & Privacy > Firewall Options
3. **Check IP address**: Make sure you're using the correct local IP (not 127.0.0.1 or localhost)

### Port already in use?
The Vite config is set to auto-find the next available port. Check the terminal output for the actual port being used.

### Slow connection?
- Check your WiFi signal strength
- Reduce distance to your WiFi router
- Avoid interference from other devices
- For production, use a CDN for assets

### Android Auto not working?
- Verify HTTPS is enabled
- Check Android device's browser supports the app
- Some vehicles have apps that block web access
- Contact your vehicle manufacturer for compatibility

## Environment Variables

For production deployment, you might want to set environment-specific URLs:

Create a `.env` file:
```
VITE_API_URL=http://192.168.1.100:5173
VITE_ENV=development
```

Then use in your app:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Performance Tips

1. **Reduce asset size**: The app uses minimal dependencies (React + TypeScript only)
2. **Use production build**: `npm run build` creates optimized bundles
3. **Cache locally**: The app uses localStorage for data persistence
4. **Lazy load**: Consider code splitting for large feature additions
5. **Monitor network**: Check browser DevTools Network tab for slow assets

## Security Considerations

⚠️ **Important for Production:**

1. **HTTPS**: Always use HTTPS in production
2. **Authentication**: The app includes PIN-based authentication - keep PINs secure
3. **CORS**: Configure proper CORS headers
4. **User data**: Inventory data is stored in browser localStorage - consider backend sync
5. **API calls**: Configure API endpoints securely
6. **Firewall**: Don't expose the development server to the internet

## Support

For issues with network connectivity or device-specific problems, refer to:
- [Vite Documentation](https://vite.dev/)
- [React Documentation](https://react.dev/)
- Your device/vehicle manufacturer's support documentation
