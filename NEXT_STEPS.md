# GhostLog — Approval Checklist

**Date:** 2026-03-18
**Status:** Code fixes applied. Rebuild + metadata updates required for both platforms.

---

## Part A: iOS (App Store Connect)

### Step 1: Cancel the Current Submission

The current build (v1.0 build 1) will be rejected again for the same issues. Cancel it now so you can resubmit cleanly.

- [ ] Go to **App Store Connect > My Apps > GhostLog > App Store tab**
- [ ] Under the version in review, click **Cancel Submission**
- [ ] Wait for the status to change to "Developer Rejected" or "Ready for Review"

---

### Step 2: Create the Demo Account in Firebase

The reviewer needs a working login. This account must exist before you resubmit.

- [ ] Go to **Firebase Console > Authentication > Users**
- [ ] Click **Add User**
- [ ] Email: `appreview@ghostlog.app`
- [ ] Password: `GhostReview2026!`
- [ ] Click **Add User** and confirm the account appears in the user list
- [ ] (Optional) Add sample data to the account's Firestore document so the reviewer sees a populated app

---

### Step 3: Rebuild the iOS App

All code fixes are already applied. You just need to build, sync, and archive.

```bash
cd /home/kyle/Projects/ghost-log
npm run build
npx cap sync ios
```

- [ ] Run `npm run build` -- confirm it completes without errors
- [ ] Run `npx cap sync ios` -- confirm it completes without errors
- [ ] Open Xcode:
  ```bash
  open ios/App/App.xcworkspace
  ```
