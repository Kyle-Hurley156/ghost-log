import { Capacitor } from '@capacitor/core';

let Haptics = null;

const getHaptics = async () => {
  if (Haptics) return Haptics;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('@capacitor/haptics');
    Haptics = mod.Haptics;
    return Haptics;
  } catch (e) { return null; }
};

// Wrap every haptic call so no error ever leaks as an unhandled rejection.
// Capacitor's native proxy can throw on .then() checks in async contexts.
const safe = (fn) => async () => { try { await fn(); } catch (_) {} };

export const hapticLight = safe(async () => {
  const h = await getHaptics();
  if (h) await h.impact({ style: 'LIGHT' });
});

export const hapticMedium = safe(async () => {
  const h = await getHaptics();
  if (h) await h.impact({ style: 'MEDIUM' });
});

export const hapticHeavy = safe(async () => {
  const h = await getHaptics();
  if (h) await h.impact({ style: 'HEAVY' });
});

export const hapticSuccess = safe(async () => {
  const h = await getHaptics();
  if (h) await h.notification({ type: 'SUCCESS' });
});

export const hapticSelection = safe(async () => {
  const h = await getHaptics();
  if (h) await h.selectionChanged();
});
