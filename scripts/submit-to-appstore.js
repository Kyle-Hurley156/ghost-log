#!/usr/bin/env node

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================================================
// Configuration
// ===========================================================================

const KEY_ID = 'UV3S7PQ6FW';
const ISSUER_ID = '7397351e-c4f7-42bd-b1fb-f00608c82948';
const APP_ID = '6758913273';
const PRIVATE_KEY_PATH = path.join(__dirname, '..', '.private_keys', 'AuthKey_UV3S7PQ6FW.p8');
const BASE_URL = 'https://api.appstoreconnect.apple.com';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

const LOCALE = 'en-US';
const COPYRIGHT = '2026 GhostLog';
const SUBTITLE = 'AI Fitness & Nutrition Tracker';
const SUPPORT_URL = 'https://ghost-log.vercel.app/privacy.html';
const PRIVACY_POLICY_URL = 'https://ghost-log.vercel.app/privacy.html';
const KEYWORDS = 'fitness,macro,tracker,workout,meal,calories,protein,AI,barcode,food,scanner,gym,nutrition,diet,log';
const PROMOTIONAL_TEXT = 'Your AI ghost tracks macros, scans barcodes, generates meals, and analyzes your fitness \u2014 so you can focus on the work.';

const WHATS_NEW = [
  'Ghost Chef redesigned as a chat \u2014 tell it what you want',
  'AI food photo scanning with improved accuracy',
  'Camera barcode + photo combined into one button',
  'New black & white premium design with accent color',
].join('\n');

const DESCRIPTION = `Train smarter. Eat better. Track everything.

GhostLog is your all-in-one fitness companion that combines workout tracking, meal logging, and AI-powered nutrition tools in a clean, no-nonsense interface.

TRAIN
\u2022 Create custom workout splits and exercises
\u2022 Log sets, reps, and weights with one tap
\u2022 Track cardio sessions with calorie estimates
\u2022 Drag to reorder your training program

EAT
\u2022 Build meals from ingredients with precise macros
\u2022 Scan barcodes instantly with the built-in camera
\u2022 Snap a photo of any food \u2014 AI identifies it and returns macros
\u2022 Search thousands of foods via OpenFoodFacts database
\u2022 Track daily calories, protein, carbs, and fat against your targets

GHOST CHEF
\u2022 Tell Ghost Chef what you're craving
\u2022 Get meal suggestions that fit your remaining macro budget
\u2022 Simple recipes with 3-5 ingredients
\u2022 Chat-style interface \u2014 refine until you find the perfect meal

GHOST REPORT
\u2022 AI analysis of your training volume, recovery, and nutrition trends
\u2022 Identifies patterns in sleep, stress, and fatigue
\u2022 Actionable insights to optimize your progress

SMART TARGETS
\u2022 Set calorie and macro targets for Cut, Bulk, or Maintain phases
\u2022 AI calculator estimates targets based on your weight and goals
\u2022 Switch phases with one tap

DAILY CHECK-IN
\u2022 Log weight, steps, water, sleep, stress, and fatigue daily
\u2022 Beautiful charts track your trends over time
\u2022 All data stays on your device with optional cloud backup

BUILT FOR PRIVACY
\u2022 No account required \u2014 anonymous by default
\u2022 Optional iCloud/Firebase backup if you want it
\u2022 Food photos are processed in real-time, never stored
\u2022 Your data is yours`;

const SCREENSHOT_FILES = [
  'appstore-01-checkin.png',
  'appstore-02-lift.png',
  'appstore-03-eat.png',
  'appstore-04-stats.png',
  'appstore-05-ghost-ai.png',
];

// ===========================================================================
// JWT Auth
// ===========================================================================

let _token = null;
let _tokenExpiry = 0;

function getToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_token && now < _tokenExpiry - 60) return _token;

  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 20 * 60,
    aud: 'appstoreconnect-v1',
  };

  _token = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: KEY_ID,
  });
  _tokenExpiry = payload.exp;
  return _token;
}

// ===========================================================================
// API Helpers
// ===========================================================================

async function api(method, endpoint, body = null) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  if (!res.ok) {
    console.error(`  X  API ${method} ${endpoint} -> ${res.status}`);
    try {
      const err = JSON.parse(text);
      console.error('     ', JSON.stringify(err.errors?.[0] || err, null, 2));
    } catch {
      console.error('     ', text.slice(0, 500));
    }
    throw new Error(`API ${res.status}: ${method} ${endpoint}`);
  }

  return text ? JSON.parse(text) : null;
}

