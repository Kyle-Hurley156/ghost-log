# GhostLog App Store Rejection Fix Plan

**Date:** 2026-03-18
**Rejection Device:** iPhone 17 Pro Max, iOS 26.3.1
**Build:** v1.0 (1)

---

## Issue 1: Error Message on Launch

### Root Cause Analysis

The app shows an error banner on launch due to the startup error handler in `index.html` (lines 70-113). The flow:

1. **Line 80-88:** `window.onerror` catches any uncaught JS errors during startup. It suppresses known non-fatal ones (RevenueCat, Firebase, network/fetch) but shows a red error bar for anything else.

2. **Line 109-113:** A 10-second fallback timer fires `showError('App failed to load after 10s...')` if the React root has no children yet.

The most likely crash point is **RevenueCat initialization** on line 312-314:

```js
const rcKey = platform === 'ios' ? import.meta.env?.VITE_RC_APPLE_KEY : import.meta.env?.VITE_RC_GOOGLE_KEY;
```

`VITE_RC_APPLE_KEY` is an environment variable that exists on Vercel but is **baked into the build at compile time** by Vite. If the iOS build was produced without this env var set (e.g., local build without `.env`), `rcKey` is `undefined`, and `Purchases.configure()` is called with `undefined` -- which would throw. However, the RevenueCat init is wrapped in try/catch and runs asynchronously after auth resolves, so it shouldn't block the app.

**More likely cause:** On iOS 26.3.1 (a new major iOS version), the `import.meta.env?.VITE_RC_APPLE_KEY` optional chaining or some other modern JS syntax may hit an edge case in WKWebView. The Vite build target is `safari15` (line 17 of `vite.config.js`), but iOS 26 ships a new WebKit engine. Additionally:

- The `PurchasesFallback` (lines 43-48) guards against Purchases being undefined, but if the `@revenuecat/purchases-capacitor` import on line 8 itself throws (e.g., native plugin bridge not found or version mismatch on iOS 26), it would be an **uncaught module-level import error** that happens before React even mounts, triggering the red error bar.

- The `window.onerror` handler on line 80 filters out errors containing "revenuecat" (case-insensitive), but **ES module import errors** may not trigger `window.onerror` -- they surface as unhandled rejections instead. The `unhandledrejection` handler (lines 91-95) calls `e.preventDefault()` which suppresses them, but if the module fails to load at all, Vite's module loader may throw a synchronous error with a generic message like "Failed to fetch dynamically imported module" that does NOT contain "revenuecat" and IS caught by `window.onerror`, showing the red bar.

### Specific Fix

**File:** `/home/kyle/Projects/ghost-log/src/App.jsx`

1. **Lines 8, 43-48:** Change the top-level static import of RevenueCat to a dynamic lazy import to prevent module-level crashes:
   ```js
   // Remove line 8: import { Purchases } from '@revenuecat/purchases-capacitor';
   // Change lines 43-48 to always be a lazy-loading fallback
   ```
   Instead, dynamically import inside `setupRevenueCat()` (around line 308):
   ```js
   const { Purchases } = await import('@revenuecat/purchases-capacitor');
   ```

2. **File:** `/home/kyle/Projects/ghost-log/index.html`, **line 82-84:** Broaden the suppression filter to also catch generic module loading errors:
   ```js
   if (m.indexOf('revenuecat') !== -1 || m.indexOf('firebase') !== -1 ||
       m.indexOf('network') !== -1 || m.indexOf('fetch') !== -1 ||
       m.indexOf('module') !== -1 || m.indexOf('dynamically imported') !== -1) {
   ```

3. **File:** `/home/kyle/Projects/ghost-log/vite.config.js`, **line 16:** Consider updating the build target for iOS 26 compatibility:
   ```js
   target: 'safari17', // or 'esnext' since Capacitor 6 requires iOS 16+
   ```

### Priority: CRITICAL (blocks review)

---

## Issue 2: Not Optimized for iPhone

### Root Cause Analysis

The app layout is constrained with `max-w-md` (max-width: 448px) on the main container, header, and bottom nav. On the iPhone 17 Pro Max (which has a ~430pt wide screen), this creates visible side borders/gutters that make it look like a phone app running in a tablet frame.

