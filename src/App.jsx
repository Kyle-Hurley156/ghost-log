import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell, Utensils, BarChart3, Lock, Cloud, CloudOff, Loader2, Settings,
  TrendingUp, Footprints, BrainCircuit, Battery, Flame, Beef, Wheat, Droplet
} from 'lucide-react';

import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithCredential, signInWithPopup, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

import { FIREBASE_CONFIG, INITIAL_SPLITS, INITIAL_TARGETS } from './constants';
import { getLocalDate, useStickyState } from './helpers';

import { AuthScreen } from './components/AuthScreen';
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
import { AddMealModal } from './components/AddMealModal';
import { DailyCheckinModal } from './components/DailyCheckinModal';
import { TrainTab } from './components/TrainTab';
import { EatTab } from './components/EatTab';
import { StatsTab } from './components/StatsTab';

// --- FALLBACKS FOR WEB PREVIEW ---
const CapacitorFallback = typeof Capacitor !== 'undefined' ? Capacitor : {
  isNativePlatform: () => false,
  getPlatform: () => 'web'
};

const PurchasesFallback = typeof Purchases !== 'undefined' ? Purchases : {
  configure: () => {},
  getCustomerInfo: async () => ({ entitlements: { active: {} } }),
  getOfferings: async () => ({ current: null }),
  purchasePackage: async () => ({ customerInfo: { entitlements: { active: {} } } })
};