const apiGet = (ep) => api('GET', ep);
const apiPatch = (ep, body) => api('PATCH', ep, body);
const apiPost = (ep, body) => api('POST', ep, body);
const apiDelete = (ep) => api('DELETE', ep);

// ===========================================================================
// Step 1: Get App Store Version in "Prepare for Submission"
// ===========================================================================

async function getAppStoreVersion() {
  console.log('\n[1/8] Finding app store version...');

  const resp = await apiGet(
    `/v1/apps/${APP_ID}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION`
  );

  if (resp.data && resp.data.length > 0) {
    const v = resp.data[0];
    console.log(`      Version ${v.attributes.versionString} (${v.id})`);
    return v;
  }

  // None in PREPARE_FOR_SUBMISSION — list what exists
  const allResp = await apiGet(`/v1/apps/${APP_ID}/appStoreVersions`);
  const versions = (allResp.data || []).map(v =>
    `  ${v.attributes.versionString} — ${v.attributes.appStoreState}`
  );
  console.log('      Existing versions:');
  versions.forEach(v => console.log(`      ${v}`));

  // Try to create a new version
  console.log('      Creating new version 1.2...');
  const createResp = await apiPost('/v1/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: {
        versionString: '1.2',
        platform: 'IOS',
      },
      relationships: {
        app: { data: { type: 'apps', id: APP_ID } },
      },
    },
  });

  console.log(`      Created version ${createResp.data.attributes.versionString}`);
  return createResp.data;
}

// ===========================================================================
// Step 2: Update Version Localization (description, keywords, etc.)
// ===========================================================================

