import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell, Utensils, BarChart3, Ghost, Lock, Cloud, CloudOff, Loader2, Apple,
  TrendingUp, Footprints, BrainCircuit, Battery, Flame, Beef, Wheat, Droplet
} from 'lucide-react';

import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, linkWithPopup, OAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

import { FIREBASE_CONFIG, INITIAL_SPLITS, INITIAL_TARGETS } from './constants';
import { getLocalDate, useStickyState } from './helpers';

import { ErrorBoundary } from './components/ErrorBoundary';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('train');
  const [phase, setPhase] = useStickyState('CUT', 'ghost_phase');

  // UI States
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
  const appleProvider = new OAuthProvider('apple.com');

  // APP DATA
  const [workoutEditMode, setWorkoutEditMode] = useState(false);
  const [mealEditMode, setMealEditMode] = useState(false);
  const [workoutSplits, setWorkoutSplits] = useStickyState(INITIAL_SPLITS, 'ghost_splits');
  const [savedMeals, setSavedMeals] = useStickyState([], 'ghost_meals');
  const [statsHistory, setStatsHistory] = useStickyState([], 'ghost_stats');
  const [workoutHistory, setWorkoutHistory] = useStickyState([], 'ghost_workouts');
  const [dailyLog, setDailyLog] = useStickyState([], 'ghost_daily_log');
  const [userTargets, setUserTargets] = useStickyState(INITIAL_TARGETS, 'ghost_targets');

  const [logDate, setLogDate] = useState(getLocalDate());
  const [dailyStatsInput, setDailyStatsInput] = useState({ weight: '', steps: '', water: '', stress: 3, fatigue: 3, sleepHours: '', sleepQuality: 3, activity: 3 });

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

    if (FIREBASE_CONFIG.apiKey) {
      try {
        const app = initializeApp(FIREBASE_CONFIG);
        const auth = getAuth(app);
        signInAnonymously(auth).catch(e => console.warn("Firebase Auth Error", e));

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            setCloudUser(user);
            setCloudStatus('synced');
          } else {
            setCloudStatus('disconnected');
          }
        });
        return () => unsubscribe();
      } catch (e) { console.error("Firebase Init Failed", e); }
    }
  }, []);

  // --- CLOUD SYNC ENGINE ---
  useEffect(() => {
    if (!cloudUser || !FIREBASE_CONFIG.apiKey) return;

    const syncDataToCloud = async () => {
      setCloudStatus('syncing');
      try {
        const db = getFirestore();
        const appId = import.meta.env?.VITE_FIREBASE_APP_ID || 'ghostlog-local';

        const userRef = doc(db, 'artifacts', appId, 'users', cloudUser.uid, 'userData', 'backup');

        await setDoc(userRef, {
          updatedAt: new Date().toISOString(),
          workoutSplits,
          savedMeals,
          statsHistory,
          userTargets,
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
  }, [workoutSplits, savedMeals, statsHistory, userTargets, phase, cloudUser]);

  const handleAppleBackup = async () => {
    try {
      const auth = getAuth();
      await linkWithPopup(auth.currentUser, appleProvider);
      setToastMsg("Success! Data permanently backed up to iCloud.");
    } catch (error) {
      setToastMsg("Could not link Apple ID: " + error.message);
    }
  };

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
  useEffect(() => { const today = getLocalDate(); if (!statsHistory.some(entry => entry.date === today)) { setLogDate(today); setShowDailyCheckin(true); } }, []);

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

  return (
    <ErrorBoundary>
      <div className="bg-black min-h-screen text-gray-100 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-800 pt-16">
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
        <ConfirmModal isOpen={confirmState.isOpen} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState({isOpen:false, message:'', onConfirm:null})} />

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

        <GhostAiPanel show={showGhostPanel} onClose={()=>setShowGhostPanel(false)}/>

        {!showGhostPanel && !showDailyCheckin && !showAddMealModal && !showTargetModal && !showGhostChefModal && !showCardioModal && !showPaywall && <button onClick={()=>setShowGhostPanel(true)} className="fixed bottom-24 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg z-40"><Ghost size={24}/></button>}

        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} onSubscribe={handleSubscribeClick} loading={isPaywallLoading}/>

        {/* HEADER */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 pb-4 pt-16 fixed top-0 left-0 right-0 z-20 max-w-md mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-black italic text-white flex items-center gap-2">GHOST<span className="text-gray-500">LOG</span> {isPro && <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-widest font-bold">PRO</span>}</h1>
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {cloudStatus === 'synced' ? <Cloud size={12} className="text-blue-400"/> : cloudStatus === 'syncing' ? <Loader2 size={12} className="animate-spin text-gray-400"/> : <CloudOff size={12} className="text-red-400"/>}
                  {cloudStatus === 'synced' ? 'Cloud Backup Active' : cloudStatus === 'syncing' ? 'Syncing...' : 'Local Mode'}
                </div>
                {cloudUser?.isAnonymous && (
                  <button onClick={handleAppleBackup} className="text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-1 w-fit bg-gray-800 px-2 py-1 rounded-md border border-gray-700 transition-colors">
                    <Apple size={12} /> Link Apple ID
                  </button>
                )}
              </div>
            </div>
            <button onClick={()=>handlePremiumFeature(() => setShowTargetModal(true))} className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 mt-1 ${phase==='CUT'?'text-red-400 border-red-500/30': phase==='BULK' ? 'text-green-400 border-green-500/30' : 'text-blue-400 border-blue-500/30'}`}>
                  {phase} {!isPro && <Lock size={10} className="ml-1 opacity-50"/>}
            </button>
          </div>

          {/* STAT DASHBOARD */}
          <div className="grid grid-cols-4 gap-2 animate-in fade-in">
             {activeTab === 'train' && [
               {icon: TrendingUp, val: dailyStatsInput.weight||'-', lbl: 'Weight', col: 'text-blue-400'},
               {icon: Footprints, val: dailyStatsInput.steps > 1000 ? (dailyStatsInput.steps/1000).toFixed(1)+'k' : (dailyStatsInput.steps||'-'), lbl: 'Steps', col: 'text-purple-400'},
               {icon: BrainCircuit, val: `${dailyStatsInput.stress}/5`, lbl: 'Stress', col: dailyStatsInput.stress>3?'text-red-400':'text-green-400'},
               {icon: Battery, val: `${dailyStatsInput.fatigue}/5`, lbl: 'Fatigue', col: dailyStatsInput.fatigue>3?'text-red-400':'text-green-400'}
             ].map((s,i) => <div key={i} className="bg-gray-800 p-2 rounded-lg text-center border border-gray-700"><s.icon size={16} className={`mx-auto mb-1 ${s.col}`}/><p className="text-[10px] text-gray-400">{s.lbl}</p><p className="text-white font-bold text-xs">{s.val}</p></div>)}

             {activeTab === 'eat' && [
               {icon: Flame, val: `${dailyTotals.cal}/${currentTargets.cal}`, lbl: 'Cals', col: 'text-blue-400', border: dailyTotals.cal > currentTargets.cal ? 'border-red-500' : 'border-gray-700'},
               {icon: Beef, val: `${dailyTotals.p}/${currentTargets.p}`, lbl: 'Prot', col: 'text-red-400', border: 'border-gray-700'},
               {icon: Wheat, val: `${dailyTotals.c}/${currentTargets.c}`, lbl: 'Carb', col: 'text-orange-400', border: 'border-gray-700'},
               {icon: Droplet, val: `${dailyTotals.f}/${currentTargets.f}`, lbl: 'Fat', col: 'text-yellow-400', border: 'border-gray-700'}
             ].map((s,i) => <div key={i} className={`bg-gray-800 p-2 rounded-lg text-center border ${s.border}`}><s.icon size={16} className={`mx-auto mb-1 ${s.col}`}/><p className="text-[10px] text-gray-400">{s.lbl}</p><p className="text-white font-bold text-xs">{s.val}</p></div>)}
             {activeTab === 'stats' && <div className="col-span-4 h-12 flex items-center justify-center"><p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Analytics</p></div>}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="pt-52 pb-32">
           {activeTab === 'train' && <div className="p-4"><TrainTab workoutSplits={workoutSplits} setWorkoutSplits={setWorkoutSplits} workoutHistory={workoutHistory} setWorkoutHistory={setWorkoutHistory} workoutEditMode={workoutEditMode} setWorkoutEditMode={setWorkoutEditMode} addSplit={addSplit} deleteSplit={deleteSplit} renameSplit={renameSplit} handleSortSplits={handleSortSplits} dragItem={dragItem} dragOverItem={dragOverItem} phase={phase} dailyStats={dailyStatsInput} requestConfirm={requestConfirm} setShowCardioModal={setShowCardioModal}/></div>}

           {activeTab === 'eat' && <div className="p-4"><EatTab savedMeals={savedMeals} dailyLog={dailyLog} mealEditMode={mealEditMode} setMealEditMode={setMealEditMode} setShowAddMealModal={setShowAddMealModal} setShowGhostChefModal={setShowGhostChefModal} logMeal={logMeal} deleteSavedMeal={deleteSavedMeal} deleteLogItem={deleteLogItem} getMealMacros={(m)=>m.ingredients.reduce((a,i)=>({cal:a.cal+i.cal,p:a.p+i.p,c:a.c+i.c,f:a.f+i.f}),{cal:0,p:0,c:0,f:0})} dragItem={dragItem} dragOverItem={dragOverItem} handleSortMeals={handleSortMeals} requestConfirm={requestConfirm} userTargets={currentTargets} dailyStats={dailyStatsInput} isPro={isPro} handlePremiumFeature={handlePremiumFeature}/></div>}

           {activeTab === 'stats' && <div className="p-4"><StatsTab statsHistory={statsHistory} setLogDate={setLogDate} setShowDailyCheckin={setShowDailyCheckin} workoutHistory={workoutHistory} setToast={setToastMsg} userTargets={currentTargets} phase={phase} aiCooldown={aiCooldown} setAiCooldown={setAiCooldown} isPro={isPro} handlePremiumFeature={handlePremiumFeature} /></div>}
        </div>

        {/* BOTTOM NAV */}
        <div className="fixed bottom-0 w-full max-w-md bg-gray-900/90 backdrop-blur-lg border-t border-gray-800 p-2 pb-6 z-40">
          <div className="flex justify-around items-center">
            <button onClick={()=>setActiveTab('train')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab==='train'?'text-blue-400':'text-gray-500'}`}><Dumbbell size={24}/><span className="text-[10px] font-bold">LIFT</span></button>
            <button onClick={()=>setActiveTab('eat')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab==='eat'?'text-blue-400':'text-gray-500'}`}><Utensils size={24}/><span className="text-[10px] font-bold">EAT</span></button>
            <button onClick={()=>setActiveTab('stats')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab==='stats'?'text-blue-400':'text-gray-500'}`}><BarChart3 size={24}/><span className="text-[10px] font-bold">STATS</span></button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