- [ ] In Xcode, select the **App** target > **General** tab
- [ ] Increment the **Build** number (e.g., from `1` to `2`). Keep the version at `1.0`
- [ ] Select **Product > Destination > Any iOS Device (arm64)**
- [ ] Select **Product > Archive**
- [ ] Wait for the archive to complete (2-5 minutes)
- [ ] In the Archives organizer, click **Distribute App**
- [ ] Choose **App Store Connect** > **Upload**
- [ ] Click through the options (leave defaults) and upload
- [ ] Wait for the upload to process (5-15 minutes, you'll get an email when ready)

---

### Step 4: Update App Privacy Labels in ASC

The privacy labels incorrectly say data is "Used to Track." Fix this so Apple doesn't require ATT.

- [ ] Go to **App Store Connect > My Apps > GhostLog > App Privacy**
- [ ] For **Health & Fitness > Health Info**: set "Used to Track" to **NO**. Purpose: "App Functionality" only
- [ ] For **Health & Fitness > Fitness Info**: set "Used to Track" to **NO**. Purpose: "App Functionality" only
- [ ] For **Contact Info > Name**: either remove it entirely, or set "Used to Track" to **NO**
- [ ] For **Contact Info > Email Address**: set "Used to Track" to **NO**. Purpose: "App Functionality" / "Account Management"
- [ ] For all data types, "Linked to User" can remain **YES**
- [ ] Save and publish the privacy changes

---

### Step 5: Add Review Screenshot to IAP Product

The GhostLog Pro Monthly subscription needs a screenshot for Apple's review.

- [ ] Take a screenshot of the PaywallModal in the app (showing the $9.70/mo price and feature list). You can use the iOS Simulator for this
- [ ] Go to **App Store Connect > My Apps > GhostLog > Subscriptions** (left sidebar)
- [ ] Click on the **GhostLog Pro Monthly** product
- [ ] Scroll to **Review Information**
- [ ] Upload the screenshot of the paywall UI
- [ ] Confirm the product has a display name, description, and correct pricing filled in
- [ ] Save

---

### Step 6: Update Review Notes with Demo Account and Login Instructions

- [ ] Go to **App Store Connect > My Apps > GhostLog > App Store tab > Version Information**
- [ ] Scroll down to **App Review Information**
- [ ] In the **Sign-in required** section, check YES
- [ ] Set the demo account credentials:
  - **Username:** `appreview@ghostlog.app`
  - **Password:** `GhostReview2026!`
- [ ] In the **Notes** field, paste this:

```
To sign in:
1. Open the app
2. Tap the gear icon (top-right corner of the header)
3. Scroll to the Account section
4. Tap "Sign In" / enter the email and password above
5. Tap "LOG IN"

Note: The app is fully functional without signing in.
Sign-in enables cloud sync across devices.
```

- [ ] Save

---

### Step 7: Select the New Build and Resubmit

- [ ] Go to **App Store Connect > My Apps > GhostLog > App Store tab**
- [ ] Under **Build**, click the **+** or select the new build (v1.0 build 2)
- [ ] Wait for it to finish processing if it hasn't already
- [ ] Ensure the IAP product (GhostLog Pro Monthly) is included in the submission -- check the **In-App Purchases and Subscriptions** section on the version page
- [ ] Click **Add for Review** / **Submit for Review**
- [ ] Confirm the submission

---

## Part B: Android (Google Play)

### Step 8: Rebuild the Android App

The same code fixes (RevenueCat dynamic import, max-w-md removal) also apply to the Android build.

```bash
cd /home/kyle/Projects/ghost-log
npm run build
npx cap sync android
```

- [ ] Run `npm run build` (if you already did this for iOS in the same session, skip)
- [ ] Run `npx cap sync android` -- confirm it completes without errors

---

### Step 9: Generate a Signed AAB

- [ ] Open Android Studio:
  ```bash
  # Or open manually: Android Studio > Open > /home/kyle/Projects/ghost-log/android
  ```
- [ ] Go to **Build > Generate Signed Bundle / APK**
- [ ] Select **Android App Bundle (AAB)**
- [ ] Select your existing keystore or create one:
  - If you already have a keystore, select it and enter the passwords
  - If not: create one and **back up the keystore file and passwords somewhere safe** -- you can never replace it
- [ ] Select **release** build variant
- [ ] Click **Finish** and wait for the build
- [ ] The signed AAB will be at `android/app/release/app-release.aab` (or similar)

---

### Step 10: Upload to Google Play Internal Testing

- [ ] Go to **Google Play Console > GhostLog > Testing > Internal testing**
- [ ] Click **Create new release**
- [ ] Upload the signed AAB from Step 9
- [ ] Add release notes (e.g., "Initial release - calorie tracker with HealthKit sync, cloud backup, and GhostLog Pro subscription")
- [ ] Click **Review release**
- [ ] Click **Start rollout to Internal testing**

---

### Step 11: Get 12 Testers Opted In for 14 Days

Google Play requires at least 12 testers who have been opted into a closed testing track for at least 14 continuous days before you can request production access.

- [ ] Go to **Internal testing > Testers tab**
- [ ] Create a testers list (or use an existing one)
- [ ] Add at least **12 email addresses** (these must be real Google accounts)
- [ ] Share the **opt-in link** with all 12 testers
- [ ] Each tester must:
  1. Click the opt-in link
  2. Accept the invitation
  3. (Optionally) install the app
- [ ] Note the date all 12 testers opted in: **________**
- [ ] The 14-day countdown starts from the date the last tester opts in
- [ ] Production access will be available after: **________** (date + 14 days)

---

### Step 12: Submit Publishing Overview for Review

While waiting for the 14-day tester period, get the store listing reviewed.

- [ ] Go to **Google Play Console > GhostLog > Publishing overview**
- [ ] Confirm all required items are complete:
  - [ ] Store listing (title, description, screenshots, feature graphic)
  - [ ] Content rating questionnaire completed
  - [ ] Data safety form completed and accurate
  - [ ] Pricing and distribution set (free with IAP)
  - [ ] Target audience and content settings configured
- [ ] Click **Send for review** on any changes that need it
- [ ] Address any policy issues Google flags during review

---

### Step 13: Production Release (After 14-Day Wait)

Once the 14-day tester requirement is met:

- [ ] Go to **Google Play Console > GhostLog > Production**
- [ ] Click **Create new release**
- [ ] Upload the same (or updated) signed AAB
- [ ] Add production release notes
- [ ] Click **Review release**
- [ ] Click **Start rollout to Production**
- [ ] Google will review the production release (typically 1-7 days)

---

## Quick Reference: What Blocks What

| Blocker | Platform | Type | Can Do Now? |
|---------|----------|------|-------------|
| Cancel current iOS submission | iOS | ASC | YES |
| Create Firebase demo account | iOS | Firebase Console | YES |
| Rebuild + archive + upload iOS | iOS | Terminal + Xcode | YES |
| Update privacy labels | iOS | ASC | YES |
| Add IAP screenshot | iOS | ASC | YES |
| Update review notes | iOS | ASC | YES |
| Resubmit iOS | iOS | ASC | After build uploads |
| Rebuild + sign Android | Android | Terminal + Android Studio | YES |
| Upload to internal testing | Android | Play Console | After AAB signed |
| 12 testers opted in 14 days | Android | Play Console | Start ASAP |
| Production release | Android | Play Console | After 14-day wait |
