#!/bin/bash
# Open the Android project in Android Studio on Windows
# Usage: ./scripts/android-studio.sh

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WIN_PATH=$(wslpath -w "$PROJECT_DIR/android")

echo "📂 Opening Android Studio with: $WIN_PATH"
cmd.exe /c "start \"\" \"C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe\" \"$WIN_PATH\"" 2>/dev/null

echo "✅ Android Studio should be opening..."
echo "   If it doesn't, open Android Studio manually and import: $WIN_PATH"
