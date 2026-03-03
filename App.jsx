import React, { useState, useEffect } from 'react';
import { Camera, Plus, Loader2, ChefHat, Wand2, BarChart3, X } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { auth, db, appleProvider } from './firebase';
import { signInAnonymously, onAuthStateChanged, linkWithPopup } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export default function App() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [inputText, setInputText] = useState("");
  const [user, setUser] = useState(null);

  // 1. FRICTIONLESS AUTHENTICATION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // If they have no account, instantly create an invisible one!
        signInAnonymously(auth).catch(error => console.error("Auth error:", error));
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. REAL-TIME CLOUD SYNC
  useEffect(() => {
    if (!user) return;
    
    // Listen to this specific user's logs in the cloud
    const q = query(
      collection(db, 'users', user.uid, 'logs'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  const handleAppleBackup = async () => {
    try {
      await linkWithPopup(user, appleProvider);
      alert("Success! Your workout history is permanently backed up to iCloud.");
    } catch (error) {
      console.error(error);
      alert("Could not link Apple ID: " + error.message);
    }
  };

  const handleAnalyze = async (text, base64Image = null) => {
    if (!user) return;
    setLoading(true);
    
    try {
      // 🛡️ SECURE VERCEL PROXY CALL 
      const response = await fetch('https://ghost-log.vercel.app/api/ghost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text || "Analyze this food for macros.",
          isImage: base64Image !== null,
          imageData: base64Image
        })
      });

      if (!response.ok) throw new Error("Failed to connect to secure server.");

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Analyzed successfully.";
      
      // Save directly to Firebase instead of local memory!
      await addDoc(collection(db, 'users', user.uid, 'logs'), {
        text: aiText,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = () => {
    setLoading(true);
    // Simulating the Apple Purchase flow
    setTimeout(() => {
      setIsPro(true);
      setShowPaywall(false);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pt-8 px-2">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white">GhostLog</h1>
          {/* Show the Apple link button if they are anonymous */}
          {user?.isAnonymous && (
            <button 
              onClick={handleAppleBackup}
              className="mt-1 text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full hover:bg-gray-700 transition-colors"
            >
               Backup Data
            </button>
          )}
        </div>
        {!isPro && (
          <button 
            onClick={() => setShowPaywall(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 rounded-full font-bold text-sm shadow-lg shadow-blue-900/50"
          >
            Go Pro
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-gray-900 rounded-3xl p-4 mb-6 border border-gray-800 shadow-xl">
        <textarea
          className="w-full bg-transparent text-white placeholder-gray-500 outline-none resize-none mb-4"
          placeholder="What did you eat?"
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <div className="flex justify-between items-center">
          <button className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-blue-400">
            <Camera size={24} />
          </button>
          <button 
            onClick={() => {
              if (!isPro && logs.length >= 3) {
                setShowPaywall(true);
                return;
              }
              handleAnalyze(inputText);
              setInputText("");
            }}
            disabled={loading || !inputText.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            Log Meal
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="space-y-4 px-2 pb-24">
        {logs.map((log) => (
          <div key={log.id} className="bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-md">
            <p className="text-gray-300">{log.text}</p>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-center text-gray-600 mt-12 font-medium">
            <p>No meals logged yet today.</p>
          </div>
        )}
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-gray-900 w-full max-w-md rounded-3xl p-6 border border-gray-800 relative shadow-2xl">
            <button 
              onClick={() => setShowPaywall(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-3xl font-black text-white mb-2 text-center mt-4">GhostLog Pro</h2>
            <p className="text-gray-400 text-center mb-8 font-medium">Unlock unlimited AI tracking.</p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
                <ChefHat className="text-blue-400" size={24}/>
                <div className="text-left">
                  <p className="text-white font-bold">Ghost Chef</p>
                  <p className="text-gray-500 text-sm">Infinite AI meal generation.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
                <Wand2 className="text-purple-400" size={24}/>
                <div className="text-left">
                  <p className="text-white font-bold">Auto-Targets</p>
                  <p className="text-gray-500 text-sm">AI calculates your exact macros.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSubscribe} 
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-blue-900/50 transition-all flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin"/> : "SUBSCRIBE FOR $9.70/MO"}
            </button>
            
            <div className="mt-6 flex justify-center gap-6 text-xs font-bold text-gray-500">
              <button className="hover:text-gray-300 transition-colors">Restore Purchases</button>
              <button className="hover:text-gray-300 transition-colors">Terms of Service</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}