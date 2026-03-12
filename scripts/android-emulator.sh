#!/bin/bash
# Launch Android emulator from WSL2 using Windows-side Android Studio tools
# Usage: ./scripts/android-emulator.sh [avd_name]

ANDROID_SDK="/mnt/c/Users/kyleh/AppData/Local/Android/Sdk"
EMULATOR="$ANDROID_SDK/emulator/emulator.exe"
ADB="$ANDROID_SDK/platform-tools/adb.exe"
AVD_NAME="${1:-Pixel_7}"

echo "🔍 Checking for running emulator..."
if $ADB devices 2>/dev/null | grep -q "emulator"; then
    echo "✅ Emulator already running"
    $ADB devices
    exit 0
fi

echo "🚀 Launching $AVD_NAME emulator..."
# Launch emulator in background (detached from terminal)
cmd.exe /c "start /b $ANDROID_SDK\\emulator\\emulator.exe -avd $AVD_NAME -no-snapshot-load" 2>/dev/null &

echo "⏳ Waiting for emulator to boot..."
MAX_WAIT=120
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if $ADB shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
        echo "✅ Emulator booted successfully!"
        $ADB devices
        exit 0
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    printf "."
done

echo ""
echo "⚠️  Emulator didn't finish booting in ${MAX_WAIT}s. It may still be starting."
echo "   Check with: $ADB devices"
