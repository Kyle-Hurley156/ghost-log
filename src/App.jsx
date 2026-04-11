import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell, Utensils, BarChart3, Lock, Cloud, CloudOff, Loader2, Settings,
  TrendingUp, Footprints, BrainCircuit, Battery, Flame, Beef, Wheat, Droplet
} from 'lucide-react';

import { Capacitor } from '@capacitor/core';
// RevenueCat is imported dynamically inside setupRevenueCat() to prevent
// module-level crashes on iOS (native plugin bridge may not be available).

import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, browserLocalPersistence, indexedDBLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithCredential, signInWithPopup, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset, deleteUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

import { FIREBASE_CONFIG, INITIAL_SPLITS, INITIAL_TARGETS } from './constants';
import { getLocalDate, useStickyState } from './helpers';

import { OnboardingModal } from './components/OnboardingModal';
import { SettingsPanel } from './components/SettingsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { hapticSelection, hapticSuccess, hapticMedium } from './services/haptics';
import { Toast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { PaywallModal } from './components/PaywallModal';
import { CardioModal } from './components/CardioModal';
import { GhostChefModal } from './components/GhostChefModal';
import { TargetEditorModal } from './components/TargetEditorModal';
import { GhostAiPanel } from './components/GhostAiPanel';
import { PromptModal } from './components/PromptModal';
import { AddMealModal } from './components/AddMealModal';
import { DailyCheckinModal } from './components/DailyCheckinModal';
import { TrainTab } from './components/TrainTab';
import { EatTab } from './components/EatTab';
import { StatsTab } from './components/StatsTab';

// debugLog: no-op in production, keeps call sites intact for future debugging
const debugLog = () => {};

// --- FALLBACKS FOR WEB PREVIEW ---
const CapacitorFallback = typeof Capacitor !== 'undefined' ? Capacitor : {
  isNativePlatform: () => false,
  getPlatform: () => 'web'
};

// PurchasesFallback used when dynamic import of RevenueCat fails or on web
const PurchasesFallback = {
  configure: () => {},
  getCustomerInfo: async () => ({ entitlements: { active: {} } }),
  getOfferings: async () => ({ current: null }),
  purchasePackage: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  restorePurchases: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  logIn: async () => {}
};

// Lazily load RevenueCat native plugin; returns fallback on failure
async function getRevenueCat() {
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    return Purchases || PurchasesFallback;
  } catch (_) {
    return PurchasesFallback;
  }
}

// --- FIREBASE REST API GOOGLE SIGN-IN ---
// Bypasses signInWithCredential which hangs indefinitely in WKWebView.
// Uses plain fetch() to call the same Firebase endpoint directly.
async function firebaseRestGoogleSignIn(googleIdToken) {
  const apiKey = FIREBASE_CONFIG.apiKey;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${googleIdToken}&providerId=google.com`,
        requestUri: 'https://ghost-log.vercel.app',
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Firebase REST sign-in failed (${response.status})`);
  }
  return response.json();
}

// REST API for email link sign-in (magic link).
// signInWithEmailLink internally calls signInWithCredential which hangs in WKWebView.
async function firebaseRestEmailLinkSignIn(email, oobCode) {
  const apiKey = FIREBASE_CONFIG.apiKey;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, oobCode }),
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Email link sign-in failed (${response.status})`);
  }
  return response.json();
}

// REST API for email/password sign-in.
// signInWithEmailAndPassword can hang on iOS if setPersistence hangs first.
async function firebaseRestEmailSignIn(email, password) {
  const apiKey = FIREBASE_CONFIG.apiKey;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Sign-in failed (${response.status})`);
  }
  return response.json();
}

