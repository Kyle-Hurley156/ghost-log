import React, { useState } from 'react';
import { Dumbbell, Utensils, BarChart3, ChevronRight, Sparkles, Target, Camera } from 'lucide-react';

const GhostLogo = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8C30 8 18 24 18 42v32c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8V42C82 24 70 8 50 8z" fill="white"/>
    <circle cx="38" cy="38" r="5" fill="black"/>
    <circle cx="62" cy="38" r="5" fill="black"/>
    <ellipse cx="50" cy="52" rx="4" ry="3" fill="black"/>
  </svg>
);

const steps = [
  {
    title: 'Welcome to GhostLog',
    subtitle: 'Your AI-powered fitness companion',
    content: (
      <div className="flex justify-center mb-6"><GhostLogo size={80}/></div>
    ),
    description: 'Track workouts, scan food, and let Ghost AI optimise your training and nutrition.',
  },
  {
    title: 'Train Smart',
    subtitle: 'LIFT TAB',
    content: (
      <div className="flex justify-center gap-4 mb-4">
        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800/50 text-center flex-1">
          <Dumbbell size={24} className="mx-auto mb-2 accent-text"/>
          <p className="text-xs text-white font-bold">Workout Splits</p>
          <p className="text-[10px] text-gray-500">Templates with smart progression</p>
        </div>
        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800/50 text-center flex-1">
          <Target size={24} className="mx-auto mb-2 text-green-400"/>
          <p className="text-xs text-white font-bold">Auto Targets</p>
          <p className="text-[10px] text-gray-500">Weight/reps based on readiness</p>
        </div>
      </div>
    ),
    description: 'Ghost tracks your performance and suggests progressive overload based on your recovery.',
  },
  {
    title: 'Eat Right',
    subtitle: 'EAT TAB',
    content: (
      <div className="flex justify-center gap-4 mb-4">
        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800/50 text-center flex-1">
          <Camera size={24} className="mx-auto mb-2 accent-text"/>
          <p className="text-xs text-white font-bold">Scan Food</p>
          <p className="text-[10px] text-gray-500">Barcode or photo AI</p>
        </div>
        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800/50 text-center flex-1">
          <Utensils size={24} className="mx-auto mb-2 text-orange-400"/>
          <p className="text-xs text-white font-bold">Ghost Chef</p>
          <p className="text-[10px] text-gray-500">AI meals to fit your macros</p>
        </div>
      </div>
    ),
    description: 'Scan barcodes, snap photos, or search foods. Ghost Chef generates meals that fit your remaining macros.',
  },
  {
    title: 'Set Your Goal',
    subtitle: "LET'S GO",
    content: null, // Will be rendered inline
    description: null,
    isSetup: true,
  },
];

export const OnboardingModal = ({ onComplete, setPhase, setUserTargets, userTargets }) => {
  const [step, setStep] = useState(0);
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('CUT');

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleComplete = () => {
    setPhase(goal);

    // Auto-calculate targets based on weight and goal
    if (weight) {
      const w = parseFloat(weight);
      const protein = Math.round(w * 2.2); // 2.2g per kg
      let cal;
      if (goal === 'CUT') cal = Math.round(w * 24);
      else if (goal === 'BULK') cal = Math.round(w * 33);
      else cal = Math.round(w * 28);

      setUserTargets({
        ...userTargets,
        [goal]: { cal, p: protein, c: 0, f: 0 }
      });
    }

    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 accent-bg' : i < step ? 'w-4 accent-bg opacity-50' : 'w-4 bg-gray-800'}`}/>
          ))}
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{current.subtitle}</p>
          <h1 className="text-2xl font-black text-white">{current.title}</h1>
        </div>

        {/* Content */}
        {current.content}
        {current.description && (
          <p className="text-sm text-gray-400 text-center leading-relaxed mb-8">{current.description}</p>
        )}

        {/* Setup form on last step */}
        {isLast && (
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">Body Weight (kg)</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 85" className="w-full bg-gray-900/80 p-3 rounded-xl text-white text-center text-lg font-bold border border-gray-800/50 outline-none focus:accent-border"/>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">Your Goal</label>
              <div className="grid grid-cols-3 gap-2">
                {['CUT', 'MAINTAIN', 'BULK'].map(g => (
                  <button key={g} onClick={() => setGoal(g)} className={`p-3 rounded-xl font-bold text-sm border transition-all ${goal === g ? (g === 'CUT' ? 'bg-red-500/10 text-red-400 border-red-500/30' : g === 'BULK' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'accent-bg-dim accent-text accent-border-dim') : 'bg-gray-900/80 text-gray-500 border-gray-800/50'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <button
          onClick={() => isLast ? handleComplete() : setStep(step + 1)}
          className="w-full accent-bg text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          {isLast ? (
            <><Sparkles size={18}/> START TRAINING</>
          ) : (
            <>NEXT <ChevronRight size={18}/></>
          )}
        </button>

        {step > 0 && !isLast && (
          <button onClick={() => setStep(step - 1)} className="w-full text-gray-600 text-xs font-bold py-3 mt-2">
            BACK
          </button>
        )}

        {!isLast && (
          <button onClick={handleComplete} className="w-full text-gray-700 text-[10px] py-2 mt-1">
            Skip setup
          </button>
        )}
      </div>
    </div>
  );
};