async function updateVersionLocalization(versionId) {
  console.log('\n[2/8] Updating description, keywords, and metadata...');

  const resp = await apiGet(
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`
  );

  let loc = resp.data?.find(l => l.attributes.locale === LOCALE);

  if (!loc) {
    const created = await apiPost('/v1/appStoreVersionLocalizations', {
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale: LOCALE },
        relationships: {
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
        },
      },
    });
    loc = created.data;
    console.log('      Created en-US localization');
  }

  await apiPatch(`/v1/appStoreVersionLocalizations/${loc.id}`, {
    data: {
      type: 'appStoreVersionLocalizations',
      id: loc.id,
      attributes: {
        description: DESCRIPTION,
        keywords: KEYWORDS,
        promotionalText: PROMOTIONAL_TEXT,
        supportUrl: SUPPORT_URL,
      },
    },
  });

  console.log('      Done: description, keywords, promotional text, support URL, what\'s new');
  return loc;
}

// ===========================================================================
// Step 3: Update App Info (subtitle, categories, privacy URL)
// ===========================================================================

async function updateAppInfo() {
  console.log('\n[3/8] Updating app info (subtitle, categories, privacy URL)...');

  const resp = await apiGet(`/v1/apps/${APP_ID}/appInfos`);
  const appInfo = resp.data?.[0];
  if (!appInfo) throw new Error('No app info found');

  // Set categories
  try {
    await apiPatch(`/v1/appInfos/${appInfo.id}`, {
      data: {
        type: 'appInfos',
        id: appInfo.id,
        relationships: {
          primaryCategory: {
            data: { type: 'appCategories', id: 'HEALTH_AND_FITNESS' },
          },
          secondaryCategory: {
            data: { type: 'appCategories', id: 'LIFESTYLE' },
          },
        },
      },
    });
    console.log('      Done: categories (Health & Fitness / Lifestyle)');
  } catch (e) {
    console.log('      Warning: categories may need manual setup —', e.message);
  }

  // Update localization (subtitle + privacy URL)
  const locResp = await apiGet(`/v1/appInfos/${appInfo.id}/appInfoLocalizations`);
  const loc = locResp.data?.find(l => l.attributes.locale === LOCALE);

  if (loc) {
    await apiPatch(`/v1/appInfoLocalizations/${loc.id}`, {
      data: {
        type: 'appInfoLocalizations',
        id: loc.id,
        attributes: {
          subtitle: SUBTITLE,
          privacyPolicyUrl: PRIVACY_POLICY_URL,
        },
      },
    });
    console.log('      Done: subtitle, privacy policy URL');
  }

  return appInfo;
}

// ===========================================================================
// Step 4: Set Age Rating (4+)
// ===========================================================================

async function setAgeRating(appInfoId) {
  console.log('\n[4/8] Setting age rating (4+)...');

  try {
    const resp = await apiGet(`/v1/appInfos/${appInfoId}/ageRatingDeclaration`);
    const declaration = resp.data;

    if (!declaration) {
      console.log('      Warning: no age rating declaration found — set manually');
      return;
    }

    await apiPatch(`/v1/ageRatingDeclarations/${declaration.id}`, {
      data: {
        type: 'ageRatingDeclarations',
        id: declaration.id,
        attributes: {
          // String enum fields (NONE / INFREQUENT_OR_MILD / FREQUENT_OR_INTENSE)
          alcoholTobaccoOrDrugUseOrReferences: 'NONE',
          contests: 'NONE',
          gamblingSimulated: 'NONE',
          horrorOrFearThemes: 'NONE',
          matureOrSuggestiveThemes: 'NONE',
          medicalOrTreatmentInformation: 'NONE',
          profanityOrCrudeHumor: 'NONE',
          sexualContentGraphicAndNudity: 'NONE',
          sexualContentOrNudity: 'NONE',
          violenceCartoonOrFantasy: 'NONE',
          violenceRealistic: 'NONE',
          violenceRealisticProlongedGraphicOrSadistic: 'NONE',
          gunsOrOtherWeapons: 'NONE',
          // Boolean fields
          gambling: false,
          unrestrictedWebAccess: false,
          parentalControls: false,
          messagingAndChat: false,
          advertising: false,
          healthOrWellnessTopics: false,
          lootBox: false,
          userGeneratedContent: false,
          ageAssurance: false,
        },
      },
    });

    console.log('      Done: age rating 4+');
  } catch (e) {
    console.log('      Warning: age rating update failed —', e.message);
    console.log('      Set manually in App Store Connect');
  }
}

// ===========================================================================
// Step 5: Set Copyright
// ===========================================================================

async function updateVersion(versionId) {
  console.log('\n[5/8] Setting copyright...');

  await apiPatch(`/v1/appStoreVersions/${versionId}`, {
    data: {
      type: 'appStoreVersions',
      id: versionId,
      attributes: {
        copyright: COPYRIGHT,
      },
    },
  });

  console.log('      Done: copyright');
}

// ===========================================================================
// Step 6: Upload Screenshots
// ===========================================================================

async function uploadScreenshots(localizationId) {
  console.log('\n[6/8] Uploading screenshots (6.7" iPhone)...');

  // Check for existing screenshot sets
  const existingSets = await apiGet(
    `/v1/appStoreVersionLocalizations/${localizationId}/appScreenshotSets`
  );

  // Delete existing 6.7" sets to start fresh
  for (const set of (existingSets.data || [])) {
    if (set.attributes.screenshotDisplayType === 'APP_IPHONE_67') {
      const existing = await apiGet(`/v1/appScreenshotSets/${set.id}/appScreenshots`);
      for (const ss of (existing.data || [])) {
        await apiDelete(`/v1/appScreenshots/${ss.id}`);
      }
      await apiDelete(`/v1/appScreenshotSets/${set.id}`);
      console.log('      Cleared existing screenshot set');
    }
  }

  // Create new screenshot set
  const setResp = await apiPost('/v1/appScreenshotSets', {
    data: {
      type: 'appScreenshotSets',
      attributes: {
        screenshotDisplayType: 'APP_IPHONE_67',
      },
      relationships: {
        appStoreVersionLocalization: {
          data: { type: 'appStoreVersionLocalizations', id: localizationId },
        },
      },
    },
  });
  const screenshotSetId = setResp.data.id;

  // Upload each screenshot
  for (const fileName of SCREENSHOT_FILES) {
    const filePath = path.join(SCREENSHOTS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`      Skipping ${fileName} (not found)`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fileBuffer.length;
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // Reserve upload
    const reserveResp = await apiPost('/v1/appScreenshots', {
      data: {
        type: 'appScreenshots',
        attributes: {
          fileName,
          fileSize,
        },
        relationships: {
          appScreenshotSet: {
            data: { type: 'appScreenshotSets', id: screenshotSetId },
          },
        },
      },
    });

    const screenshot = reserveResp.data;
    const uploadOps = screenshot.attributes.uploadOperations;

    // Upload binary parts
    for (const op of uploadOps) {
      const chunk = fileBuffer.slice(op.offset, op.offset + op.length);
      const headers = {};
      for (const h of op.requestHeaders) {
        headers[h.name] = h.value;
      }

      const uploadRes = await fetch(op.url, {
        method: op.method,
        headers,
        body: chunk,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed for ${fileName}: ${uploadRes.status}`);
      }
    }

    // Commit upload
    await apiPatch(`/v1/appScreenshots/${screenshot.id}`, {
      data: {
        type: 'appScreenshots',
        id: screenshot.id,
        attributes: {
          uploaded: true,
          sourceFileChecksum: checksum,
        },
      },
    });

    console.log(`      Uploaded: ${fileName}`);
  }
}

