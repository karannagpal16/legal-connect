# Legal Connect Android Build Steps

Target: Google Play Console Internal Testing, not public production release.

## What This Android App Does

The Android project in `android/` is a native WebView app shell for Legal Connect.

- App name: Legal Connect
- Package name: `in.legalconnect.app`
- Version name: `1.0.0`
- Version code: `1`
- Live app URL: `https://www.legal-connect.in`
- Backend health: `https://www.legal-connect.in/api/health`

It keeps `legal-connect.in` inside the app and opens other external links in the browser where appropriate.

## Before Building

From the repo root:

```powershell
cd "C:\Users\user\Documents\Codex\2026-06-22\you-are-a-senior-full-stack"
npm install
npm run build
```

## Open in Android Studio

1. Open Android Studio.
2. Choose `Open`.
3. Select:

```text
C:\Users\user\Documents\Codex\2026-06-22\you-are-a-senior-full-stack\android
```

4. Let Gradle sync complete.
5. If Android Studio asks to install SDK/build tools, allow it.

## Build Debug App for Phone Testing

In Android Studio:

1. Connect Android phone with USB debugging enabled.
2. Select the `app` run configuration.
3. Press Run.
4. Confirm the app opens `https://www.legal-connect.in`.

## Generate Play Store Internal Testing AAB

In Android Studio:

1. Go to `Build`.
2. Choose `Generate Signed Bundle / APK`.
3. Select `Android App Bundle`.
4. Create or choose a keystore.
5. Build `release`.
6. Upload the `.aab` to Google Play Console Internal Testing.

Expected output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Command Line AAB Build

If Gradle wrapper exists after Android Studio sync:

```powershell
cd "C:\Users\user\Documents\Codex\2026-06-22\you-are-a-senior-full-stack\android"
.\gradlew.bat bundleRelease
```

On macOS/Linux:

```bash
cd android
./gradlew bundleRelease
```

If wrapper is not present, use Android Studio first. Android Studio can create/use the wrapper after sync.

## Razorpay Testing Notes

- The app does not force UPI.
- The app does not prefill a UPI ID.
- Razorpay Checkout is opened from the live web app.
- Payment is not marked paid until backend verification succeeds.
- Work Completion Hold activates only after verified payment.
- For test UPI, backend must use `rzp_test` keys.
- UPI success test: `success@razorpay`
- UPI failure test: `failure@razorpay`
- If UPI says invalid, confirm Razorpay test mode keys or use Razorpay test card method.

## Play Console Internal Testing Steps

1. Create app in Google Play Console.
2. App name: Legal Connect.
3. Package name must match `in.legalconnect.app`.
4. Upload `app-release.aab`.
5. Add internal testers.
6. Add privacy policy URL:

```text
https://www.legal-connect.in/#privacy
```

7. Add terms URL in app description/reviewer notes:

```text
https://www.legal-connect.in/#terms
```

8. Use files from `store-assets/` for descriptions, data safety draft, and reviewer notes.

## Policy-Safe Wording

Use:

- legal-support coordination
- legal information
- advocate consultation
- case support
- document support
- Legal SOS request

Do not claim:

- guaranteed bail
- guaranteed case win
- guaranteed outcome
- emergency rescue
- police immunity
