import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY_ID = 'UV3S7PQ6FW';
const ISSUER_ID = '7397351e-c4f7-42bd-b1fb-f00608c82948';
const PRIVATE_KEY = fs.readFileSync(path.join(__dirname, '..', '.private_keys', 'AuthKey_UV3S7PQ6FW.p8'), 'utf8');
const VERSION_ID = '342ce9a5-8e5a-42cd-be5d-94bd9d6a3427';

let _token = null;
let _tokenExp = 0;

function getToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_token && now < _tokenExp - 60) return _token;
  _tokenExp = now + 20 * 60;
  _token = jwt.sign({ iss: ISSUER_ID, iat: now, exp: _tokenExp, aud: 'appstoreconnect-v1' }, PRIVATE_KEY, { algorithm: 'ES256', keyid: KEY_ID });
  return _token;
}

async function api(method, endpoint, body) {
  const url = endpoint.startsWith('http') ? endpoint : 'https://api.appstoreconnect.apple.com' + endpoint;
  const opts = { method, headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) { console.error(`${method} ${endpoint} -> ${res.status}`, text.slice(0, 500)); throw new Error(`API ${res.status}`); }
  return text ? JSON.parse(text) : null;
}

async function main() {
  // Get localization
  const locResp = await api('GET', `/v1/appStoreVersions/${VERSION_ID}/appStoreVersionLocalizations`);
  const locId = locResp.data[0].id;

  // Check for existing iPad sets and remove them
  const existingSets = await api('GET', `/v1/appStoreVersionLocalizations/${locId}/appScreenshotSets`);
  for (const set of (existingSets.data || [])) {
    if (set.attributes.screenshotDisplayType === 'APP_IPAD_PRO_3GEN_129') {
      const existing = await api('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`);
      for (const ss of (existing.data || [])) {
        await api('DELETE', `/v1/appScreenshots/${ss.id}`);
      }
      await api('DELETE', `/v1/appScreenshotSets/${set.id}`);
      console.log('Cleared existing iPad screenshot set');
    }
  }

  // Create iPad Pro 12.9 screenshot set
  const setResp = await api('POST', '/v1/appScreenshotSets', {
    data: {
      type: 'appScreenshotSets',
      attributes: { screenshotDisplayType: 'APP_IPAD_PRO_3GEN_129' },
      relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: locId } } }
    }
  });
  const setId = setResp.data.id;
  console.log('Created iPad screenshot set:', setId);

  const files = ['ipad-01-checkin.png', 'ipad-02-lift.png', 'ipad-03-eat.png', 'ipad-04-stats.png', 'ipad-05-ghost-ai.png'];
  const screenshotsDir = path.join(__dirname, '..', 'screenshots');

  for (const fileName of files) {
    const filePath = path.join(screenshotsDir, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fileBuffer.length;
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // Reserve
    const reserveResp = await api('POST', '/v1/appScreenshots', {
      data: {
        type: 'appScreenshots',
        attributes: { fileName, fileSize },
        relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } }
      }
    });

    const screenshot = reserveResp.data;

    // Upload parts
    for (const op of screenshot.attributes.uploadOperations) {
      const chunk = fileBuffer.slice(op.offset, op.offset + op.length);
      const headers = {};
      for (const h of op.requestHeaders) headers[h.name] = h.value;
      const r = await fetch(op.url, { method: op.method, headers, body: chunk });
      if (!r.ok) throw new Error(`Upload part failed: ${r.status}`);
    }

    // Commit
    await api('PATCH', `/v1/appScreenshots/${screenshot.id}`, {
      data: { type: 'appScreenshots', id: screenshot.id, attributes: { uploaded: true, sourceFileChecksum: checksum } }
    });

    console.log('Uploaded:', fileName);
  }

  console.log('Done - all iPad screenshots uploaded');
}

main().catch(err => { console.error('Failed:', err.message); process.exit(1); });