// REST API for email/password sign-up.
async function firebaseRestEmailSignUp(email, password) {
  const apiKey = FIREBASE_CONFIG.apiKey;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Sign-up failed (${response.status})`);
  }
  return response.json();
}

// Map Firebase REST API error messages to user-friendly messages
function mapRestAuthError(msg) {
  const m = (msg || '').toUpperCase();
  if (m.includes('EMAIL_NOT_FOUND') || m.includes('INVALID_LOGIN_CREDENTIALS')) return 'Invalid email or password';
  if (m.includes('INVALID_PASSWORD')) return 'Invalid email or password';
  if (m.includes('EMAIL_EXISTS')) return 'Email already in use';
  if (m.includes('WEAK_PASSWORD')) return 'Password must be at least 6 characters';
  if (m.includes('INVALID_EMAIL')) return 'Invalid email address';
  if (m.includes('TOO_MANY_ATTEMPTS')) return 'Too many attempts. Please wait and try again.';
  if (m.includes('USER_DISABLED')) return 'This account has been disabled';
  return msg || 'Authentication failed';
}

// Inject Firebase user session into localStorage so Firebase picks it up on reload.
// Format matches Firebase SDK's UserImpl.toJSON() exactly.
// provider: 'google.com' for Google, 'password' for email/magic link
function injectFirebaseSession(restResponse, provider = 'google.com') {
  const apiKey = FIREBASE_CONFIG.apiKey;
  const key = `firebase:authUser:${apiKey}:[DEFAULT]`;
  const userObj = {
    uid: restResponse.localId,
    email: restResponse.email || '',
    emailVerified: restResponse.emailVerified || false,
    displayName: restResponse.displayName || restResponse.fullName || '',
    isAnonymous: false,
    photoURL: restResponse.photoUrl || '',
    providerData: [{
      providerId: provider,
      uid: provider === 'google.com' ? restResponse.localId : (restResponse.email || ''),
      displayName: restResponse.displayName || '',
      email: restResponse.email || '',
      phoneNumber: null,
      photoURL: restResponse.photoUrl || '',
    }],
    stsTokenManager: {
      refreshToken: restResponse.refreshToken,
      accessToken: restResponse.idToken,
      expirationTime: Date.now() + (parseInt(restResponse.expiresIn || '3600') * 1000),
    },
    createdAt: String(Date.now()),
    lastLoginAt: String(Date.now()),
    apiKey: apiKey,
    appName: '[DEFAULT]',
  };
  localStorage.setItem(key, JSON.stringify(userObj));
  return userObj;
}

// Ghost Logo SVG component matching the brand
const GhostLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8C30 8 18 24 18 42v32c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8V42C82 24 70 8 50 8z" fill="white"/>
    <circle cx="38" cy="38" r="5" fill="black"/>
    <circle cx="62" cy="38" r="5" fill="black"/>
    <ellipse cx="50" cy="52" rx="4" ry="3" fill="black"/>
  </svg>
);

// Shows diagnostic text while auth is loading (timeout handles cancellation automatically)
function AuthLoadingHelper({ authPhase }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      {elapsed >= 3 && (
        <p className="text-gray-700 text-[10px] text-center">{authPhase} ({elapsed}s)</p>
      )}
    </>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('train');
  const [phase, setPhase] = useStickyState('CUT', 'ghost_phase');

  // UI States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDailyCheckin, setShowDailyCheckin] = useState(false);
  const [showGhostPanel, setShowGhostPanel] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showGhostChefModal, setShowGhostChefModal] = useState(false);
  const [showCardioModal, setShowCardioModal] = useState(false);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [aiCooldown, setAiCooldown] = useState(0);

  // MONETIZATION & CLOUD STATES
  const [isPro, setIsPro] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPaywallLoading, setIsPaywallLoading] = useState(false);
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authPhase, setAuthPhase] = useState('init'); // Tracks what auth is doing for diagnostics
  const [dataLoaded, setDataLoaded] = useState(false);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(null); // { oobCode, email }

  // APP DATA
  const [workoutEditMode, setWorkoutEditMode] = useState(false);
  const [mealEditMode, setMealEditMode] = useState(false);
  const [workoutSplits, setWorkoutSplits] = useStickyState(INITIAL_SPLITS, 'ghost_splits');
  const [savedMeals, setSavedMeals] = useStickyState([], 'ghost_meals');
  const [statsHistory, setStatsHistory] = useStickyState([], 'ghost_stats');
  const [workoutHistory, setWorkoutHistory] = useStickyState([], 'ghost_workouts');
  const [dailyLog, setDailyLog] = useStickyState([], 'ghost_daily_log');
  const [userTargets, setUserTargets] = useStickyState(INITIAL_TARGETS, 'ghost_targets');
  const [customExercises, setCustomExercises] = useStickyState([], 'ghost_custom_exercises');

  const [logDate, setLogDate] = useState(getLocalDate());
  const [dailyStatsInput, setDailyStatsInput] = useState({ weight: '', steps: '', water: '', stress: 3, fatigue: 3, sleepHours: '', sleepQuality: 3, activity: 3 });

  // --- FIREBASE HELPER: get user doc ref ---
  const getUserRef = (uid) => {
    const db = getFirestore();
    const appId = import.meta.env?.VITE_FIREBASE_APP_ID || 'ghostlog-local';
    return doc(db, 'artifacts', appId, 'users', uid, 'userData', 'backup');
  };

  // --- PULL DATA FROM CLOUD ---
  const loadCloudData = async (uid) => {
    try {
      const snapshot = await getDoc(getUserRef(uid));
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.workoutSplits) setWorkoutSplits(data.workoutSplits);
        if (data.savedMeals) setSavedMeals(data.savedMeals);
        if (data.statsHistory) setStatsHistory(data.statsHistory);
        if (data.workoutHistory) setWorkoutHistory(data.workoutHistory);
        if (data.dailyLog) setDailyLog(data.dailyLog);
        if (data.userTargets) setUserTargets(data.userTargets);
        if (data.phase) setPhase(data.phase);
        if (data.customExercises) setCustomExercises(data.customExercises);
      }
      // Only enable sync engine after successful cloud load.
      // If we set dataLoaded on failure, the sync engine would push stale
      // localStorage defaults to Firestore — overwriting real user data.
      setDataLoaded(true);
    } catch (e) {
      console.error("Failed to load cloud data", e);
      // Retry once after 3s — transient network issues shouldn't cause data loss
      setTimeout(async () => {
        try {
          const snapshot = await getDoc(getUserRef(uid));
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.workoutSplits) setWorkoutSplits(data.workoutSplits);
            if (data.savedMeals) setSavedMeals(data.savedMeals);
            if (data.statsHistory) setStatsHistory(data.statsHistory);
            if (data.workoutHistory) setWorkoutHistory(data.workoutHistory);
            if (data.dailyLog) setDailyLog(data.dailyLog);
            if (data.userTargets) setUserTargets(data.userTargets);
            if (data.phase) setPhase(data.phase);
            if (data.customExercises) setCustomExercises(data.customExercises);
          }
          setDataLoaded(true);
        } catch (retryErr) {
          console.error("Cloud data retry failed — sync disabled to protect data", retryErr);
          // Do NOT set dataLoaded — sync engine stays disabled to prevent overwriting
        }
      }, 3000);
    }
  };

  // --- INITIALIZATION (FIREBASE & REVENUECAT) ---
  // Store unsubscribe ref so useEffect cleanup can access it outside the async IIFE
  const authUnsubscribeRef = useRef(null);
  // Track whether onAuthStateChanged has resolved at least once (prevents deep link interference)
  const authResolvedRef = useRef(false);
  // Google auth safety timer ref — shared so the deep link handler can clear it
  const googleSafetyTimerRef = useRef(null);

  useEffect(() => {
    const setupRevenueCat = async (firebaseUid) => {
      if (CapacitorFallback.isNativePlatform()) {
        try {
          const RC = await getRevenueCat();
          const platform = CapacitorFallback.getPlatform();
          const rcKey = platform === 'ios' ? import.meta.env?.VITE_RC_APPLE_KEY : import.meta.env?.VITE_RC_GOOGLE_KEY;
          if (rcKey) {
            await RC.configure({ apiKey: rcKey });
            // Link RevenueCat to Firebase UID so purchases follow the user across devices
            if (firebaseUid) {
              try { await RC.logIn({ appUserID: firebaseUid }); } catch (_) {}
            }
            const info = await RC.getCustomerInfo();
            if (typeof info?.customerInfo?.entitlements?.active['pro'] !== "undefined") setIsPro(true);
          }
        } catch (e) { console.error("RevenueCat Init Error", e); }
      }
    };

    // Safety net: if auth hasn't resolved in 8s, stop waiting
    // (WKWebView can be slow to restore sessions — 4s was too aggressive)
    const authTimeout = setTimeout(() => {
      // console.warn('[GhostLog] Auth timeout — forcing authLoading=false');
      debugLog('AUTH TIMEOUT after 8s');
      setAuthPhase('timeout');
      setAuthLoading(false);
    }, 8000);

    if (FIREBASE_CONFIG.apiKey) {
      (async () => {
        try {
          debugLog('Firebase init starting');
          // console.log('[GhostLog] Firebase init starting');
          setAuthPhase('firebase-init');

          // Use initializeAuth instead of getAuth + setPersistence.
          // setPersistence() hangs indefinitely in WKWebView, blocking ALL subsequent
          // Firebase auth operations. initializeAuth sets persistence at creation time
          // without the async migration step that causes the hang.
          let auth;
          const existingApp = getApps().length ? getApps()[0] : null;
          const app = existingApp || initializeApp(FIREBASE_CONFIG);

          if (existingApp) {
            // Hot reload / already initialized — just get existing auth instance
            auth = getAuth(existingApp);
            debugLog('Firebase: reusing existing auth instance');
          } else {
            // First init — set persistence at creation time (no hanging migration)
            try {
              const persistence = CapacitorFallback.isNativePlatform()
                ? browserLocalPersistence
                : indexedDBLocalPersistence;
              auth = initializeAuth(app, { persistence });
              debugLog('initializeAuth OK (' + (CapacitorFallback.isNativePlatform() ? 'localStorage' : 'indexedDB') + ')');
            } catch (initAuthErr) {
              // initializeAuth throws if called twice — fall back to getAuth
              debugLog('initializeAuth failed: ' + initAuthErr?.message + ', using getAuth');
              auth = getAuth(app);
            }
          }
          // console.log('[GhostLog] Auth instance ready');

          // Handle magic link sign-in (must run after Firebase init)
          if (isSignInWithEmailLink(auth, window.location.href)) {
            let email = window.localStorage.getItem('ghostlog_magic_email');
            if (!email) {
              // Magic link needs email confirmation — use requestPrompt after init
              requestPrompt('Enter your email to confirm sign-in:', '', async (promptedEmail) => {
                try {
                  await signInWithEmailLink(auth, promptedEmail, window.location.href);
                  window.localStorage.removeItem('ghostlog_magic_email');
                  window.history.replaceState(null, '', window.location.origin);
                } catch (e) { console.error('Magic link sign-in failed', e); }
              });
              return;
            }
            if (email) {
              try {
                await signInWithEmailLink(auth, email, window.location.href);
                window.localStorage.removeItem('ghostlog_magic_email');
                window.history.replaceState(null, '', window.location.origin);
              } catch (e) {
                console.error('Magic link sign-in failed', e);
                const code = e?.code || '';
                if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') {
                  setAuthError('This magic link has expired. Please request a new one.');
                } else {
                  setAuthError('Magic link sign-in failed. Please try again.');
                }
              }
            }
          }

          setAuthPhase('auth-listener');
          debugLog('Registering onAuthStateChanged...');
          // console.log('[GhostLog] Registering onAuthStateChanged...');
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            clearTimeout(authTimeout);
            debugLog('onAuthStateChanged: ' + (user ? user.email : 'null'));
            // console.log('[GhostLog] onAuthStateChanged fired, user:', !!user, user?.email);
            if (user) {
              authResolvedRef.current = true;
              setCloudUser(user);
              setCloudStatus('synced');
              setAuthPhase('authenticated');
              setAuthLoading(false); // Show app immediately — don't wait for data
              loadCloudData(user.uid).catch(e => console.warn('Cloud data load failed', e));
              setupRevenueCat(user.uid).catch(e => console.warn('RevenueCat setup failed', e));
            } else {
              setCloudUser(null);
              setCloudStatus('disconnected');
              setIsPro(false);
              setDataLoaded(false);
              setAuthPhase('no-user');
              setAuthLoading(false);
            }
          });
          // Store ref so useEffect cleanup can call it
          authUnsubscribeRef.current = unsubscribe;
        } catch (e) {
          console.error("Firebase Init Failed", e);
          debugLog('Firebase init FAILED: ' + e?.message);
          clearTimeout(authTimeout);
          setAuthLoading(false);
        }
      })();
    } else {
      clearTimeout(authTimeout);
      setAuthLoading(false);
    }

    return () => {
      clearTimeout(authTimeout);
      if (authUnsubscribeRef.current) authUnsubscribeRef.current();
    };
  }, []);

  // --- AUTH HANDLERS ---
  const handleAuth = async (email, password, isSignUp) => {
    // console.log('[GhostLog] handleAuth called, isSignUp:', isSignUp);
    setAuthLoading(true);
    setAuthPhase(isSignUp ? 'signing-up' : 'signing-in');
    setAuthError(null);

    const isNative = CapacitorFallback.isNativePlatform();

    if (isNative) {
      // NATIVE: Use REST API to completely bypass Firebase SDK auth calls.
      // signInWithEmailAndPassword can hang in WKWebView if persistence is broken.
      // REST API uses plain fetch() — zero WKWebView dependencies.
      debugLog('handleAuth: using REST API (native)');
      try {
        const restResult = isSignUp
          ? await firebaseRestEmailSignUp(email, password)
          : await firebaseRestEmailSignIn(email, password);
        debugLog('REST auth success: ' + (restResult.email || restResult.localId));
        injectFirebaseSession(restResult, 'password');
        // Reload so Firebase picks up the injected session from localStorage
        window.location.reload();
        return;
      } catch (e) {
        console.error('[GhostLog] REST auth error:', e?.message);
        debugLog('REST auth error: ' + e?.message);
        setAuthError(mapRestAuthError(e?.message));
        setAuthPhase('error');
        setAuthLoading(false);
      }
    } else {
      // WEB: Use Firebase SDK directly (works fine outside WKWebView)
      const safetyTimer = setTimeout(() => {
        // console.warn('[GhostLog] handleAuth safety timeout hit');
        setAuthLoading(false);
        setAuthPhase('auth-timeout');
      }, 10000);
      try {
        const auth = getAuth();
        let result;
        if (isSignUp) {
          result = await createUserWithEmailAndPassword(auth, email, password);
        } else {
          result = await signInWithEmailAndPassword(auth, email, password);
        }
        clearTimeout(safetyTimer);
        // console.log('[GhostLog] Auth success, user:', result?.user?.email);
        if (result?.user) {
          setCloudUser(result.user);
          setCloudStatus('synced');
          setAuthPhase('authenticated');
          loadCloudData(result.user.uid);
        }
        setAuthLoading(false);
      } catch (e) {
        clearTimeout(safetyTimer);
        console.error('[GhostLog] Auth error:', e?.code, e?.message);
        const code = e?.code || '';
        if (code === 'auth/email-already-in-use') setAuthError('Email already in use');
        else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') setAuthError('Invalid email or password');
        else if (code === 'auth/weak-password') setAuthError('Password must be at least 6 characters');
        else if (code === 'auth/invalid-email') setAuthError('Invalid email address');
        else setAuthError(e.message);
        setAuthPhase('error');
        setAuthLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    // console.log('[GhostLog] handleGoogleSignIn called');
    debugLog('handleGoogleSignIn called');
    setAuthLoading(true);
    setAuthPhase('google-auth');
    setAuthError(null);
    // Safety: force stop loading after 15s (Google auth can be slow)
    // Stored in ref so deep link handler can clear it on success
    clearTimeout(googleSafetyTimerRef.current);
    googleSafetyTimerRef.current = setTimeout(() => {
      // console.warn('[GhostLog] Google auth safety timeout hit');
      debugLog('Google auth safety timeout (15s)');
      setAuthLoading(false);
      setAuthPhase('google-timeout');
    }, 15000);
    try {
      const platform = CapacitorFallback.getPlatform();
      if (platform === 'ios') {
        // iOS: Use ASWebAuthenticationSession via custom WebAuth plugin.
        // The standard @capacitor/browser uses SFSafariViewController which
        // blocks custom URL scheme deep links. ASWebAuthenticationSession
        // has a built-in callbackURLScheme parameter that works.
        try {
          const { registerPlugin } = await import('@capacitor/core');
          const WebAuth = registerPlugin('WebAuth');
          const result = await WebAuth.start({
            url: 'https://ghost-log.vercel.app/auth-redirect.html',
            callbackScheme: 'com.ghostlog.app'
          });
          // result.url = "com.ghostlog.app://google-auth?idToken=<googleIdToken>"
          const callbackUrl = result.url || '';
          // console.log('WebAuth callback:', callbackUrl);
          debugLog('WebAuth callback URL: ' + callbackUrl.substring(0, 100) + '...');
          const qs = callbackUrl.split('?')[1] || '';
          const params = new URLSearchParams(qs);
          const idToken = params.get('idToken') || null;
          if (idToken) {
            clearTimeout(googleSafetyTimerRef.current);
            debugLog('WebAuth: Got ID token, calling REST API (bypasses WKWebView hang)...');
            const restResult = await firebaseRestGoogleSignIn(idToken);
            injectFirebaseSession(restResult);
            debugLog('Firebase session injected via REST API, reloading app...');
            window.location.reload();
            return;
          } else {
            clearTimeout(googleSafetyTimerRef.current);
            debugLog('WebAuth: no idToken in callback URL');
            setAuthError('No token received from Google sign-in');
          }
          setAuthLoading(false);
        } catch (pluginErr) {
          // WebAuth plugin not available (e.g. older TestFlight build) — fall back to Browser
          if (String(pluginErr).includes('UNIMPLEMENTED') || String(pluginErr).includes('not implemented')) {
            // console.warn('WebAuth plugin not available, falling back to Browser plugin');
            debugLog('WebAuth UNIMPLEMENTED, using Browser fallback');
            googleAuthStartedAt.current = Date.now();
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: 'https://ghost-log.vercel.app/auth-redirect.html' });
            // Auth completion handled by appUrlOpen listener — safetyTimer stays active via ref
          } else {
            throw pluginErr;
          }
        }
      } else if (platform === 'android') {
        // Android: deep links work fine with @capacitor/browser + SFSafariViewController
        googleAuthStartedAt.current = Date.now();
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: 'https://ghost-log.vercel.app/auth-redirect.html' });
        // Auth completion is handled by the appUrlOpen listener
      } else {
        // Web: use Firebase popup directly
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        if (result?.user) {
          clearTimeout(googleSafetyTimerRef.current);
          setCloudUser(result.user);
          setCloudStatus('synced');
          setAuthPhase('authenticated');
          setAuthLoading(false);
          loadCloudData(result.user.uid);
        }
      }
    } catch (e) {
      clearTimeout(googleSafetyTimerRef.current);
      console.error('[GhostLog] Google sign-in error:', e?.code, e?.message, e);
      const msg = e?.message || '';
      const code = e?.code || e || '';
      // Don't show error for user cancellation
      if (e?.code !== 'auth/popup-closed-by-user' && !msg.includes('canceled') && !msg.includes('cancelled') && code !== 'CANCELLED') {
        const errMsg = `Google sign-in failed: ${e?.code || e?.message || 'Unknown error'}`;
        setAuthError(errMsg);
        setToastMsg(errMsg);
      }
      setAuthPhase('error');
      setAuthLoading(false);
    }
  };

  const handleMagicLink = async (email) => {
    // Don't set authLoading here — it unmounts AuthScreen and loses the "link sent" UI state
    setAuthError(null);
    try {
      const auth = getAuth();
      const baseUrl = CapacitorFallback.isNativePlatform()
        ? 'https://ghost-log.vercel.app'
        : window.location.origin;
      const actionCodeSettings = {
        url: baseUrl + '/?finishSignIn=true',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('ghostlog_magic_email', email);
      setAuthError(null);
      return true; // signal success to show confirmation
    } catch (e) {
      console.error('Magic link error:', e?.code, e?.message, e);
      const code = e?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setAuthError('Magic link sign-in is not enabled. Enable "Email link" in Firebase Console → Authentication → Sign-in method.');
      } else if (code === 'auth/invalid-email') {
        setAuthError('Invalid email address.');
      } else if (code === 'auth/too-many-requests') {
        setAuthError('Too many attempts. Please wait a moment and try again.');
      } else {
        setAuthError(`Failed to send magic link: ${e?.code || ''} ${e?.message || 'Unknown error'}`.trim());
      }
      return false;
    }
  };

  const handleForgotPassword = async (email) => {
    setAuthError(null);
    try {
      const auth = getAuth();
      const actionCodeSettings = {
        url: 'https://ghost-log.vercel.app/',
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      return true;
    } catch (e) {
      const code = e?.code || '';
      if (code === 'auth/user-not-found') setAuthError('No account found with this email');
      else if (code === 'auth/invalid-email') setAuthError('Invalid email address');
      else setAuthError('Failed to send reset email. Try again.');
      return false;
    }
  };

  const handleResetConfirm = async (oobCode, email, newPassword) => {
    setAuthError(null);
    try {
      const auth = getAuth();
      await confirmPasswordReset(auth, oobCode, newPassword);
      // Auto sign in with the new password
      const result = await signInWithEmailAndPassword(auth, email, newPassword);
      if (result?.user) {
        setCloudUser(result.user);
        setCloudStatus('synced');
        setAuthLoading(false);
        loadCloudData(result.user.uid);
      }
      setPendingPasswordReset(null);
    } catch (e) {
      const code = e?.code || '';
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setAuthError('This reset link has expired. Please request a new one.');
        setPendingPasswordReset(null);
      } else if (code === 'auth/weak-password') {
        setAuthError('Password must be at least 6 characters.');
      } else {
        setAuthError('Password reset failed: ' + (e?.message || 'Unknown error'));
      }
    }
  };

  // Magic link completion is handled inside Firebase init useEffect above

  // Listen for deep links (Google auth fallback + magic link from Safari redirect)
  // Timestamp-based tracking: records WHEN Google auth was initiated.
  // Deep links are accepted within 120s of initiation, regardless of browser/timeout events.
  const googleAuthStartedAt = useRef(0);
  useEffect(() => {
    if (!CapacitorFallback.isNativePlatform()) return;
    let deepLinkCleanup, browserCleanup;
    (async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');

        // Reset authLoading if user dismisses browser without completing Google auth
        // (works on both Android and iOS Browser plugin fallback)
        try {
          const { Browser } = await import('@capacitor/browser');
          browserCleanup = await Browser.addListener('browserFinished', () => {
            debugLog('browserFinished event');
            // Give deep link 5s to arrive after browser closes (iOS can be slow)
            setTimeout(() => {
              if (!googleAuthStartedAt.current) return; // Already handled by deep link
              debugLog('browserFinished: resetting auth (deep link never arrived)');
              googleAuthStartedAt.current = 0;
              setAuthLoading(false);
            }, 5000);
          });
        } catch (_) {}

        deepLinkCleanup = await CapApp.addListener('appUrlOpen', async ({ url }) => {
          // console.log('Deep link received:', url);
          debugLog('Deep link: ' + url);

          // Handle Google auth deep link (Browser fallback path for Android / iOS without WebAuth)
          // auth-redirect.html sends: com.ghostlog.app://google-auth?idToken=<googleIdToken>
          // Uses REST API instead of signInWithCredential (which hangs in WKWebView).
          if (url.includes('google-auth')) {
            const elapsed = Date.now() - googleAuthStartedAt.current;
            if (!googleAuthStartedAt.current || elapsed > 120000) {
              debugLog('Ignoring google-auth deep link (no active auth, elapsed=' + elapsed + 'ms)');
              return;
            }
            googleAuthStartedAt.current = 0;
            clearTimeout(googleSafetyTimerRef.current);
            debugLog('Google auth deep link received (elapsed=' + elapsed + 'ms)');
            try {
              const qs = url.split('?')[1] || '';
              const params = new URLSearchParams(qs);
              const idToken = params.get('idToken') || null;
              if (idToken) {
                debugLog('Got Google ID token, calling REST API (bypasses WKWebView hang)...');
                const restResult = await firebaseRestGoogleSignIn(idToken);
                injectFirebaseSession(restResult);
                debugLog('Firebase session injected via REST API, reloading app...');
                try { const { Browser } = await import('@capacitor/browser'); Browser.close(); } catch (_) {}
                window.location.reload();
                return;
              } else {
                debugLog('No idToken in google-auth deep link');
                setAuthError('Sign-in failed — no token received');
              }
            } catch (e) {
              console.error('Google auth REST API failed', e);
              debugLog('REST API sign-in FAILED: ' + e?.message);
              const errMsg = 'Google sign-in failed: ' + (e?.message || 'Unknown error');
              setAuthError(errMsg);
              setToastMsg(errMsg);
            }
            setAuthLoading(false);
            try { const { Browser } = await import('@capacitor/browser'); Browser.close(); } catch (_) {}
          }

          // Handle password reset deep link from email
          // URL format: com.ghostlog.app://reset-password?oobCode=XXX
          if (url.includes('reset-password')) {
            // console.log('Password reset deep link received');
            try {
              const qs = url.split('?')[1] || '';
              const params = new URLSearchParams(qs);
              const oobCode = params.get('oobCode');
              if (oobCode) {
                const auth = getAuth();
                const email = await verifyPasswordResetCode(auth, oobCode);
                setPendingPasswordReset({ oobCode, email });
                setAuthLoading(false);
              } else {
                setAuthError('Invalid password reset link.');
              }
            } catch (e) {
              console.error('Password reset deep link failed', e);
              setAuthError('This reset link has expired. Please request a new one.');
            }
            setAuthLoading(false);
          }

          // Handle magic link deep link from Safari redirect
          // URL format: com.ghostlog.app://magic-link?url=<encoded-firebase-magic-link-url>
          // Uses REST API because signInWithEmailLink internally calls signInWithCredential
          // which hangs in WKWebView.
          if (url.includes('magic-link')) {
            // console.log('Magic link deep link received');
            debugLog('Magic link deep link received');
            setAuthLoading(true);
            try {
              const qs = url.split('?')[1] || '';
              const params = new URLSearchParams(qs);
              const magicUrl = params.get('url');
              debugLog('Magic link URL: ' + (magicUrl || 'null')?.substring(0, 80));
              if (magicUrl) {
                // Extract oobCode from the magic link URL
                const magicParams = new URLSearchParams(new URL(magicUrl).search);
                const oobCode = magicParams.get('oobCode');
                const email = window.localStorage.getItem('ghostlog_magic_email');
                debugLog('Magic link oobCode: ' + (oobCode ? 'present' : 'missing') + ', email: ' + (email || 'missing'));
                if (oobCode && email) {
                  // Use REST API to bypass signInWithCredential hang in WKWebView
                  debugLog('Calling REST API for email link sign-in...');
                  const restResult = await firebaseRestEmailLinkSignIn(email, oobCode);
                  injectFirebaseSession(restResult, 'password');
                  window.localStorage.removeItem('ghostlog_magic_email');
                  debugLog('Magic link sign-in success via REST API, reloading...');
                  window.location.reload();
                  return;
                } else if (!email) {
                  setAuthError('Email not found. Please try sending the magic link again.');
                  setToastMsg('Email not found — try sending the magic link again');
                } else {
                  setAuthError('Invalid magic link (no code). Please request a new one.');
                  setToastMsg('Invalid magic link — request a new one');
                }
              } else {
                setAuthError('No magic link URL received.');
                setToastMsg('No magic link URL received');
              }
            } catch (e) {
              console.error('Magic link REST API sign-in failed', e);
              debugLog('Magic link REST FAILED: ' + e?.message);
              const errMsg = 'Magic link sign-in failed: ' + (e?.message || 'Unknown error');
              setAuthError(errMsg);
              setToastMsg(errMsg);
            }
            setAuthLoading(false);
          }
        });
      } catch (e) { console.error('Deep link listener setup failed', e); }
    })();
    return () => {
      if (deepLinkCleanup) deepLinkCleanup.remove();
      if (browserCleanup) browserCleanup.remove();
    };
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      setCloudUser(null);
      setCloudStatus('disconnected');
    } catch (e) {
      setToastMsg("Logout failed: " + e.message);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) { setToastMsg("Not signed in"); return; }
      const db = getFirestore();
      await deleteDoc(doc(db, `artifacts/${FIREBASE_CONFIG.appId || 'ghost-log'}/users/${user.uid}/userData/backup`));
      await deleteUser(user);
      setCloudUser(null);
      setCloudStatus('disconnected');
      localStorage.clear();
      setToastMsg("Account deleted. All data removed.");
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') {
        setToastMsg("Please log out and log back in, then try deleting again.");
      } else {
        setToastMsg("Delete failed: " + e.message);
      }
    }
  };

  // --- CLOUD SYNC ENGINE (push all data) ---
  useEffect(() => {
    if (!cloudUser || !FIREBASE_CONFIG.apiKey || !dataLoaded) return;

    const syncDataToCloud = async () => {
      setCloudStatus('syncing');
      try {
        await setDoc(getUserRef(cloudUser.uid), {
          updatedAt: new Date().toISOString(),
          workoutSplits,
          savedMeals,
          statsHistory,
          workoutHistory,
          dailyLog,
          userTargets,
          customExercises,
          phase
        }, { merge: true });

        setCloudStatus('synced');
      } catch (e) {
        console.error("Cloud Sync Failed", e);
        setCloudStatus('disconnected');
      }
    };

    const timer = setTimeout(syncDataToCloud, 3000);
    return () => clearTimeout(timer);
  }, [workoutSplits, savedMeals, statsHistory, workoutHistory, dailyLog, userTargets, customExercises, phase, cloudUser, dataLoaded]);

  // --- PREMIUM LOCK GUARDS ---
  const handlePremiumFeature = (action) => {
    if (isPro) { action(); } else { setShowPaywall(true); }
  };

  const handleSubscribeClick = async () => {
    // Require sign-in before purchasing Pro
    if (!cloudUser) {
      setShowPaywall(false);
      setToastMsg('Sign in first to subscribe (Settings → Account)');
      setShowSettings(true);
      return;
    }
    setIsPaywallLoading(true);
    if (!CapacitorFallback.isNativePlatform()) {
      setTimeout(() => {
        setIsPro(true);
        setShowPaywall(false);
        setIsPaywallLoading(false);
        setToastMsg("Welcome to Pro! (Web Bypass)");
      }, 1500);
      return;
    }

    try {
      const RC = await getRevenueCat();
      const offerings = await RC.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        // Use .monthly if available, otherwise fall back to first available package
        const pkg = offerings.current.monthly || offerings.current.availablePackages[0];
        const { customerInfo } = await RC.purchasePackage({ aPackage: pkg });
        if (typeof customerInfo?.entitlements?.active['pro'] !== "undefined") {
          setIsPro(true);
          setShowPaywall(false);
          setToastMsg("Welcome to GhostLog Pro!");
        }
      } else {
        setToastMsg("No packages configured in RevenueCat yet.");
      }
    } catch (e) {
      if (!e.userCancelled) setToastMsg("Purchase failed. Try again.");
    }
    setIsPaywallLoading(false);
  };

  const handleRestorePurchases = async () => {
    if (!CapacitorFallback.isNativePlatform()) {
      setToastMsg("Restore is only available on mobile devices.");
      return;
    }
    setIsPaywallLoading(true);
    try {
      const RC = await getRevenueCat();
      const info = await RC.restorePurchases();
      if (typeof info?.customerInfo?.entitlements?.active['pro'] !== "undefined") {
        setIsPro(true);
        setShowPaywall(false);
        setToastMsg("Pro restored successfully!");
      } else {
        setToastMsg("No active subscription found.");
      }
    } catch (e) {
      setToastMsg("Restore failed. Try again.");
    }
    setIsPaywallLoading(false);
  };

  // Cooldown & Startup Modals
  useEffect(() => { if (aiCooldown > 0) { const timer = setTimeout(() => setAiCooldown(c => c - 1), 1000); return () => clearTimeout(timer); } }, [aiCooldown]);
  useEffect(() => {
    if (!dataLoaded) return;
    const today = getLocalDate();
    // Show onboarding for brand new users (no workout history and no stats)
    if (workoutHistory.length === 0 && statsHistory.length === 0) {
      setShowOnboarding(true);
    } else if (!statsHistory.some(entry => entry.date === today)) {
      setLogDate(today);
      setShowDailyCheckin(true);
    }
  }, [dataLoaded]);

  // Calculate workout streak
  const workoutStreak = React.useMemo(() => {
    if (!workoutHistory.length) return 0;
    const dates = [...new Set(workoutHistory.map(w => w.date))].sort().reverse();
    let streak = 0;
    const today = getLocalDate();
    const checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break; // streak broken
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  }, [workoutHistory]);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const requestConfirm = (msg, action) => { setConfirmState({ isOpen: true, message: msg, onConfirm: () => { action(); setConfirmState({ isOpen: false, message: '', onConfirm: null }); } }); };
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });
  const [promptState, setPromptState] = useState({ isOpen: false, message: '', defaultValue: '', onSubmit: null });
  const requestPrompt = (msg, defaultVal, action) => { setPromptState({ isOpen: true, message: msg, defaultValue: defaultVal || '', onSubmit: (val) => { action(val); setPromptState({ isOpen: false, message: '', defaultValue: '', onSubmit: null }); } }); };

  // App Actions
  const handleSortSplits = () => { let _s = [...workoutSplits]; const d = _s.splice(dragItem.current, 1)[0]; _s.splice(dragOverItem.current, 0, d); dragItem.current=null; dragOverItem.current=null; setWorkoutSplits(_s); };
  const handleSortMeals = () => { let _m = [...savedMeals]; const d = _m.splice(dragItem.current, 1)[0]; _m.splice(dragOverItem.current, 0, d); dragItem.current=null; dragOverItem.current=null; setSavedMeals(_m); };
  const addSplit = () => { requestPrompt("New split name:", '', (n) => setWorkoutSplits(prev => [...prev, {id:`s-${Date.now()}`,name:n,exercises:[]}])); };
  const deleteSplit = (id) => { requestConfirm("Delete this split?", () => setWorkoutSplits(workoutSplits.filter(s=>s.id!==id))); };
  const renameSplit = (id, old) => { requestPrompt("Rename split:", old, (n) => setWorkoutSplits(prev => prev.map(s=>s.id===id?{...s,name:n}:s))); };
  const deleteSavedMeal = (id) => setSavedMeals(savedMeals.filter(m=>m.id!==id));
  const logMeal = (meal) => { const m=meal.ingredients.reduce((a,i)=>({cal:a.cal+i.cal,p:a.p+i.p,c:a.c+i.c,f:a.f+i.f}),{cal:0,p:0,c:0,f:0}); setDailyLog([...dailyLog, {name:meal.name, totalCals:m.cal, totalP:m.p, totalC:m.c, totalF:m.f}]); setToastMsg("Meal Logged"); };
  const deleteLogItem = (i) => setDailyLog(dailyLog.filter((_,idx)=>idx!==i));
  const submitDailyLog = () => {
    const idx = statsHistory.findIndex(e => e.date === logDate);
    const entry = {
      date: logDate, weight: parseFloat(dailyStatsInput.weight)||0, steps: parseFloat(dailyStatsInput.steps)||0, water: parseFloat(dailyStatsInput.water)||0,
      activity: parseInt(dailyStatsInput.activity)||3, cals: dailyTotals.cal||0, sleep: parseFloat(dailyStatsInput.sleepHours)||0, stress: dailyStatsInput.stress, fatigue: dailyStatsInput.fatigue, cardio: parseFloat(dailyStatsInput.cardio)||0
    };
    if (idx >= 0) { const h = [...statsHistory]; h[idx] = { ...h[idx], ...entry }; setStatsHistory(h); }
    else setStatsHistory([...statsHistory, entry].sort((a,b) => new Date(a.date) - new Date(b.date)));
    setShowDailyCheckin(false); setToastMsg("Daily Log Saved");
  };

  const dailyTotals = dailyLog.reduce((acc, item) => ({ cal: acc.cal + item.totalCals, p: acc.p + item.totalP, c: acc.c + item.totalC, f: acc.f + item.totalF }), { cal: 0, p: 0, c: 0, f: 0 });
  const currentTargets = userTargets[phase] || INITIAL_TARGETS.CUT;

  // No auth gate — app is always usable. Sign-in is optional (from Settings) for cloud sync.

  return (
    <ErrorBoundary>
      <div className="bg-black min-h-screen text-gray-100 font-sans relative overflow-hidden pt-16">
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
        <ConfirmModal isOpen={confirmState.isOpen} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState({isOpen:false, message:'', onConfirm:null})} />
        <PromptModal isOpen={promptState.isOpen} message={promptState.message} defaultValue={promptState.defaultValue} onSubmit={promptState.onSubmit} onCancel={() => setPromptState({isOpen:false, message:'', defaultValue:'', onSubmit:null})} />

        {showOnboarding && <OnboardingModal onComplete={() => { setShowOnboarding(false); setLogDate(getLocalDate()); setShowDailyCheckin(true); }} setPhase={setPhase} setUserTargets={setUserTargets} userTargets={userTargets} />}

        <SettingsPanel show={showSettings} onClose={() => setShowSettings(false)} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} userEmail={cloudUser?.email} requestConfirm={requestConfirm} onAuth={handleAuth} onForgotPassword={handleForgotPassword} authLoading={authLoading} authError={authError} />

        <DailyCheckinModal isOpen={showDailyCheckin} onClose={()=>setShowDailyCheckin(false)} stats={dailyStatsInput} setStats={setDailyStatsInput} onSave={submitDailyLog} date={logDate} setDate={setLogDate}/>

        <AddMealModal isOpen={showAddMealModal} onClose={()=>setShowAddMealModal(false)} onSave={(m)=>setSavedMeals([...savedMeals, m])} setToast={setToastMsg} aiCooldown={aiCooldown} setAiCooldown={setAiCooldown} />

        <TargetEditorModal isOpen={showTargetModal} onClose={()=>setShowTargetModal(false)} activePhase={phase} setActivePhase={setPhase} targets={userTargets} setTargets={setUserTargets} currentWeight={dailyStatsInput.weight} setToast={setToastMsg} aiCooldown={aiCooldown} setAiCooldown={setAiCooldown} />

        <GhostChefModal isOpen={showGhostChefModal} onClose={()=>setShowGhostChefModal(false)} targets={currentTargets} currentTotals={dailyTotals} setToast={setToastMsg} aiCooldown={aiCooldown} setAiCooldown={setAiCooldown} />

        <CardioModal isOpen={showCardioModal} onClose={() => setShowCardioModal(false)} onSave={(session) => {
           const log = { date: getLocalDate(), name: session.name, type: 'cardio', exercises: [], cardioData: session };
           setWorkoutHistory([...workoutHistory, log]);
           const today = getLocalDate();
           const existingIdx = statsHistory.findIndex(e => e.date === today);
           const newMins = session.duration; const newCals = session.calories;
           if (existingIdx >= 0) {
              const updatedStats = [...statsHistory];
              updatedStats[existingIdx].cardio = (updatedStats[existingIdx].cardio || 0) + newMins;
              updatedStats[existingIdx].cardioCalories = (updatedStats[existingIdx].cardioCalories || 0) + newCals;
              setStatsHistory(updatedStats);
           } else { setStatsHistory([...statsHistory, { date: today, cardio: newMins, cardioCalories: newCals }].sort((a,b) => new Date(a.date) - new Date(b.date))); }
           setToastMsg("Cardio Logged");
        }} />

        <GhostAiPanel show={showGhostPanel} onClose={()=>setShowGhostPanel(false)} workoutHistory={workoutHistory} setToast={setToastMsg} statsHistory={statsHistory} userTargets={currentTargets} phase={phase} dailyLog={dailyLog} isPro={isPro} handlePremiumFeature={handlePremiumFeature} aiCooldown={aiCooldown} setAiCooldown={setAiCooldown}/>

        {/* Floating Ghost AI Button */}
        {!showGhostPanel && !showDailyCheckin && !showAddMealModal && !showTargetModal && !showGhostChefModal && !showCardioModal && !showPaywall && (
          <button onClick={()=>setShowGhostPanel(true)} className="fixed bottom-24 right-4 accent-bg text-white p-4 rounded-full shadow-lg z-40 accent-glow transition-all active:scale-95">
            <GhostLogo size={24}/>
          </button>
        )}

        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} onSubscribe={handleSubscribeClick} onRestore={handleRestorePurchases} loading={isPaywallLoading}/>

        {/* HEADER */}
        <div className="bg-gray-950 border-b border-gray-800/50 px-5 pb-5 pt-14 fixed top-0 left-0 right-0 z-20 safe-area-top">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GhostLogo size={28}/>
                <h1 className="text-2xl font-black tracking-tight text-white">GHOST<span className="text-gray-500">LOG</span></h1>
                {isPro && <span className="accent-bg text-white text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">PRO</span>}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {cloudStatus === 'synced' ? <Cloud size={11} className="accent-text"/> : cloudStatus === 'syncing' ? <Loader2 size={11} className="animate-spin text-gray-400"/> : <CloudOff size={11} className="text-gray-500"/>}
                  {cloudStatus === 'synced' ? 'Synced' : cloudStatus === 'syncing' ? 'Syncing...' : !cloudUser ? 'Local Only' : 'Local'}
                </div>
                {workoutStreak > 0 && (
                  <span className="text-[10px] font-bold text-orange-400 flex items-center gap-0.5 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                    🔥 {workoutStreak}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                <Settings size={16} className="text-gray-500"/>
              </button>
              <button onClick={()=>handlePremiumFeature(() => setShowTargetModal(true))} className={`text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-1 transition-all ${phase==='CUT'?'text-red-400 border-red-500/30 bg-red-500/5': phase==='BULK' ? 'text-green-400 border-green-500/30 bg-green-500/5' : 'accent-text accent-border-dim accent-bg-dim'}`}>
                    {phase} {!isPro && <Lock size={10} className="ml-1 opacity-50"/>}
              </button>
            </div>
          </div>

          {/* STAT DASHBOARD */}
          <div className="grid grid-cols-4 gap-3 mt-1">
             {activeTab === 'train' && [
               {icon: TrendingUp, val: dailyStatsInput.weight||'-', lbl: 'Weight', col: 'accent-text'},
               {icon: Footprints, val: dailyStatsInput.steps > 1000 ? (dailyStatsInput.steps/1000).toFixed(1)+'k' : (dailyStatsInput.steps||'-'), lbl: 'Steps', col: 'text-gray-300'},
               {icon: BrainCircuit, val: `${dailyStatsInput.stress}/5`, lbl: 'Stress', col: dailyStatsInput.stress>3?'text-red-400':'text-green-400'},
               {icon: Battery, val: `${dailyStatsInput.fatigue}/5`, lbl: 'Fatigue', col: dailyStatsInput.fatigue>3?'text-red-400':'text-green-400'}
             ].map((s,i) => <div key={i} className="bg-gray-900/80 p-3 rounded-xl text-center border border-gray-800/50"><s.icon size={16} className={`mx-auto mb-1.5 ${s.col}`}/><p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.lbl}</p><p className="text-white font-bold text-sm">{s.val}</p></div>)}

             {activeTab === 'eat' && [
               {icon: Flame, val: `${dailyTotals.cal}/${currentTargets.cal}`, lbl: 'Cals', col: 'accent-text', over: dailyTotals.cal > currentTargets.cal},
               {icon: Beef, val: `${dailyTotals.p}/${currentTargets.p}`, lbl: 'Prot', col: 'text-red-400', over: false},
               {icon: Wheat, val: `${dailyTotals.c}/${currentTargets.c}`, lbl: 'Carb', col: 'text-orange-400', over: false},
               {icon: Droplet, val: `${dailyTotals.f}/${currentTargets.f}`, lbl: 'Fat', col: 'text-yellow-400', over: false}
             ].map((s,i) => <div key={i} className={`bg-gray-900/80 p-3 rounded-xl text-center border ${s.over ? 'border-red-500/40' : 'border-gray-800/50'}`}><s.icon size={16} className={`mx-auto mb-1.5 ${s.col}`}/><p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.lbl}</p><p className="text-white font-bold text-sm">{s.val}</p></div>)}
             {activeTab === 'stats' && <div className="col-span-4 h-12 flex items-center justify-center"><p className="text-gray-600 text-xs uppercase tracking-[0.2em] font-bold">Analytics Dashboard</p></div>}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="pt-48 pb-32">
           {activeTab === 'train' && <div className="p-4"><TrainTab workoutSplits={workoutSplits} setWorkoutSplits={setWorkoutSplits} workoutHistory={workoutHistory} setWorkoutHistory={setWorkoutHistory} workoutEditMode={workoutEditMode} setWorkoutEditMode={setWorkoutEditMode} addSplit={addSplit} deleteSplit={deleteSplit} renameSplit={renameSplit} handleSortSplits={handleSortSplits} dragItem={dragItem} dragOverItem={dragOverItem} phase={phase} dailyStats={dailyStatsInput} requestConfirm={requestConfirm} requestPrompt={requestPrompt} setShowCardioModal={setShowCardioModal} customExercises={customExercises} onCreateExercise={(name) => setCustomExercises(prev => [...new Set([...prev, name])])}/></div>}

           {activeTab === 'eat' && <div className="p-4"><EatTab savedMeals={savedMeals} dailyLog={dailyLog} mealEditMode={mealEditMode} setMealEditMode={setMealEditMode} setShowAddMealModal={setShowAddMealModal} setShowGhostChefModal={setShowGhostChefModal} logMeal={logMeal} deleteSavedMeal={deleteSavedMeal} deleteLogItem={deleteLogItem} getMealMacros={(m)=>m.ingredients.reduce((a,i)=>({cal:a.cal+i.cal,p:a.p+i.p,c:a.c+i.c,f:a.f+i.f}),{cal:0,p:0,c:0,f:0})} dragItem={dragItem} dragOverItem={dragOverItem} handleSortMeals={handleSortMeals} requestConfirm={requestConfirm} userTargets={currentTargets} dailyStats={dailyStatsInput} isPro={isPro} handlePremiumFeature={handlePremiumFeature}/></div>}

           {activeTab === 'stats' && <div className="p-4"><StatsTab statsHistory={statsHistory} setLogDate={setLogDate} setShowDailyCheckin={setShowDailyCheckin} workoutHistory={workoutHistory} setToast={setToastMsg} userTargets={currentTargets} phase={phase} aiCooldown={aiCooldown} setAiCooldown={setAiCooldown} isPro={isPro} handlePremiumFeature={handlePremiumFeature} savedMeals={savedMeals} /></div>}
        </div>

        {/* BOTTOM NAV */}
        <div className="fixed bottom-0 w-full bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 p-3 pb-9 z-40 safe-area-bottom">
          <div className="flex justify-around items-center">
            {[
              { id: 'train', icon: Dumbbell, label: 'LIFT' },
              { id: 'eat', icon: Utensils, label: 'EAT' },
              { id: 'stats', icon: BarChart3, label: 'STATS' },
            ].map(tab => (
              <button key={tab.id} onClick={()=>{ setActiveTab(tab.id); hapticSelection(); }}
                className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${activeTab===tab.id ? 'accent-text' : 'text-gray-600'}`}>
                <tab.icon size={24} strokeWidth={activeTab===tab.id ? 2.5 : 1.5}/>
                <span className={`text-[10px] font-bold tracking-wider ${activeTab===tab.id ? '' : 'text-gray-600'}`}>{tab.label}</span>
                {activeTab===tab.id && <div className="w-1.5 h-1.5 rounded-full accent-bg"/>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
