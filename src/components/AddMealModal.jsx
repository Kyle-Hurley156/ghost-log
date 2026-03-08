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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup scanner/camera on unmount or close
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  // --- FOOD SEARCH: OpenFoodFacts first, AI fallback ---
  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setSearchResults([]);
    setShowResults(false);
    setSearchSource('');

    try {
      // 1. Try OpenFoodFacts (FREE)
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

    // 2. Fallback to Gemini AI
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

  // --- SELECT from search results ---
  const selectResult = (result) => {
    setCurrentFood({ name: result.name, cal: result.cal, p: result.p, c: result.c, f: result.f });
    setSearchQuery(result.brand ? `${result.name} (${result.brand})` : result.name);
    setShowResults(false);
  };

  // --- COMBINED CAMERA: barcode scanning + photo snap for AI ---
  const startCamera = async () => {
    // First request camera permission explicitly — this triggers the native popup
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      // Permission granted — stop the stream, Html5Qrcode will start its own
      stream.getTracks().forEach(t => t.stop());
    } catch (e) {
      console.error("Camera permission error:", e);
      const msg = e?.name || e?.message || String(e);
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setToast("Camera blocked — check browser/app settings");
      } else if (msg.includes("NotFoundError")) {
        setToast("No camera found on this device");
      } else if (msg.includes("NotReadableError")) {
        setToast("Camera is in use by another app");
      } else {
        setToast("Camera error: " + msg);
      }
      return;
    }

    // Set scanning to render the barcode-reader div
    setScanning(true);
  };

  // Once scanning is true and the DOM element exists, start the scanner
  useEffect(() => {
    if (!scanning || scannerRef.current) return;

    const initScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("barcode-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 100 }, aspectRatio: 1.0 },
          async (decodedText) => {
            // Barcode detected — stop scanner and look up
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
          () => {} // ignore scan errors (no barcode in frame)
        );
      } catch (e) {
        console.error("Scanner start error:", e);
        setToast("Camera error: " + (e?.message || String(e)));
        setScanning(false);
      }
    };

    // Small delay to ensure React has rendered the DOM element
    const timer = setTimeout(initScanner, 100);
    return () => clearTimeout(timer);
  }, [scanning]);

  const stopCamera = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Capture the current camera frame and send to AI for food identification
  const snapPhoto = async () => {
    if (aiCooldown > 0) { setToast(`Ghost is resting for ${aiCooldown}s`); return; }

    try {
      // Get the video element from the html5-qrcode scanner
      const videoEl = document.querySelector('#barcode-reader video');
      if (!videoEl) { setToast("Camera not ready"); return; }

      // Draw to canvas and extract base64
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      canvas.getContext('2d').drawImage(videoEl, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      // Stop camera
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
  const removeIngredient = (index) => { const newIngredients = [...ingredients]; newIngredients.splice(index, 1); setIngredients(newIngredients); };
  const handleSave = () => { if (mealName && ingredients.length > 0) { onSave({ id: Date.now(), name: mealName, ingredients: ingredients }); setMealName(''); setIngredients([]); onClose(); } };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-md rounded-2xl p-6 border border-gray-800/50 shadow-2xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-black tracking-tight text-white">CREATE MEAL</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 transition-colors"><X size={22} className="text-gray-500"/></button></div>
        <div className="space-y-4 flex-1 overflow-y-auto">
          <input type="text" placeholder="Meal Name" value={mealName} onChange={e => setMealName(e.target.value)} className="w-full bg-black/50 p-3 rounded-xl text-white border border-gray-800/50 outline-none focus:accent-border transition-colors"/>

          {/* Ingredients list */}
          <div className="space-y-2">{ingredients.map((ing, i) => (<div key={ing.id} className="bg-black/30 p-3 rounded-xl flex justify-between items-center text-sm border border-gray-800/50"><span className="text-white">{ing.name}</span><span className="text-gray-500 text-[10px]">{ing.cal}kcal</span><button onClick={() => removeIngredient(i)} className="text-red-400"><Trash2 size={14}/></button></div>))}</div>

          {/* Food lookup area */}
          <div className="bg-black/30 p-3 rounded-xl border border-dashed border-gray-800/50 relative">
            {loading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 rounded-xl"><Loader2 className="animate-spin accent-text"/></div>}

            {/* Camera viewport — barcode scanning + photo snap */}
            {scanning && (
              <div className="mb-3">
                <div id="barcode-reader" className="rounded-lg overflow-hidden" style={{ width: '100%' }}></div>
                <p className="text-center text-[10px] text-gray-600 mt-1">Point at a barcode, or snap a photo of food</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={snapPhoto} disabled={aiCooldown > 0} className="flex-1 accent-bg-dim accent-text text-xs font-bold py-2 rounded-lg accent-border-dim border flex items-center justify-center gap-1 disabled:opacity-50">
                    <Sparkles size={12}/> SNAP FOR AI
                  </button>
                  <button onClick={stopCamera} className="flex-1 bg-red-500/10 text-red-400 text-xs font-bold py-2 rounded-lg border border-red-500/20">CANCEL</button>
                </div>
              </div>
            )}

            {/* Search + camera button */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <input type="text" placeholder="Search food..." value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowResults(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-gray-900/80 p-2 rounded-lg text-sm text-white outline-none border border-gray-800/50"/>
                <button onClick={handleSearch} disabled={loading} className="absolute right-2 top-2 text-gray-500 disabled:opacity-50"><Search size={16}/></button>
              </div>
              <button onClick={startCamera} disabled={loading || scanning} className="bg-gray-900/80 p-2 rounded-lg border border-gray-800/50 text-gray-500 disabled:opacity-50 transition-colors hover:accent-text" title="Scan barcode or snap food photo"><Camera size={20}/></button>
            </div>

            {/* Source badge */}
            {searchSource && (
              <div className="mb-2 flex items-center gap-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${searchSource === 'Ghost AI' || searchSource === 'Ghost Vision' ? 'accent-bg-dim accent-text accent-border-dim border' : searchSource === 'Barcode' ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'accent-bg-dim accent-text accent-border-dim border'}`}>
                  {searchSource === 'Ghost AI' || searchSource === 'Ghost Vision' ? <Sparkles size={10} className="inline mr-1"/> : null}
                  {searchSource}
                </span>
                <span className="text-[10px] text-gray-600">per 100g</span>
              </div>
            )}

            {/* OpenFoodFacts search results dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="mb-3 bg-gray-900 border border-gray-800/50 rounded-xl max-h-40 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <div key={i} onClick={() => selectResult(r)} className="p-2.5 hover:accent-bg-dim cursor-pointer border-b border-gray-800/50 last:border-0 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{r.name}</p>
                        {r.brand && <p className="text-[10px] text-gray-600 truncate">{r.brand}</p>}
                      </div>
                      <div className="flex gap-2 text-[10px] font-mono text-gray-500 ml-2 shrink-0">
                        <span className="accent-text">{r.cal}</span>
                        <span className="text-red-300">{r.p}p</span>
                        <span className="text-orange-300">{r.c}c</span>
                        <span className="text-yellow-300">{r.f}f</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-700 ml-1"/>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Manual macro inputs */}
            <div className="grid grid-cols-4 gap-2 mb-3">{['cal','p','c','f'].map(k => <input key={k} type="number" placeholder={k.toUpperCase()} value={currentFood[k]} onChange={e => setCurrentFood({...currentFood, [k]: e.target.value})} className="bg-gray-900/80 p-2 rounded-lg text-xs text-white border border-gray-800/50 text-center outline-none"/>)}</div>

            <div className="flex gap-2"><input type="number" placeholder="Weight (g)" value={weight} onChange={e => setWeight(e.target.value)} className="flex-1 bg-gray-900/80 p-2 rounded-lg text-sm text-white border border-gray-800/50 outline-none"/><button onClick={addIngredient} className="px-4 accent-bg text-white rounded-lg font-bold text-xs transition-all active:scale-95">ADD</button></div>
          </div>
        </div>
        <button onClick={handleSave} className="w-full accent-bg hover:opacity-90 text-white font-bold py-3 rounded-xl mt-4 transition-all active:scale-[0.98]">SAVE MEAL</button>
      </div>
    </div>
  );
};
