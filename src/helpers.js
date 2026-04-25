import { useState, useEffect } from 'react';
import { APP_VERSION } from './constants';

// --- GLOBAL STYLES ---
const style = document.createElement('style');
style.innerHTML = `
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
  .no-select { user-select: none; -webkit-user-select: none; }
  ::-webkit-scrollbar { display: none; }
  body { -ms-overflow-style: none; scrollbar-width: none; background-color: #000; }
`;
document.head.appendChild(style);

export const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - (offset * 60 * 1000));
  return local.toISOString().split('T')[0];
};

export const calculateReadiness = (stats) => {
  if (!stats) return 50;
  const sleepScore = (stats.sleepQuality || 3) * 4;
  const stressScore = (6 - (stats.stress || 3)) * 4;
  const fatigueScore = (6 - (stats.fatigue || 3)) * 4;
  return Math.min(100, Math.max(0, (sleepScore + stressScore + fatigueScore) * (100/60)));
};

export const calculateSetTarget = (lastWeight, lastReps, phase, readiness) => {
  if (!lastWeight) return { weight: null, reps: null };
  let targetWeight = parseFloat(lastWeight);
  let targetReps = parseFloat(lastReps);

  if (phase === 'BULK') {
    if (lastReps >= 10) targetWeight += 2.5; else targetReps += 1;
  } else if (phase === 'CUT') {
    if (lastReps >= 12) targetWeight += 2.5;
  } else {
    if (lastReps >= 12) targetWeight += 2.5;
  }

  if (readiness < 40) targetWeight = Math.min(targetWeight, parseFloat(lastWeight));
  else if (readiness > 85 && targetWeight === parseFloat(lastWeight)) targetReps += 1;
  return { weight: targetWeight, reps: targetReps };
};

export const estimate1RM = (weight, reps) => {
  if (!weight || !reps || reps < 1) return 0;
  const w = parseFloat(weight);
  const r = parseInt(reps);
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
};

export const parseAIResponse = (text) => {
  try {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      return JSON.parse(text.substring(startIndex, endIndex + 1));
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Error", e);
    throw new Error("Failed to parse AI response. Try again.");
  }
};

export function applyAccentColor(hex) {
  document.documentElement.style.setProperty('--accent', hex);
  // Create a dim version at 15% opacity
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  document.documentElement.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.15)`);
}

// Detect personal records from a completed workout session
export function detectPRs(sessionExercises, workoutHistory) {
  const prs = [];
  if (!sessionExercises || !workoutHistory) return prs;

  sessionExercises.forEach(ex => {
    // Find best previous weight for this exercise across all history
    let prevBestWeight = 0;
    workoutHistory.forEach(session => {
      if (session.type === 'cardio' || !session.exercises) return;
      session.exercises.forEach(pastEx => {
        if (pastEx.name.toLowerCase() === ex.name.toLowerCase()) {
          (pastEx.sets || []).forEach(s => {
            const w = parseFloat(s.weight) || 0;
            if (w > prevBestWeight) prevBestWeight = w;
          });
        }
      });
    });

    // Check if any completed set in this session beats the previous best
    (ex.sets || []).forEach(set => {
      const w = parseFloat(set.weight) || 0;
      if (w > 0 && w > prevBestWeight) {
        prs.push({ exercise: ex.name, weight: w, reps: set.reps, type: 'weight' });
      }
    });
  });

  // Deduplicate: keep only the highest PR per exercise
  const best = {};
  prs.forEach(pr => {
    if (!best[pr.exercise] || pr.weight > best[pr.exercise].weight) {
      best[pr.exercise] = pr;
    }
  });
  return Object.values(best);
}

export function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      if (stickyValue !== null) {
        const parsed = JSON.parse(stickyValue);
        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
        if (typeof defaultValue === 'object' && !Array.isArray(defaultValue) && (Array.isArray(parsed) || typeof parsed !== 'object')) return defaultValue;
        return parsed;
      }
    } catch (e) { console.warn("Resetting state for", key); }
    return defaultValue;
  });
  useEffect(() => { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch(e){} }, [key, value]);
  return [value, setValue];
}
