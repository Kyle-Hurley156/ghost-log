import { Capacitor } from '@capacitor/core';

let HealthKit = null;
let HealthConnect = null;

// Lazy-load native plugins only on the right platform
const getHealthKit = async () => {
  if (!HealthKit) {
    try {
      const mod = await import('@perfood/capacitor-healthkit');
      HealthKit = mod.CapacitorHealthkit;
    } catch (e) { console.warn('HealthKit not available', e); }
  }
  return HealthKit;
};

const getHealthConnect = async () => {
  if (!HealthConnect) {
    try {
      const mod = await import('capacitor-health-connect');
      HealthConnect = mod.HealthConnect;
    } catch (e) { console.warn('Health Connect not available', e); }
  }
  return HealthConnect;
};

export const isHealthAvailable = () => {
  if (!Capacitor.isNativePlatform()) return false;
  return true;
};

// Request permissions for health data
export const requestHealthPermissions = async () => {
  const platform = Capacitor.getPlatform();

  if (platform === 'ios') {
    const hk = await getHealthKit();
    if (!hk) return false;
    try {
      await hk.requestAuthorization({
        all: [],
        read: [
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierBodyMass',
          'HKCategoryTypeIdentifierSleepAnalysis',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
        ],
        write: []
      });
      return true;
    } catch (e) {
      console.error('HealthKit auth failed', e);
      return false;
    }
  }

  if (platform === 'android') {
    const hc = await getHealthConnect();
    if (!hc) return false;
    try {
      await hc.requestHealthPermissions({
        read: ['Steps', 'Weight', 'SleepSession', 'ActiveCaloriesBurned'],
        write: []
      });
      return true;
    } catch (e) {
      console.error('Health Connect auth failed', e);
      return false;
    }
  }

  return false;
};

// Read today's health data
export const readTodayHealthData = async () => {
  const platform = Capacitor.getPlatform();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const result = { steps: null, weight: null, sleep: null };

  if (platform === 'ios') {
    const hk = await getHealthKit();
    if (!hk) return result;

    try {
      // Steps
      const steps = await hk.queryHKitSampleType({
        sampleName: 'HKQuantityTypeIdentifierStepCount',
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        limit: 0
      });
      if (steps?.resultData?.length) {
        result.steps = Math.round(steps.resultData.reduce((sum, s) => sum + (s.quantity || 0), 0));
      }
    } catch (e) { console.warn('Steps read failed', e); }

    try {
      // Weight (most recent)
      const weight = await hk.queryHKitSampleType({
        sampleName: 'HKQuantityTypeIdentifierBodyMass',
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: now.toISOString(),
        limit: 1
      });
      if (weight?.resultData?.length) {
        result.weight = Math.round(weight.resultData[0].quantity * 10) / 10;
      }
    } catch (e) { console.warn('Weight read failed', e); }

    try {
      // Sleep (last night)
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sleep = await hk.queryHKitSampleType({
        sampleName: 'HKCategoryTypeIdentifierSleepAnalysis',
        startDate: yesterday.toISOString(),
        endDate: now.toISOString(),
        limit: 0
      });
      if (sleep?.resultData?.length) {
        const totalMinutes = sleep.resultData.reduce((sum, s) => {
          const start = new Date(s.startDate);
          const end = new Date(s.endDate);
          return sum + (end - start) / (1000 * 60);
        }, 0);
        result.sleep = Math.round(totalMinutes / 60 * 10) / 10;
      }
    } catch (e) { console.warn('Sleep read failed', e); }
  }

  if (platform === 'android') {
    const hc = await getHealthConnect();
    if (!hc) return result;

    try {
      const steps = await hc.readRecords({
        type: 'Steps',
        timeRangeFilter: {
          type: 'between',
          startTime: startOfDay.toISOString(),
          endTime: now.toISOString()
        }
      });
      if (steps?.records?.length) {
        result.steps = steps.records.reduce((sum, r) => sum + (r.count || 0), 0);
      }
    } catch (e) { console.warn('Steps read failed', e); }

    try {
      const weight = await hc.readRecords({
        type: 'Weight',
        timeRangeFilter: {
          type: 'between',
          startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: now.toISOString()
        }
      });
      if (weight?.records?.length) {
        const latest = weight.records[weight.records.length - 1];
        result.weight = Math.round((latest.weight?.inKilograms || 0) * 10) / 10;
      }
    } catch (e) { console.warn('Weight read failed', e); }

    try {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sleep = await hc.readRecords({
        type: 'SleepSession',
        timeRangeFilter: {
          type: 'between',
          startTime: yesterday.toISOString(),
          endTime: now.toISOString()
        }
      });
      if (sleep?.records?.length) {
        const totalMinutes = sleep.records.reduce((sum, r) => {
          const start = new Date(r.startTime);
          const end = new Date(r.endTime);
          return sum + (end - start) / (1000 * 60);
        }, 0);
        result.sleep = Math.round(totalMinutes / 60 * 10) / 10;
      }
    } catch (e) { console.warn('Sleep read failed', e); }
  }

  return result;
};
