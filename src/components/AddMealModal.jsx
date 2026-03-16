import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Camera, Loader2, Trash2, ChevronRight, Sparkles } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { API_URL } from '../constants';
import { parseAIResponse } from '../helpers';
import { searchFood, lookupBarcode } from '../services/foodLookup';

export const AddMealModal = ({ isOpen, onClose, onSave, setToast, aiCooldown, setAiCooldown }) => {
  const [mealName, setMealName] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentFood, setCurrentFood] = useState({ name: '', cal: '', p: '', c: '', f: '' });
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [searchSource, setSearchSource] = useState('');
  const scannerRef = useRef(null);

  // Cleanup scanner on unmount or close
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  // Auto-start barcode scanner when scanning is set to true
  useEffect(() => {
    if (!scanning || scannerRef.current || !isOpen) return;

    const initScanner = async () => {
      const el = document.getElementById("barcode-reader");
      if (!el) {
        setScanning(false);
        return;
      }

      try {
        const html5QrCode = new Html5Qrcode("barcode-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 100 }, aspectRatio: 1.0 },
          async (decodedText) => {
            // Barcode detected — auto-process immediately
            await html5QrCode.stop();
            scannerRef.current = null;
            setScanning(false);
            setLoading(true);

            try {
              const product = await lookupBarcode(decodedText);
              if (product) {
                setCurrentFood({ name: product.name, cal: product.cal, p: product.p, c: product.c, f: product.f });
                setSearchQuery(product.brand ? `${product.name} (${product.brand})` : product.name);
                setSearchSource('Barcode');
                setToast(`Found: ${product.name}`);
              } else {
                setToast("Product not in database. Try text search.");
              }
            } catch (e) {
              setToast("Barcode lookup failed");
            }
            setLoading(false);
          },
          () => {}
        );
      } catch (e) {
        console.error("Scanner start error:", e);
        setToast("Camera error: " + (e?.message || String(e)));
        scannerRef.current = null;
        setScanning(false);
      }
    };

    const timer = setTimeout(initScanner, 150);
    return () => clearTimeout(timer);
  }, [scanning, isOpen]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setSearchResults([]);
    setShowResults(false);
    setSearchSource('');

    try {
      const results = await searchFood(searchQuery);
      if (results.length > 0) {
        setSearchResults(results);
        setShowResults(true);
        setSearchSource('OpenFoodFacts');
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('OpenFoodFacts search failed, falling back to AI', e);
    }

    if (aiCooldown > 0) { setToast(`Ghost is resting for ${aiCooldown}s`); setLoading(false); return; }
    try {
      const response = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Identify food "${searchQuery}". Return JSON per 100g: {"name":string,"cal":number,"p":number,"c":number,"f":number} ONLY JSON`, isImage: false, imageData: null })
      });
      const data = await response.json();
      if (!response.ok || !data.candidates) throw new Error("Search Failed");
      const result = parseAIResponse(data.candidates[0].content.parts[0].text);
      setCurrentFood({ name: result.name, cal: result.cal, p: result.p, c: result.c, f: result.f });
      setSearchSource('Ghost AI');
      setAiCooldown(5);
    } catch (e) {
      setToast("No results found");
    }
    setLoading(false);
  };

  const selectResult = (result) => {
    setCurrentFood({ name: result.name, cal: result.cal, p: result.p, c: result.c, f: result.f });
    setSearchQuery(result.brand ? `${result.name} (${result.brand})` : result.name);
    setShowResults(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach(t => t.stop());
    } catch (e) {
      const msg = e?.name || e?.message || String(e);
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setToast("Camera blocked — allow in Settings");
      } else if (msg.includes("NotFoundError")) {
        setToast("No camera found on this device");
      } else {
        setToast("Camera error: " + msg);
      }
      return;
    }
    setScanning(true);
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Snap photo of food and send to AI for macro identification
  const snapPhoto = async () => {
    if (aiCooldown > 0) { setToast(`Ghost is resting for ${aiCooldown}s`); return; }

    try {
      const videoEl = document.querySelector('#barcode-reader video');
      if (!videoEl) { setToast("Camera not ready"); return; }

      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      canvas.getContext('2d').drawImage(videoEl, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      await stopCamera();
      setLoading(true);

      const response = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Identify food in image. Return JSON per 100g: {"name":string,"cal":number,"p":number,"c":number,"f":number} ONLY JSON`, isImage: true, imageData })
      });
      const data = await response.json();
      if (!response.ok || !data.candidates) throw new Error("Scan Failed");
      const result = parseAIResponse(data.candidates[0].content.parts[0].text);
      setSearchQuery(result.name);
      setCurrentFood({ name: result.name, cal: result.cal, p: result.p, c: result.c, f: result.f });
      setSearchSource('Ghost Vision');
      setAiCooldown(5);
    } catch (e) {
      setToast("Scan Error: " + e.message);
      setAiCooldown(3);
    }
    setLoading(false);
  };

  const addIngredient = () => {
    const name = currentFood.name || searchQuery || "Food";
    if (name && weight) {
      const m = parseFloat(weight) / 100;
      setIngredients([...ingredients, {
        id: Date.now(), name: `${name} (${weight}g)`,
        cal: Math.round((currentFood.cal||0)*m), p: Math.round((currentFood.p||0)*m),
        c: Math.round((currentFood.c||0)*m), f: Math.round((currentFood.f||0)*m), active: true
      }]);
      setSearchQuery(''); setWeight('');
      setCurrentFood({ name: '', cal: '', p: '', c: '', f: '' });
      setSearchResults([]); setShowResults(false); setSearchSource('');
    }
  };

  const removeIngredient = (index) => { const ni = [...ingredients]; ni.splice(index, 1); setIngredients(ni); };
  const handleSave = () => { if (mealName && ingredients.length > 0) { onSave({ id: Date.now(), name: mealName, ingredients }); setMealName(''); setIngredients([]); onClose(); } };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col animate-in fade-in safe-area-top safe-area-bottom">
      <div className="bg-gray-900 w-full max-w-md mx-auto flex flex-col flex-1">

        {/* Header */}
        <div className="flex justify-between items-center px-4 pt-14 pb-2 shrink-0">
          <h2 className="text-lg font-black tracking-tight text-white">CREATE MEAL</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 transition-colors"><X size={20} className="text-gray-500"/></button>
        </div>

        {/* Meal name */}
        <div className="px-4 pb-2 shrink-0">
          <input type="text" placeholder="Meal Name (e.g. Breakfast)" value={mealName} onChange={e => setMealName(e.target.value)} className="w-full bg-black/50 p-2.5 rounded-xl text-white text-sm border border-gray-800/50 outline-none focus:accent-border"/>
        </div>

        {/* Quick instructions — only show when no ingredients added yet */}
        {ingredients.length === 0 && !scanning && !searchQuery && (
          <div className="px-4 pb-2 shrink-0">
            <div className="bg-gray-900/30 rounded-lg p-3 border border-gray-800/30">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">How to add ingredients</p>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 flex items-start gap-2"><Search size={10} className="shrink-0 mt-0.5 text-gray-600"/> <span><span className="text-gray-400">Search</span> — type a food name and hit enter</span></p>
                <p className="text-[10px] text-gray-500 flex items-start gap-2"><Camera size={10} className="shrink-0 mt-0.5 text-gray-600"/> <span><span className="text-gray-400">Scan</span> — tap camera to scan a barcode (auto-detects)</span></p>
                <p className="text-[10px] text-gray-500 flex items-start gap-2"><Sparkles size={10} className="shrink-0 mt-0.5 text-gray-600"/> <span><span className="text-gray-400">AI Snap</span> — while camera is open, tap SNAP FOR AI to photograph food</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Ingredients — compact scrollable if many */}
        {ingredients.length > 0 && (
          <div className="px-4 pb-2 shrink-0 max-h-24 overflow-y-auto">
            <div className="space-y-1">
              {ingredients.map((ing, i) => (
                <div key={ing.id} className="bg-black/30 px-3 py-2 rounded-lg flex justify-between items-center text-xs border border-gray-800/50">
                  <span className="text-white truncate flex-1">{ing.name}</span>
                  <span className="text-gray-500 text-[10px] mx-2">{ing.cal}kcal</span>
                  <button onClick={() => removeIngredient(i)} className="text-red-400"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main content area — fills remaining space */}
        <div className="px-4 flex-1 flex flex-col min-h-0 relative">
          {loading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 rounded-xl"><Loader2 className="animate-spin accent-text"/></div>}

          {/* Camera view — fullscreen scanner when active */}
          {scanning ? (
            <div className="flex-1 flex flex-col">
              <div id="barcode-reader" className="rounded-xl overflow-hidden flex-1" style={{ width: '100%' }}></div>
              <p className="text-center text-[10px] text-gray-600 mt-1 mb-1">Barcodes auto-scan — or snap food for AI</p>
              <div className="flex gap-2">
                <button onClick={snapPhoto} disabled={aiCooldown > 0} className="flex-1 accent-bg-dim accent-text text-xs font-bold py-2.5 rounded-xl accent-border-dim border flex items-center justify-center gap-1 disabled:opacity-50 active:scale-95">
                  <Sparkles size={12}/> SNAP FOR AI
                </button>
                <button onClick={stopCamera} className="flex-1 bg-red-500/10 text-red-400 text-xs font-bold py-2.5 rounded-xl border border-red-500/20">CANCEL</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              {/* Search + camera */}
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <input type="text" placeholder="Search food..." value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowResults(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-black/50 p-2 rounded-lg text-sm text-white outline-none border border-gray-800/50"/>
                  <button onClick={handleSearch} disabled={loading} className="absolute right-2 top-2 text-gray-500 disabled:opacity-50"><Search size={16}/></button>
                </div>
                <button onClick={startCamera} disabled={loading} className="bg-black/50 p-2 rounded-lg border border-gray-800/50 text-gray-500 transition-colors hover:accent-text"><Camera size={20}/></button>
              </div>

              {/* Source badge */}
              {searchSource && (
                <div className="mb-1 flex items-center gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${searchSource === 'Ghost AI' || searchSource === 'Ghost Vision' ? 'accent-bg-dim accent-text accent-border-dim border' : searchSource === 'Barcode' ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'accent-bg-dim accent-text accent-border-dim border'}`}>
                    {searchSource === 'Ghost AI' || searchSource === 'Ghost Vision' ? <Sparkles size={10} className="inline mr-1"/> : null}
                    {searchSource}
                  </span>
                  <span className="text-[10px] text-gray-600">per 100g</span>
                </div>
              )}

              {/* Search results */}
              {showResults && searchResults.length > 0 && (
                <div className="mb-2 bg-gray-900 border border-gray-800/50 rounded-xl max-h-32 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <div key={i} onClick={() => selectResult(r)} className="px-2.5 py-2 hover:accent-bg-dim cursor-pointer border-b border-gray-800/50 last:border-0">
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-medium truncate">{r.name}</p>
                          {r.brand && <p className="text-[10px] text-gray-600 truncate">{r.brand}</p>}
                        </div>
                        <div className="flex gap-2 text-[10px] font-mono text-gray-500 ml-2 shrink-0">
                          <span className="accent-text">{r.cal}</span>
                          <span className="text-red-300">{r.p}p</span>
                          <span className="text-orange-300">{r.c}c</span>
                          <span className="text-yellow-300">{r.f}f</span>
                        </div>
                        <ChevronRight size={12} className="text-gray-700 ml-1"/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Macro inputs */}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {['cal','p','c','f'].map(k => (
                  <input key={k} type="number" placeholder={k.toUpperCase()} value={currentFood[k]}
                    onChange={e => setCurrentFood({...currentFood, [k]: e.target.value})}
                    className="bg-black/50 p-2 rounded-lg text-xs text-white border border-gray-800/50 text-center outline-none"/>
                ))}
              </div>

              {/* Weight + Add */}
              <div className="flex gap-2 mb-2">
                <input type="number" placeholder="Weight (g)" value={weight} onChange={e => setWeight(e.target.value)} className="flex-1 bg-black/50 p-2 rounded-lg text-sm text-white border border-gray-800/50 outline-none"/>
                <button onClick={addIngredient} className="px-4 accent-bg text-white rounded-lg font-bold text-xs active:scale-95">ADD</button>
              </div>

              {/* Spacer to push save to bottom */}
              <div className="flex-1"/>
            </div>
          )}
        </div>

        {/* Save button — always at bottom */}
        {!scanning && (
          <div className="px-4 pb-4 pt-2 shrink-0">
            <button onClick={handleSave} disabled={!mealName || ingredients.length === 0} className="w-full accent-bg hover:opacity-90 text-white font-bold py-3 rounded-xl active:scale-[0.98] disabled:opacity-30">SAVE MEAL</button>
          </div>
        )}
      </div>
    </div>
  );
};