**File:** `/home/kyle/Projects/ghost-log/src/App.jsx`

- **Line 1004:** `<div className="bg-black min-h-screen text-gray-100 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-800/50 pt-16">`
  - `max-w-md` = 448px max-width + `mx-auto` centering + `border-x border-gray-800/50` draws visible side borders. On smaller phones this fills the screen, but on the 17 Pro Max the side borders and centering create a "not full width" appearance.

- **Line 1047:** `<div className="bg-gray-950 border-b border-gray-800/50 px-5 pb-5 pt-14 fixed top-0 left-0 right-0 z-20 max-w-md mx-auto safe-area-top">`
  - The fixed header is also `max-w-md mx-auto`, so it doesn't span the full screen width on large phones.

- **Line 1106:** `<div className="fixed bottom-0 w-full max-w-md bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 p-3 pb-9 z-40 safe-area-bottom">`
  - Same issue with the bottom nav bar.

Additionally, the **LaunchScreen storyboard** (`/home/kyle/Projects/ghost-log/ios/App/App/Base.lproj/LaunchScreen.storyboard`) references device `retina4_7` (iPhone 8 size, 375x667) on line 3. This is a legacy device size. If the launch screen is not properly configured for the iPhone 17 Pro Max screen size, iOS may run the app in a **compatibility/scaled mode**, causing it to appear non-optimized.

The **Main.storyboard** (`/home/kyle/Projects/ghost-log/ios/App/App/Base.lproj/Main.storyboard`, line 3) also references `retina4_7`.

### Specific Fixes

**File:** `/home/kyle/Projects/ghost-log/src/App.jsx`

1. **Line 1004:** Remove `max-w-md mx-auto` and `border-x border-gray-800/50` from the main container. Replace with full-width layout:
   ```
   Old: "bg-black min-h-screen text-gray-100 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-800/50 pt-16"
   New: "bg-black min-h-screen text-gray-100 font-sans relative overflow-hidden pt-16"
   ```

2. **Line 1047:** Remove `max-w-md mx-auto` from the fixed header:
   ```
   Old: "bg-gray-950 border-b border-gray-800/50 px-5 pb-5 pt-14 fixed top-0 left-0 right-0 z-20 max-w-md mx-auto safe-area-top"
   New: "bg-gray-950 border-b border-gray-800/50 px-5 pb-5 pt-14 fixed top-0 left-0 right-0 z-20 safe-area-top"
   ```

3. **Line 1106:** Remove `max-w-md` from the bottom nav:
   ```
   Old: "fixed bottom-0 w-full max-w-md bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 p-3 pb-9 z-40 safe-area-bottom"
   New: "fixed bottom-0 w-full bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 p-3 pb-9 z-40 safe-area-bottom"
   ```

**File:** `/home/kyle/Projects/ghost-log/ios/App/App/Base.lproj/LaunchScreen.storyboard`

4. Update the storyboard to use Auto Layout constraints with `useSafeAreas="YES"` and remove the hardcoded `retina4_7` device reference. The `imageView` uses `autoresizingMask` (line 17) instead of proper Auto Layout constraints, which may cause layout issues on newer devices.

**File:** `/home/kyle/Projects/ghost-log/ios/App/App/Base.lproj/Main.storyboard`

5. Same issue -- update the device reference from `retina4_7` to a modern device or remove it.

### Priority: CRITICAL (blocks review)

---

## Issue 3: App Tracking Transparency

### Root Cause Analysis

This is a **metadata-only issue** in App Store Connect, not a code issue.

The rejection states: "The app privacy information provided in App Store Connect indicates the app collects data in order to track the user, including Health Data and Name."

After thorough code review:
- **No tracking SDKs** are present (no Facebook SDK, no AdMob, no IDFA, no AppTrackingTransparency framework).
- **No analytics** (no Firebase Analytics, no Mixpanel, no Amplitude).
- **No advertising** -- the app uses RevenueCat for subscriptions only.
- Health data is read from HealthKit (`/home/kyle/Projects/ghost-log/src/services/healthSync.js`) purely for app functionality (steps, weight, sleep auto-fill).
- Name/email is collected only for Firebase Authentication.
- The Google Play data safety form (`/home/kyle/Projects/ghost-log/data_safety.csv`) correctly declares data collection for "App functionality" only, with no tracking.

