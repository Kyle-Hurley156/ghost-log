#!/usr/bin/env node
/**
 * Run this AFTER you've done the medical device declaration in ASC:
 * App Store Connect → GhostLog → App Information → Declare Regulated Medical Device → "No" → Save
 *
 * This script will submit the app for review.
 */
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY_ID = 'UV3S7PQ6FW';
const ISSUER_ID = '7397351e-c4f7-42bd-b1fb-f00608c82948';
const APP_ID = '6758913273';
const PRIVATE_KEY_PATH = path.join(__dirname, '..', '.private_keys', 'AuthKey_UV3S7PQ6FW.p8');
const BASE_URL = 'https://api.appstoreconnect.apple.com';

function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  return jwt.sign({ iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' }, privateKey, { algorithm: 'ES256', keyid: KEY_ID });
}

async function api(method, endpoint, body = null) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const opts = { method, headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) {
    console.error(`API ${method} ${endpoint} -> ${res.status}`);
    try { console.error(JSON.stringify(JSON.parse(text).errors?.[0], null, 2)); } catch { console.error(text.slice(0, 500)); }
    throw new Error(`API ${res.status}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log('\n  GhostLog — Submit for Review\n');

  // Verify auth
  const app = await api('GET', `/v1/apps/${APP_ID}`);
  console.log(`  App: ${app.data.attributes.name}`);

  // Get version
  const versions = await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION`);
  if (!versions.data?.length) { console.log('  No version in PREPARE_FOR_SUBMISSION state'); return; }
  const versionId = versions.data[0].id;
  console.log(`  Version: ${versions.data[0].attributes.versionString} (${versionId})`);

  // Skip whatsNew — not allowed on initial release, only on updates

  // Set review info with demo credentials
  try {
    const reviewResp = await api('GET', `/v1/appStoreVersions/${versionId}/appStoreReviewDetail`);
    if (reviewResp.data) {
      await api('PATCH', `/v1/appStoreReviewDetails/${reviewResp.data.id}`, {
        data: {
          type: 'appStoreReviewDetails',
          id: reviewResp.data.id,
          attributes: {
            contactFirstName: 'Kyle',
            contactLastName: 'Hurley',
            contactPhone: '+61455774047',
            contactEmail: 'kylehurley156@gmail.com',
            demoAccountName: 'appreview@ghostlog.app',
            demoAccountPassword: 'GhostReview2026!',
            demoAccountRequired: true,
            notes: 'To sign in:\\n1. Open the app\\n2. Tap the gear icon (top-right)\\n3. Scroll to Account section\\n4. Tap "Sign In"\\n5. Enter the demo email and password\\n6. Tap "LOG IN"\\n\\nThe app is fully functional without signing in. Sign-in enables cloud sync.'
          }
        }
      });
      console.log('  Updated review info with demo account');
    }
  } catch (e) {
    console.log('  Warning: could not update review info —', e.message);
  }

  // Submit
  console.log('\n  Submitting for review...');
  try {
    const submission = await api('POST', '/v1/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: APP_ID } } }
      }
    });

    await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
          reviewSubmission: { data: { type: 'reviewSubmissions', id: submission.data.id } }
        }
      }
    });

    await api('PATCH', `/v1/reviewSubmissions/${submission.data.id}`, {
      data: {
        type: 'reviewSubmissions',
        id: submission.data.id,
        attributes: { submitted: true }
      }
    });

    console.log('\n  SUBMITTED FOR REVIEW!');
    console.log('  Apple typically reviews in 24-48 hours.\n');
  } catch (e) {
    console.log('\n  Submission failed — check if medical device declaration is done:');
    console.log('  ASC → GhostLog → App Information → Declare Regulated Medical Device → "No" → Save\n');
  }
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); });
