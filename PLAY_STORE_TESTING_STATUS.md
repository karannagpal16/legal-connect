# Legal Connect Play Store Internal Testing Status

Date: 2026-07-10

## Current Status

- Android Internal Testing is active in Google Play Console.
- A signed AAB has already been uploaded for Internal Testing.
- Installed Android app is a WebView wrapper that loads `https://www.legal-connect.in`.
- Normal web, frontend, backend, Render, database, receipt, LawBot, and admin updates should appear after web deploy and app refresh/reopen.

## Tester Steps

1. Add tester Gmail addresses manually in Play Console.
2. Share the Internal Testing opt-in link from Play Console.
3. Ask testers to install the app from the Play Store testing page.
4. Ask testers to refresh/reopen the app after each Render deploy if they do not see the newest web version.

## Web Changes

For web/backend/frontend changes:

1. Codex edits the app.
2. Run `npm run build`.
3. Commit changes.
4. Push to `main`.
5. Render deploys.
6. Installed Android app reflects the web changes after refresh/reopen.

No new Android AAB is required for normal web changes.

## Native Android Changes

Native Android changes include:

- App icon
- Splash resources
- Android permissions
- AndroidManifest
- WebView native settings
- Package name
- `versionCode`
- `versionName`

For native Android changes:

1. Increase `versionCode`.
2. Keep the package name unchanged: `in.legalconnect.app`.
3. Generate a new signed AAB.
4. Upload a new Internal Testing release in Play Console.
5. Test install/update before wider rollout.

## Keystore Warning

- Never commit `.jks` files.
- Never commit `local.properties`.
- Never commit `android/.idea`.
- Never delete `legal-connect-upload-key.jks`.
- Never forget the keystore password.
- Keep the keystore backed up offline.

## Current AAB Need

Android AAB not required for the current beta web/backend cleanup. AAB is required only if native Android files change.