**The "Used to Track" checkbox was likely incorrectly selected in ASC App Privacy** for Health Data and/or Name. When "Used to Track" is selected for any data type, Apple requires the ATT framework prompt. Since the app does NOT track users, the fix is to correct the privacy labels.

### Required ASC Changes

In **App Store Connect > App Privacy**:

1. **Health & Fitness > Health Info:** Change "Used to Track" from YES to NO. Purpose should be "App Functionality" only.
2. **Health & Fitness > Fitness Info:** Change "Used to Track" from YES to NO. Purpose should be "App Functionality" only.
3. **Contact Info > Name:** If this is listed, either remove it (the app collects email, not name -- display name comes from Google but is not used for tracking) or set "Used to Track" to NO.
4. **Contact Info > Email Address:** Ensure "Used to Track" is NO. Purpose: "App Functionality" and/or "Account Management".

For all data types, the "Linked to User" declaration should remain YES (data is associated with user accounts), but "Used to Track" must be NO across the board.

### Priority: HIGH (metadata fix, can be done in parallel with code fixes)

---

## Issue 4: In-App Purchase Not Submitted

### Root Cause Analysis

The app references a subscription at `$9.70/mo` in the PaywallModal:

**File:** `/home/kyle/Projects/ghost-log/src/components/PaywallModal.jsx`, **line 36:**
```jsx
{loading ? <Loader2 className="animate-spin"/> : "SUBSCRIBE — $9.70/MO"}
```

The subscription product exists in RevenueCat and is attached to the app version in ASC, but the IAP product itself has not been submitted for review. This is common when:
- The IAP was created in ASC but is in "Ready to Submit" or "Missing Metadata" state
- The IAP product needs a **review screenshot** showing the subscription UI in the app

### Required ASC Changes

1. Go to **App Store Connect > My Apps > GhostLog > Subscriptions** (or In-App Purchases).
2. Find the "GhostLog Pro Monthly" subscription product.
3. Ensure it has:
   - A **review screenshot** (take a screenshot of the PaywallModal showing the $9.70/mo price and feature list)
   - A completed **description** and **display name**
   - Correct **pricing** ($9.70 AUD/month or the local equivalent)
   - The **Review Information** section filled out (the screenshot should show the paywall as it appears in-app)
4. Ensure the subscription group and product are in **"Waiting for Review"** or **"Ready to Submit"** state.
5. When resubmitting the app, make sure the IAP product is **included** in the submission (check the IAP section of the version submission).

### Priority: HIGH (blocks review)

---

## Issue 5: Demo Account Not Working

### Root Cause Analysis

The reviewer tried credentials: `appreview@ghostlog.app / GhostReview2026!`

The app uses **Firebase Authentication** with email/password. On native iOS, the auth flow uses a **REST API bypass** (lines 96-111 of App.jsx) because the standard Firebase SDK auth hangs in WKWebView.

The REST API calls `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword` directly.

Possible failure reasons:

1. **Account not created in Firebase:** The demo account `appreview@ghostlog.app` may not have been created in the Firebase Console (Authentication > Users). It needs to exist as an email/password user.

2. **Auth flow location in the app:** The app has **no auth gate** (line 1000: `// No auth gate -- app is always usable`). Login is buried inside **Settings > Account** (the SettingsPanel component, lines 46-91 of `/home/kyle/Projects/ghost-log/src/components/SettingsPanel.jsx`). The reviewer may not have found the login form because:
   - There is no visible login screen on launch
   - The gear icon (Settings) is small and in the top-right corner
   - The login form is inside a slide-out panel behind a "Not signed in" card
   - The review instructions may have said "launch the app and sign in" but there is no prominent sign-in screen