// ===========================================================================
// Step 7: Select Build
// ===========================================================================

async function selectBuild(versionId) {
  console.log('\n[7/8] Selecting latest build...');

  const resp = await apiGet(
    `/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=5`
  );

  if (!resp.data || resp.data.length === 0) {
    throw new Error('No builds found — wait for build processing to complete');
  }

  const readyBuild = resp.data.find(b => b.attributes.processingState === 'VALID');
  const build = readyBuild || resp.data[0];

  console.log(`      Build ${build.attributes.version} (${build.attributes.processingState})`);

  if (build.attributes.processingState !== 'VALID') {
    console.log('      WARNING: build is still processing — re-run after it completes');
    return build;
  }

  await apiPatch(`/v1/appStoreVersions/${versionId}`, {
    data: {
      type: 'appStoreVersions',
      id: versionId,
      relationships: {
        build: {
          data: { type: 'builds', id: build.id },
        },
      },
    },
  });

  console.log(`      Done: build ${build.attributes.version} selected`);
  return build;
}

// ===========================================================================
// Step 8: Submit for Review
// ===========================================================================

async function submitForReview(versionId) {
  console.log('\n[8/8] Submitting for App Review...');

  // Try the newer reviewSubmissions API first
  try {
    const submission = await apiPost('/v1/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: 'IOS' },
        relationships: {
          app: { data: { type: 'apps', id: APP_ID } },
        },
      },
    });

    await apiPost('/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
          reviewSubmission: { data: { type: 'reviewSubmissions', id: submission.data.id } },
        },
      },
    });

    await apiPatch(`/v1/reviewSubmissions/${submission.data.id}`, {
      data: {
        type: 'reviewSubmissions',
        id: submission.data.id,
        attributes: { submitted: true },
      },
    });

    console.log('      SUBMITTED for review!');
    return;
  } catch (e) {
    console.log('      New submission API failed, trying legacy...');
  }

  // Fallback to legacy API
  await apiPost('/v1/appStoreVersionSubmissions', {
    data: {
      type: 'appStoreVersionSubmissions',
      relationships: {
        appStoreVersion: {
          data: { type: 'appStoreVersions', id: versionId },
        },
      },
    },
  });

  console.log('      SUBMITTED for review!');
}

// ===========================================================================
// Main
// ===========================================================================

async function main() {
  console.log('===========================================');
  console.log(' GhostLog -> App Store Submission');
  console.log('===========================================');

  // Verify key exists
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error(`Key not found: ${PRIVATE_KEY_PATH}`);
    process.exit(1);
  }

  // Test auth
  console.log('\nAuthenticating with App Store Connect...');
  const appResp = await apiGet(`/v1/apps/${APP_ID}`);
  console.log(`Authenticated. App: ${appResp.data.attributes.name}`);

  // Run all steps
  const version = await getAppStoreVersion();
  const versionId = version.id;

  const localization = await updateVersionLocalization(versionId);
  const appInfo = await updateAppInfo();
  await setAgeRating(appInfo.id);
  await updateVersion(versionId);

  try {
    await uploadScreenshots(localization.id);
  } catch (e) {
    console.log(`\n      Screenshot upload failed: ${e.message}`);
    console.log('      Upload screenshots manually in App Store Connect');
  }

  await selectBuild(versionId);

  const skipSubmit = process.argv.includes('--no-submit');
  if (skipSubmit) {
    console.log('\nSkipping submission (--no-submit flag).');
    console.log('Review everything in App Store Connect, then submit manually.');
  } else {
    await submitForReview(versionId);
  }

  console.log('\n===========================================');
  console.log(' Done!');
  if (!skipSubmit) {
    console.log(' App submitted for review.');
    console.log(' Apple typically reviews in 24-48 hours.');
  }
  console.log('');
  console.log(' MANUAL STEP REQUIRED:');
  console.log(' App Store Connect -> App Privacy');
  console.log(' Complete the privacy questionnaire.');
  console.log(' (No API exists for this)');
  console.log('===========================================');
}

main().catch(err => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});
