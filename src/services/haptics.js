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

export const hapticLight = async () => {
  const h = await getHaptics();
  if (h) h.impact({ style: 'LIGHT' }).catch(() => {});
};

export const hapticMedium = async () => {
  const h = await getHaptics();
  if (h) h.impact({ style: 'MEDIUM' }).catch(() => {});
};

export const hapticHeavy = async () => {
  const h = await getHaptics();
  if (h) h.impact({ style: 'HEAVY' }).catch(() => {});
};

export const hapticSuccess = async () => {
  const h = await getHaptics();
  if (h) h.notification({ type: 'SUCCESS' }).catch(() => {});
};

export const hapticSelection = async () => {
  const h = await getHaptics();
  if (h) h.selectionChanged().catch(() => {});
};