3. **REST API error handling:** If the REST sign-in fails, the error might be shown as a raw Firebase error code (e.g., `EMAIL_NOT_FOUND`, `INVALID_LOGIN_CREDENTIALS`) mapped through `mapRestAuthError()` (lines 132-142). The reviewer may have seen an "Invalid email or password" error if the account didn't exist.

4. **Native vs web auth path:** On iOS native (which the reviewer is on), the code goes through the REST API path (line 444-464). If the REST call returns an error, `injectFirebaseSession` never runs, and the reload on line 456 never happens. The user would just see an error message in the Settings panel.

### Specific Fixes

1. **Create the demo account** in Firebase Console (Authentication > Users > Add User):
   - Email: `appreview@ghostlog.app`
   - Password: `GhostReview2026!`

2. **Pre-populate the demo account with sample data** so the reviewer sees a functional app:
   - Add some workout history, meal logs, and stats to the Firestore document at `artifacts/{appId}/users/{uid}/userData/backup`

3. **Add clear instructions in the App Review Notes** (ASC > Version > App Review Information):
   ```
   Demo Account:
   Email: appreview@ghostlog.app
   Password: GhostReview2026!

   To sign in:
   1. Open the app
   2. Tap the gear icon (top-right corner)
   3. In the Settings panel, enter the email and password under "Account"
   4. Tap "LOG IN"

   Note: The app is fully functional without signing in.
   Sign-in enables cloud sync across devices.
   ```

4. Optionally, **add a visible "Sign in for cloud sync" prompt** or a more prominent login entry point so reviewers (and users) can easily find the authentication flow.

### Priority: CRITICAL (blocks review)

---

## Recommended Fix Order

| Priority | Issue | Type | Estimated Effort |
|----------|-------|------|-----------------|
| 1 | Issue 1: Error on Launch | Code fix | 30 min |
| 2 | Issue 2: Not Optimized for iPhone | Code fix + storyboard | 45 min |
| 3 | Issue 5: Demo Account | Firebase Console + ASC notes | 15 min |
| 4 | Issue 3: ATT Privacy Labels | ASC metadata | 10 min |
| 5 | Issue 4: IAP Not Submitted | ASC + screenshot | 15 min |

Issues 3, 4, and 5 are ASC/Firebase Console changes and can be done in parallel with code fixes for issues 1 and 2.

After code fixes, the build pipeline should be:
1. `npm run build`
2. `npx cap sync ios`
3. Open Xcode, bump build number, archive, upload to ASC
4. Update ASC metadata (privacy labels, IAP, review notes)
5. Resubmit for review

---

## Files Referenced

| File | Relevance |
|------|-----------|
| `/home/kyle/Projects/ghost-log/src/App.jsx` | Main app component -- startup errors, layout, auth flow |
| `/home/kyle/Projects/ghost-log/index.html` | Startup error handler, loading fallback |
| `/home/kyle/Projects/ghost-log/src/components/PaywallModal.jsx` | IAP subscription UI ($9.70/mo reference) |
| `/home/kyle/Projects/ghost-log/src/components/SettingsPanel.jsx` | Login form (where reviewer needs to sign in) |
| `/home/kyle/Projects/ghost-log/src/components/AuthScreen.jsx` | Auth screen (NOT used -- the app has no auth gate) |
| `/home/kyle/Projects/ghost-log/src/services/healthSync.js` | HealthKit data reading (no tracking) |
| `/home/kyle/Projects/ghost-log/src/constants.js` | Firebase config, app version |
| `/home/kyle/Projects/ghost-log/vite.config.js` | Build target (safari15) |
| `/home/kyle/Projects/ghost-log/ios/App/App/Info.plist` | iOS app config |
| `/home/kyle/Projects/ghost-log/ios/App/App/Base.lproj/LaunchScreen.storyboard` | Launch screen (legacy device size) |
| `/home/kyle/Projects/ghost-log/ios/App/App/Base.lproj/Main.storyboard` | Main storyboard (legacy device size) |
| `/home/kyle/Projects/ghost-log/capacitor.config.json` | Capacitor config |
| `/home/kyle/Projects/ghost-log/data_safety.csv` | Google Play data safety (reference for what the app actually collects) |
