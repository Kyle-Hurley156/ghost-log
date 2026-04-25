export const APP_VERSION = "4.4";

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyAH3L6UcFaXos3AT3o8W8EHsgWBbL8_ZA4",
  // Use Vercel hosting domain to avoid Safari ITP blocking sessionStorage on cross-origin firebaseapp.com
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "ghost-log.vercel.app",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "ghost-log",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "ghost-log.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "585835627677",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:585835627677:web:9a7a15f79c21a5cb7b0074"
};

export const EXERCISE_DATABASE = [
  "Ab Wheel Rollout", "Adductor Machine", "Arnold Press", "Back Extension", "Barbell Bench Press", "Barbell Bicep Curl", "Barbell Row", "Barbell Shrug", "Barbell Squat",
  "Battle Ropes", "Bench Dip", "Box Jump", "Bulgarian Split Squat", "Burpees", "Cable Crossover", "Cable Crunch", "Cable Row", "Calf Press",
  "Chest Dip", "Chest Fly", "Chest Press Machine", "Chin Up", "Clean and Jerk", "Concentration Curl", "Crunch", "Deadlift", "Decline Bench Press",
  "Dumbbell Bench Press", "Dumbbell Bicep Curl", "Dumbbell Fly", "Dumbbell Lunge", "Dumbbell Pullover", "Dumbbell Row", "Dumbbell Shoulder Press", "Dumbbell Shrug", "Dumbbell Squat",
  "Face Pull", "Farmer's Walk", "Front Raise", "Front Squat", "Glute Bridge", "Goblet Squat", "Hack Squat", "Hammer Curl", "Hanging Leg Raise",
  "Hip Thrust", "Incline Bench Press", "Incline Dumbbell Curl", "Incline Dumbbell Press", "Jump Rope", "Lat Pulldown", "Lateral Raise", "Leg Curl",
  "Leg Extension", "Leg Press", "Lunge", "Machine Chest Fly", "Machine Shoulder Press", "Mountain Climbers", "Muscle Up", "Overhead Press",
  "Pec Deck", "Pendlay Row", "Plank", "Pull Up", "Push Up", "Rack Pull", "Reverse Fly", "Romanian Deadlift", "Russian Twist", "Seated Calf Raise",
  "Seated Row", "Shoulder Press", "Shrug", "Skullcrusher", "Smith Machine Squat", "Snatch", "Spider Curl", "Standing Calf Raise", "Sumo Deadlift",
  "T-Bar Row", "Tricep Dip", "Tricep Extension", "Tricep Pushdown", "Turkish Get Up", "Walking Lunge", "Weighted Dip", "Wrist Curl", "Zercher Squat"
];

export const CARDIO_DATABASE = [
  "Treadmill", "Elliptical", "Exercise Bike", "Stair Master", "Rowing Machine", "Jump Rope",
  "Swimming", "Running (Outdoor)", "Cycling (Outdoor)", "Walking (Incline)", "HIIT", "Boxing",
  "Basketball", "Soccer", "Yoga (Vinyasa)", "Rucking", "Assault Bike", "SkiErg"
];

export const INITIAL_SPLITS = [
  { id: 'split-1', name: 'Push A', exercises: [{ id: 1, name: 'Incline DB Press', defaultSets: 3 }, { id: 2, name: 'Lateral Raise', defaultSets: 4 }, { id: 3, name: 'Tricep Pushdown', defaultSets: 3 }] },
  { id: 'split-2', name: 'Pull B', exercises: [{ id: 1, name: 'Pullups', defaultSets: 3 }, { id: 2, name: 'DB Row', defaultSets: 3 }] },
  { id: 'split-3', name: 'Legs A', exercises: [{ id: 1, name: 'Squat', defaultSets: 3 }, { id: 2, name: 'RDL', defaultSets: 3 }] }
];

export const INITIAL_TARGETS = { CUT: { cal: 2200, p: 200, c: 0, f: 0 }, BULK: { cal: 3100, p: 220, c: 0, f: 0 }, MAINTAIN: { cal: 2600, p: 200, c: 0, f: 0 } };

export const API_URL = 'https://ghost-log.vercel.app/api/ghost';

export const ACCENT_COLORS = [
  { name: 'Ghost Blue', value: '#3b82f6' },
  { name: 'Phantom Purple', value: '#a855f7' },
  { name: 'Specter Green', value: '#22c55e' },
  { name: 'Ember Red', value: '#ef4444' },
  { name: 'Neon Cyan', value: '#06b6d4' },
  { name: 'Solar Orange', value: '#f97316' },
  { name: 'Hot Pink', value: '#ec4899' },
  { name: 'Pure White', value: '#e2e8f0' },
];
