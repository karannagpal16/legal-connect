# Legal Connect Deployment Rules

## Web / Backend / Frontend Updates

Use this path for normal Legal Connect changes:

1. Codex updates the web app or backend.
2. Run `npm run build`.
3. Commit the changes.
4. Push to `main`.
5. Render deploys the latest code.
6. The installed Android app reflects the update after refresh, reopen, or the in-app update banner.

These changes do not need a new Google Play upload:

- Home page copy or layout
- Client / advocate / intern / admin portal UI
- Login / OTP web flow
- Legal SOS web flow
- Bookings, receipts, tasks, source library, LawBot web behavior
- Backend API changes on Render
- CSS/mobile responsiveness fixes

## Native Android Updates

Use this path only when native Android files change:

- App icon
- Splash screen
- Android permissions
- `AndroidManifest.xml`
- WebView settings
- Package name
- `versionCode` / `versionName`
- Native file picker / back button / external browser behavior

For native Android changes:

1. Increase `versionCode`.
2. Update `versionName` if needed.
3. Generate a new signed Android App Bundle (`.aab`).
4. Upload the new release to Google Play Console Internal Testing.

## Keystore Warning

- Never commit `.jks` keystore files.
- Never commit keystore passwords.
- Keep `legal-connect-upload-key.jks` backed up safely.
- Losing the upload key/password can block future Play Store updates.

## WebView Update Safety

The web app exposes `GET /api/app-version`.

The frontend checks this endpoint on load. If a newer `web_version` is detected, users see:

`Legal Connect has been updated. Tap to refresh.`

This refresh keeps the Android WebView current after Render deploys without logging out the user unnecessarily.

