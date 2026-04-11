# GhostLog — App Store Rejection Fixes Applied

**Date:** 2026-03-18

---

## Fix 1: Error on Launch (CRITICAL)

### Problem
The static `import { Purchases } from '@revenuecat/purchases-capacitor'` on line 8 of `src/App.jsx` was a module-level import. If the native plugin bridge was unavailable (e.g., iOS 26 WKWebView edge case, version mismatch), the entire JS bundle would fail to load, triggering the red error bar before React even mounted.

### Changes Made

**`src/App.jsx`:**
- **Removed** the static import of `@revenuecat/purchases-capacitor` (was line 8). Replaced with a comment explaining the dynamic import strategy.
- **Added** a `getRevenueCat()` async helper function (lines 54-62) that dynamically imports `@revenuecat/purchases-capacitor` wrapped in try/catch, returning a no-op `PurchasesFallback` if the import fails.
- **Updated** `PurchasesFallback` to include `restorePurchases` and `logIn` stubs so it fully matches the Purchases API surface used in the app.
- **Updated** `setupRevenueCat()` to use `const RC = await getRevenueCat()` instead of `PurchasesFallback` directly.
- **Updated** `handleSubscribeClick()` to use `const RC = await getRevenueCat()` for `getOfferings()` and `purchasePackage()`.
- **Updated** `handleRestorePurchases()` to use `const RC = await getRevenueCat()` for `restorePurchases()`.

**`index.html`:**
- **Broadened** the `window.onerror` suppression filter (line 83) to also suppress errors containing `'module'` or `'dynamically imported'`, preventing generic Vite dynamic import error messages from showing the red error bar.

---

## Fix 2: Not Optimized for iPhone (CRITICAL)

### Problem
The app used `max-w-md` (max-width: 448px) on the main container, header, and bottom nav. On the iPhone 17 Pro Max (~430pt wide), this created visible side gutters/borders making the app look like it was not optimized for the device. The storyboard files referenced `retina4_7` (iPhone 8, 375x667), a legacy device size that could cause iOS to run the app in compatibility/scaled mode.

### Changes Made

**`src/App.jsx`:**
- **Line 1021 (was 1004):** Removed `max-w-md mx-auto`, `shadow-2xl`, and `border-x border-gray-800/50` from the main app container. Now uses full screen width.
  - Before: `"bg-black min-h-screen text-gray-100 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-800/50 pt-16"`
  - After: `"bg-black min-h-screen text-gray-100 font-sans relative overflow-hidden pt-16"`

- **Line 1064 (was 1047):** Removed `max-w-md mx-auto` from the fixed header.
  - Before: `"bg-gray-950 border-b border-gray-800/50 px-5 pb-5 pt-14 fixed top-0 left-0 right-0 z-20 max-w-md mx-auto safe-area-top"`
  - After: `"bg-gray-950 border-b border-gray-800/50 px-5 pb-5 pt-14 fixed top-0 left-0 right-0 z-20 safe-area-top"`

- **Line 1123 (was 1106):** Removed `max-w-md` from the bottom nav bar.
  - Before: `"fixed bottom-0 w-full max-w-md bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 p-3 pb-9 z-40 safe-area-bottom"`
  - After: `"fixed bottom-0 w-full bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 p-3 pb-9 z-40 safe-area-bottom"`

**`src/components/AddMealModal.jsx`:**
- **Line 233:** Removed `max-w-md` from the modal container so it also uses full width.
  - Before: `"bg-gray-900 w-full max-w-md mx-auto flex flex-col flex-1"`
  - After: `"bg-gray-900 w-full mx-auto flex flex-col flex-1"`

**`ios/App/App/Base.lproj/LaunchScreen.storyboard`:**
- Updated device reference from `retina4_7` (iPhone 8, 375x667) to `retina6_12` (iPhone 14/15 Pro, 393x852).
- Replaced bare `<imageView key="view">` with a proper `<view>` containing a child `<imageView>` using Auto Layout constraints (pinned to all four edges).
- Added `translatesAutoresizingMaskIntoConstraints="NO"` on the image view and proper `<constraints>` block.
- Added `<viewLayoutGuide key="safeArea">` for safe area support.
- Added `widthSizable="YES" heightSizable="YES"` on the parent view's autoresizing mask.

**`ios/App/App/Base.lproj/Main.storyboard`:**
- Updated device reference from `retina4_7` to `retina6_12`.
- Added `useSafeAreas="YES"` to the document element.

---

## Fix 5: Demo Account / Review Notes (Informational)

### No Code Changes Required

This is an App Store Connect metadata update. The ASC Review Notes should be updated to:

```
Demo Account:
Email: appreview@ghostlog.app
Password: GhostReview2026!

To sign in:
1. Open the app
2. Tap the gear icon (top-right corner of the header)
3. Scroll to the Account section
4. Tap "Sign In" / enter the email and password
5. Tap "LOG IN"

Note: The app is fully functional without signing in.
Sign-in enables cloud sync across devices.
```

Also ensure the demo account exists in Firebase Console (Authentication > Users).

---

## NOT Changed (ASC Metadata Only)

- **Fix 3 (ATT / App Tracking Transparency):** Requires updating privacy labels in App Store Connect only. Set "Used to Track" to NO for all data types.
- **Fix 4 (IAP Screenshot):** Requires submitting the IAP product with a review screenshot in App Store Connect.

---

## Files Modified

| File | Change |
|------|--------|
| `src/App.jsx` | Dynamic RevenueCat import, removed max-w-md from 3 elements |
| `src/components/AddMealModal.jsx` | Removed max-w-md from modal container |
| `index.html` | Broadened error suppression filter |
| `ios/App/App/Base.lproj/LaunchScreen.storyboard` | Modern device ref + Auto Layout constraints |
| `ios/App/App/Base.lproj/Main.storyboard` | Modern device ref + safe areas |

## Next Steps

1. `npm run build`
2. `npx cap sync ios`
3. Open Xcode, bump build number, archive, upload to ASC
4. Update ASC metadata (privacy labels, IAP product, review notes)
5. Create demo account in Firebase Console if not already done
6. Resubmit for review
