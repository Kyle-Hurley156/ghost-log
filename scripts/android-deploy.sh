#!/bin/bash
# Build web assets, sync to Android, and deploy to running emulator/device
# Usage: ./scripts/android-deploy.sh [--release]

set -e

ANDROID_SDK="/mnt/c/Users/kyleh/AppData/Local/Android/Sdk"
ADB="$ANDROID_SDK/platform-tools/adb.exe"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

# Check emulator/device is connected
if ! $ADB devices 2>/dev/null | grep -qE "device$"; then
    echo "❌ No Android device/emulator connected."
    echo "   Run: ./scripts/android-emulator.sh"
    exit 1
fi

echo "📦 Building web assets..."
npm run build

echo "🔄 Syncing to Android..."
npx cap sync android

if [ "$1" = "--release" ]; then
    echo "🏗️  Building release APK..."
    cd android
    ./gradlew assembleRelease
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    echo "📲 Installing release APK..."
    $ADB install -r "$APK_PATH"
else
    echo "🏗️  Building debug APK..."
    cd android
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    echo "📲 Installing debug APK..."
    $ADB install -r "$APK_PATH"
fi

echo "🚀 Launching GhostLog..."
$ADB shell am start -n com.ghostlog.app/.MainActivity

echo "✅ Done! GhostLog is running on your device."