// Ghost Logo SVG component matching the brand
const GhostLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8C30 8 18 24 18 42v32c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8V42C82 24 70 8 50 8z" fill="white"/>
    <circle cx="38" cy="38" r="5" fill="black"/>
    <circle cx="62" cy="38" r="5" fill="black"/>
    <ellipse cx="50" cy="52" rx="4" ry="3" fill="black"/>
  </svg>
);

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
  const [dataLoaded, setDataLoaded] = useState(false);

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
    } catch (e) {
      console.error("Failed to load cloud data", e);
    }
    setDataLoaded(true);
  };

  // --- INITIALIZATION (FIREBASE & REVENUECAT) ---
  useEffect(() => {
    const setupRevenueCat = async () => {
      if (CapacitorFallback.isNativePlatform()) {
        try {
          const platform = CapacitorFallback.getPlatform();
          const rcKey = platform === 'ios' ? import.meta.env?.VITE_RC_APPLE_KEY : import.meta.env?.VITE_RC_GOOGLE_KEY;
          if (rcKey) {
            await PurchasesFallback.configure({ apiKey: rcKey });
            const info = await PurchasesFallback.getCustomerInfo();
            if (typeof info.entitlements.active['pro'] !== "undefined") setIsPro(true);
          }
        } catch (e) { console.error("RevenueCat Init Error", e); }
      }
    };
    setupRevenueCat();

    // Safety net: if auth hasn't resolved in 5s, stop waiting
    const authTimeout = setTimeout(() => {
      setAuthLoading(prev => {
        if (prev) console.warn("Auth timeout — forcing load");
        return false;
      });
    }, 5000);

    if (FIREBASE_CONFIG.apiKey) {
      (async () => {
        try {
          const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
          const auth = getAuth(app);
          // Use localStorage instead of indexedDB — indexedDB hangs in WKWebView
          await setPersistence(auth, browserLocalPersistence);

          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            clearTimeout(authTimeout);
            if (user) {
              setCloudUser(user);
              setCloudStatus('synced');
              await loadCloudData(user.uid);
            } else {
              setCloudUser(null);
              setCloudStatus('disconnected');
              setDataLoaded(false);
            }
            setAuthLoading(false);
          });
          return () => unsubscribe();
        } catch (e) {
          console.error("Firebase Init Failed", e);
          clearTimeout(authTimeout);
          setAuthLoading(false);
        }
      })();
    } else {
      clearTimeout(authTimeout);
      setAuthLoading(false);
    }

    return () => clearTimeout(authTimeout);
  }, []);

  // --- AUTH HANDLERS ---
  const handleAuth = async (email, password, isSignUp) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const auth = getAuth();
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      const code = e?.code || '';
      if (code === 'auth/email-already-in-use') setAuthError('Email already in use');
      else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') setAuthError('Invalid email or password');
      else if (code === 'auth/weak-password') setAuthError('Password must be at least 6 characters');
      else if (code === 'auth/invalid-email') setAuthError('Invalid email address');
      else setAuthError(e.message);
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (CapacitorFallback.isNativePlatform()) {
        // Native: open Google sign-in in system browser, token returns via deep link
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: 'https://ghost-log.vercel.app/auth-redirect.html' });
        // Auth completion is handled by the appUrlOpen listener (see useEffect below)
        // Don't set authLoading false here — the listener will handle it
      } else {
        // Web: use Firebase popup directly
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } catch (e) {
      const msg = e?.message || '';
      if (e?.code !== 'auth/popup-closed-by-user' && !msg.includes('canceled') && !msg.includes('cancelled')) {
        setAuthError('Google sign-in failed');
      }
      setAuthLoading(false);
    }
  };

  const handleMagicLink = async (email) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const auth = getAuth();
      const actionCodeSettings = {
        url: window.location.origin + '/?finishSignIn=true',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('ghostlog_magic_email', email);
      setAuthError(null);
      setAuthLoading(false);
      return true; // signal success to show confirmation
    } catch (e) {
      setAuthError('Failed to send magic link: ' + (e?.message || ''));
      setAuthLoading(false);
      return false;
    }
  };

  // Handle magic link completion on page load
  useEffect(() => {
    try {
      if (!getApps().length) return; // Firebase not initialized yet
      if (isSignInWithEmailLink(getAuth(), window.location.href)) {
        let email = window.localStorage.getItem('ghostlog_magic_email');
        if (!email) {
          email = window.prompt('Enter your email to confirm sign-in:');
        }
        if (email) {
          signInWithEmailLink(getAuth(), email, window.location.href)
            .then(() => {
              window.localStorage.removeItem('ghostlog_magic_email');
              window.history.replaceState(null, '', window.location.origin);
            })
            .catch(e => console.error('Magic link sign-in failed', e));
        }
      }
    } catch (e) {
      console.error('Magic link check failed', e);
    }
  }, []);

  // Listen for deep link from Google Sign-In browser redirect
  useEffect(() => {
    if (!CapacitorFallback.isNativePlatform()) return;
    let cleanup;
    (async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        cleanup = await CapApp.addListener('appUrlOpen', async ({ url }) => {
          if (url.includes('google-auth')) {
            try {
              const params = new URL(url).searchParams;
              const idToken = params.get('idToken');
              if (idToken) {
                const auth = getAuth();
                const credential = GoogleAuthProvider.credential(idToken);
                await signInWithCredential(auth, credential);
              }
            } catch (e) {
              console.error('Google deep link auth failed', e);
              setAuthError('Google sign-in failed');
            }
            setAuthLoading(false);
            // Close the browser tab
            try { const { Browser } = await import('@capacitor/browser'); Browser.close(); } catch (_) {}
          }
        });
      } catch (e) { console.error('Deep link listener setup failed', e); }
    })();
    return () => { if (cleanup) cleanup.remove(); };
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
      const offerings = await PurchasesFallback.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        const { customerInfo } = await PurchasesFallback.purchasePackage({ aPackage: offerings.current.monthly });
        if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
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

  // App Actions
  const handleSortSplits = () => { let _s = [...workoutSplits]; const d = _s.splice(dragItem.current, 1)[0]; _s.splice(dragOverItem.current, 0, d); dragItem.current=null; dragOverItem.current=null; setWorkoutSplits(_s); };
  const handleSortMeals = () => { let _m = [...savedMeals]; const d = _m.splice(dragItem.current, 1)[0]; _m.splice(dragOverItem.current, 0, d); dragItem.current=null; dragOverItem.current=null; setSavedMeals(_m); };
  const addSplit = () => { const n = window.prompt("Name:"); if(n) setWorkoutSplits([...workoutSplits, {id:`s-${Date.now()}`,name:n,exercises:[]}]); };
  const deleteSplit = (id) => { requestConfirm("Delete this split?", () => setWorkoutSplits(workoutSplits.filter(s=>s.id!==id))); };
  const renameSplit = (id, old) => { const n=window.prompt("Name:",old); if(n) setWorkoutSplits(workoutSplits.map(s=>s.id===id?{...s,name:n}:s)); };
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

  // Show auth screen if not logged in
  if (!cloudUser && !authLoading) {
    return (
      <ErrorBoundary>
        <AuthScreen onAuth={handleAuth} onGoogle={handleGoogleSignIn} onMagicLink={handleMagicLink} loading={authLoading} error={authError} />
      </ErrorBoundary>
    );
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin accent-text" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-black min-h-screen text-gray-100 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-800/50 pt-16">
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
        <ConfirmModal isOpen={confirmState.isOpen} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState({isOpen:false, message:'', onConfirm:null})} />

        {showOnboarding && <OnboardingModal onComplete={() => { setShowOnboarding(false); setLogDate(getLocalDate()); setShowDailyCheckin(true); }} setPhase={setPhase} setUserTargets={setUserTargets} userTargets={userTargets} />}

        <SettingsPanel show={showSettings} onClose={() => setShowSettings(false)} onLogout={handleLogout} userEmail={cloudUser?.email} requestConfirm={requestConfirm} />

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

        <GhostAiPanel show={showGhostPanel} onClose={()=>setShowGhostPanel(false)} workoutHistory={workoutHistory} setToast={setToastMsg}/>

        {/* Floating Ghost AI Button */}
        {!showGhostPanel && !showDailyCheckin && !showAddMealModal && !showTargetModal && !showGhostChefModal && !showCardioModal && !showPaywall && (
          <button onClick={()=>setShowGhostPanel(true)} className="fixed bottom-24 right-4 accent-bg text-white p-4 rounded-full shadow-lg z-40 accent-glow transition-all active:scale-95">
            <GhostLogo size={24}/>
          </button>
        )}

        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} onSubscribe={handleSubscribeClick} loading={isPaywallLoading}/>

        {/* HEADER */}
        <div className="bg-gray-950 border-b border-gray-800/50 px-4 pb-4 pt-14 fixed top-0 left-0 right-0 z-20 max-w-md mx-auto safe-area-top">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GhostLogo size={28}/>
                <h1 className="text-2xl font-black tracking-tight text-white">GHOST<span className="text-gray-500">LOG</span></h1>
                {isPro && <span className="accent-bg text-white text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">PRO</span>}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {cloudStatus === 'synced' ? <Cloud size={11} className="accent-text"/> : cloudStatus === 'syncing' ? <Loader2 size={11} className="animate-spin text-gray-400"/> : <CloudOff size={11} className="text-red-400"/>}
                  {cloudStatus === 'synced' ? 'Synced' : cloudStatus === 'syncing' ? 'Syncing...' : 'Local'}
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
          <div className="grid grid-cols-4 gap-2">
             {activeTab === 'train' && [
               {icon: TrendingUp, val: dailyStatsInput.weight||'-', lbl: 'Weight', col: 'accent-text'},
               {icon: Footprints, val: dailyStatsInput.steps > 1000 ? (dailyStatsInput.steps/1000).toFixed(1)+'k' : (dailyStatsInput.steps||'-'), lbl: 'Steps', col: 'text-gray-300'},
               {icon: BrainCircuit, val: `${dailyStatsInput.stress}/5`, lbl: 'Stress', col: dailyStatsInput.stress>3?'text-red-400':'text-green-400'},
               {icon: Battery, val: `${dailyStatsInput.fatigue}/5`, lbl: 'Fatigue', col: dailyStatsInput.fatigue>3?'text-red-400':'text-green-400'}
             ].map((s,i) => <div key={i} className="bg-gray-900/80 p-2 rounded-xl text-center border border-gray-800/50"><s.icon size={14} className={`mx-auto mb-1 ${s.col}`}/><p className="text-[9px] text-gray-500 uppercase tracking-wider">{s.lbl}</p><p className="text-white font-bold text-xs">{s.val}</p></div>)}

             {activeTab === 'eat' && [
               {icon: Flame, val: `${dailyTotals.cal}/${currentTargets.cal}`, lbl: 'Cals', col: 'accent-text', over: dailyTotals.cal > currentTargets.cal},
               {icon: Beef, val: `${dailyTotals.p}/${currentTargets.p}`, lbl: 'Prot', col: 'text-red-400', over: false},
               {icon: Wheat, val: `${dailyTotals.c}/${currentTargets.c}`, lbl: 'Carb', col: 'text-orange-400', over: false},
               {icon: Droplet, val: `${dailyTotals.f}/${currentTargets.f}`, lbl: 'Fat', col: 'text-yellow-400', over: false}
             ].map((s,i) => <div key={i} className={`bg-gray-900/80 p-2 rounded-xl text-center border ${s.over ? 'border-red-500/40' : 'border-gray-800/50'}`}><s.icon size={14} className={`mx-auto mb-1 ${s.col}`}/><p className="text-[9px] text-gray-500 uppercase tracking-wider">{s.lbl}</p><p className="text-white font-bold text-xs">{s.val}</p></div>)}
             {activeTab === 'stats' && <div className="col-span-4 h-10 flex items-center justify-center"><p className="text-gray-600 text-[10px] uppercase tracking-[0.2em] font-bold">Analytics Dashboard</p></div>}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="pt-48 pb-32">
           {activeTab === 'train' && <div className="p-4"><TrainTab workoutSplits={workoutSplits} setWorkoutSplits={setWorkoutSplits} workoutHistory={workoutHistory} setWorkoutHistory={setWorkoutHistory} workoutEditMode={workoutEditMode} setWorkoutEditMode={setWorkoutEditMode} addSplit={addSplit} deleteSplit={deleteSplit} renameSplit={renameSplit} handleSortSplits={handleSortSplits} dragItem={dragItem} dragOverItem={dragOverItem} phase={phase} dailyStats={dailyStatsInput} requestConfirm={requestConfirm} setShowCardioModal={setShowCardioModal} customExercises={customExercises} onCreateExercise={(name) => setCustomExercises(prev => [...new Set([...prev, name])])}/></div>}

           {activeTab === 'eat' && <div className="p-4"><EatTab savedMeals={savedMeals} dailyLog={dailyLog} mealEditMode={mealEditMode} setMealEditMode={setMealEditMode} setShowAddMealModal={setShowAddMealModal} setShowGhostChefModal={setShowGhostChefModal} logMeal={logMeal} deleteSavedMeal={deleteSavedMeal} deleteLogItem={deleteLogItem} getMealMacros={(m)=>m.ingredients.reduce((a,i)=>({cal:a.cal+i.cal,p:a.p+i.p,c:a.c+i.c,f:a.f+i.f}),{cal:0,p:0,c:0,f:0})} dragItem={dragItem} dragOverItem={dragOverItem} handleSortMeals={handleSortMeals} requestConfirm={requestConfirm} userTargets={currentTargets} dailyStats={dailyStatsInput} isPro={isPro} handlePremiumFeature={handlePremiumFeature}/></div>}

           {activeTab === 'stats' && <div className="p-4"><StatsTab statsHistory={statsHistory} setLogDate={setLogDate} setShowDailyCheckin={setShowDailyCheckin} workoutHistory={workoutHistory} setToast={setToastMsg} userTargets={currentTargets} phase={phase} aiCooldown={aiCooldown} setAiCooldown={setAiCooldown} isPro={isPro} handlePremiumFeature={handlePremiumFeature} savedMeals={savedMeals} /></div>}
        </div>

        {/* BOTTOM NAV */}
        <div className="fixed bottom-0 w-full max-w-md bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 p-2 pb-8 z-40 safe-area-bottom">
          <div className="flex justify-around items-center">
            {[
              { id: 'train', icon: Dumbbell, label: 'LIFT' },
              { id: 'eat', icon: Utensils, label: 'EAT' },
              { id: 'stats', icon: BarChart3, label: 'STATS' },
            ].map(tab => (
              <button key={tab.id} onClick={()=>{ setActiveTab(tab.id); hapticSelection(); }}
                className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab===tab.id ? 'accent-text' : 'text-gray-600'}`}>
                <tab.icon size={22} strokeWidth={activeTab===tab.id ? 2.5 : 1.5}/>
                <span className={`text-[9px] font-bold tracking-wider ${activeTab===tab.id ? '' : 'text-gray-600'}`}>{tab.label}</span>
                {activeTab===tab.id && <div className="w-1 h-1 rounded-full accent-bg"/>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
