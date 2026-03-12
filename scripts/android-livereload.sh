#!/bin/bash
# Start Vite dev server with live reload accessible from Android emulator
# Usage: ./scripts/android-livereload.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_SDK="/mnt/c/Users/kyleh/AppData/Local/Android/Sdk"
ADB="$ANDROID_SDK/platform-tools/adb.exe"

cd "$PROJECT_DIR"

# Get the Windows host IP that WSL2 can use
# The emulator on Windows side accesses WSL2 via this IP
WSL_IP=$(hostname -I | awk '{print $1}')

echo "📡 WSL2 IP: $WSL_IP"
echo "🔄 Starting live reload on http://$WSL_IP:5173"
echo ""
echo "To use live reload:"
echo "  1. Ensure emulator is running: ./scripts/android-emulator.sh"
echo "  2. In another terminal, run: npx cap run android --livereload --external --host=$WSL_IP"
echo ""
echo "Or for quick web-only testing, open http://localhost:5173 in your browser"
echo "(Use Chrome DevTools mobile emulation for phone-sized viewport)"
echo ""

npm run dev -- --host 0.0.0.0
