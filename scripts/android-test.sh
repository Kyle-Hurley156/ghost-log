#!/bin/bash
# Full Android emulator test pipeline for GhostLog (WSL2)
# Launches emulator, builds + deploys, takes screenshots, captures logs and UI tree.
#
# Usage:
#   ./scripts/android-test.sh              # Full pipeline: emulator + build + deploy + capture
#   ./scripts/android-test.sh --no-build   # Skip build, just deploy existing APK + capture
#   ./scripts/android-test.sh --capture    # Only capture (screenshot, logcat, UI dump)
#   ./scripts/android-test.sh --kill       # Kill the emulator
#
# Output goes to test-results/ in the project root.

set -e

# ----- Configuration -----
ANDROID_SDK="/mnt/c/Users/kyleh/AppData/Local/Android/Sdk"
ADB="$ANDROID_SDK/platform-tools/adb.exe"
EMULATOR="$ANDROID_SDK/emulator/emulator.exe"
AVD_NAME="Pixel_7"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$PROJECT_DIR/test-results"
APK_PATH="$PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="com.ghostlog.app"
ACTIVITY=".MainActivity"
BOOT_TIMEOUT=120
APP_LOAD_TIMEOUT=15

# ----- Helpers -----
timestamp() { date +"%Y%m%d_%H%M%S"; }

log() { echo "[$(date +%H:%M:%S)] $*"; }

ensure_output_dir() {
    mkdir -p "$OUTPUT_DIR"
}

check_adb() {
    if ! command -v "$ADB" &>/dev/null && ! [ -x "$ADB" ]; then
        log "ERROR: adb.exe not found at $ADB"
        exit 1
    fi
}

is_emulator_running() {
    $ADB devices 2>/dev/null | grep -q "emulator"
}

is_emulator_booted() {
    local status
    status=$($ADB shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')
    [ "$status" = "1" ]
}

wait_for_boot() {
    log "Waiting for emulator to boot (timeout: ${BOOT_TIMEOUT}s)..."
    local waited=0
    while [ $waited -lt $BOOT_TIMEOUT ]; do
        if is_emulator_booted; then
            log "Emulator booted after ${waited}s"
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
    done
    log "ERROR: Emulator did not boot within ${BOOT_TIMEOUT}s"
    return 1
}

wait_for_device() {
    log "Waiting for emulator device to appear..."
    local waited=0
    while [ $waited -lt 30 ]; do
        if is_emulator_running; then
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
    done
    log "ERROR: No emulator device appeared within 30s"
    return 1
}

# ----- Commands -----

cmd_start_emulator() {
    if is_emulator_running && is_emulator_booted; then
        log "Emulator already running and booted"
        $ADB devices 2>/dev/null
        return 0
    fi

    if is_emulator_running; then
        log "Emulator device present, waiting for boot..."
        wait_for_boot
        return $?
    fi

    # Check AVD exists
    local avds
    avds=$($EMULATOR -list-avds 2>/dev/null)
    if ! echo "$avds" | grep -q "$AVD_NAME"; then
        log "ERROR: AVD '$AVD_NAME' not found. Available: $avds"
        exit 1
    fi

    log "Launching $AVD_NAME emulator..."
    # Use cmd.exe to launch the Windows-side emulator from WSL2
    cmd.exe /c "start /b $(wslpath -w "$EMULATOR") -avd $AVD_NAME -no-snapshot-load -no-audio -gpu host" 2>/dev/null &

    wait_for_device
    wait_for_boot
}

cmd_build() {
    log "Building web assets..."
    cd "$PROJECT_DIR"
    npm run build

    log "Syncing to Android..."
    npx cap sync android

    log "Building debug APK..."
    cd "$PROJECT_DIR/android"
    ./gradlew assembleDebug

    if [ ! -f "$APK_PATH" ]; then
        log "ERROR: APK not found at $APK_PATH"
        exit 1
    fi

    log "APK built: $(ls -lh "$APK_PATH" | awk '{print $5}')"
}

cmd_deploy() {
    if ! is_emulator_booted; then
        log "ERROR: No booted emulator. Run with --start or without --no-build first."
        exit 1
    fi

    if [ ! -f "$APK_PATH" ]; then
        log "ERROR: No APK found. Run build first (or remove --no-build)."
        exit 1
    fi

    log "Installing APK..."
    $ADB install -r "$APK_PATH" 2>&1

    # Clear old logcat before launching
    $ADB logcat -c 2>/dev/null

    log "Launching $PACKAGE..."
    $ADB shell am start -n "$PACKAGE/$ACTIVITY" 2>&1

    log "Waiting ${APP_LOAD_TIMEOUT}s for app to load..."
    sleep "$APP_LOAD_TIMEOUT"
}

cmd_capture() {
    ensure_output_dir
    local ts
    ts=$(timestamp)

    if ! is_emulator_booted; then
        log "ERROR: No booted emulator for capture."
        exit 1
    fi

    # Screenshot
    log "Taking screenshot..."
    $ADB shell screencap -p /sdcard/screenshot.png 2>/dev/null
    $ADB pull /sdcard/screenshot.png "$OUTPUT_DIR/screenshot_${ts}.png" 2>/dev/null
    # Also keep a "latest" symlink/copy for easy access
    cp "$OUTPUT_DIR/screenshot_${ts}.png" "$OUTPUT_DIR/screenshot_latest.png" 2>/dev/null
    log "Screenshot: $OUTPUT_DIR/screenshot_${ts}.png"

    # UI dump (uiautomator)
    log "Dumping UI tree..."
    $ADB shell uiautomator dump /sdcard/ui_dump.xml 2>/dev/null
    $ADB pull /sdcard/ui_dump.xml "$OUTPUT_DIR/ui_dump_${ts}.xml" 2>/dev/null
    cp "$OUTPUT_DIR/ui_dump_${ts}.xml" "$OUTPUT_DIR/ui_dump_latest.xml" 2>/dev/null
    log "UI dump: $OUTPUT_DIR/ui_dump_${ts}.xml"

    # Logcat (app-specific)
    log "Capturing logcat..."
    $ADB logcat -d -s "Capacitor" "Capacitor/Console" "chromium" "GhostLog" "WebViewConsole" \
        > "$OUTPUT_DIR/logcat_${ts}.txt" 2>/dev/null
    cp "$OUTPUT_DIR/logcat_${ts}.txt" "$OUTPUT_DIR/logcat_latest.txt" 2>/dev/null
    local lines
    lines=$(wc -l < "$OUTPUT_DIR/logcat_${ts}.txt")
    log "Logcat: $OUTPUT_DIR/logcat_${ts}.txt ($lines lines)"

    # Full logcat (for debugging)
    $ADB logcat -d > "$OUTPUT_DIR/logcat_full_${ts}.txt" 2>/dev/null
    log "Full logcat: $OUTPUT_DIR/logcat_full_${ts}.txt"

    # Device info
    log "Collecting device info..."
    {
        echo "=== Device Info ==="
        echo "Model: $($ADB shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
        echo "SDK: $($ADB shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r')"
        echo "Android: $($ADB shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')"
        echo "ABI: $($ADB shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r')"
        echo ""
        echo "=== Installed Package ==="
        $ADB shell dumpsys package "$PACKAGE" 2>/dev/null | grep -E "versionCode|versionName|firstInstallTime|lastUpdateTime" | head -10
        echo ""
        echo "=== Current Activity ==="
        $ADB shell dumpsys activity top 2>/dev/null | head -5
    } > "$OUTPUT_DIR/device_info_${ts}.txt"
    log "Device info: $OUTPUT_DIR/device_info_${ts}.txt"

    log ""
    log "=== Capture complete ==="
    log "Output directory: $OUTPUT_DIR"
    ls -la "$OUTPUT_DIR"/screenshot_latest.png "$OUTPUT_DIR"/ui_dump_latest.xml \
           "$OUTPUT_DIR"/logcat_latest.txt 2>/dev/null
}

cmd_kill() {
    if is_emulator_running; then
        log "Killing emulator..."
        $ADB emu kill 2>/dev/null
        # Emulator takes ~5s to fully shut down
        local waited=0
        while [ $waited -lt 15 ]; do
            sleep 2
            waited=$((waited + 2))
            if ! is_emulator_running; then
                log "Emulator killed"
                return 0
            fi
        done
        if is_emulator_running; then
            log "WARNING: Emulator may still be shutting down"
        fi
    else
        log "No emulator running"
    fi
}

# ----- Main -----

check_adb

case "${1:-}" in
    --capture)
        cmd_capture
        ;;
    --kill)
        cmd_kill
        ;;
    --no-build)
        cmd_start_emulator
        cmd_deploy
        cmd_capture
        ;;
    --help|-h)
        echo "Usage: $0 [--no-build|--capture|--kill|--help]"
        echo ""
        echo "  (no args)    Full pipeline: start emulator, build, deploy, capture"
        echo "  --no-build   Start emulator, deploy existing APK, capture"
        echo "  --capture    Only take screenshot + logcat + UI dump"
        echo "  --kill       Kill the running emulator"
        echo ""
        echo "Output goes to: $OUTPUT_DIR"
        ;;
    *)
        cmd_start_emulator
        cmd_build
        cmd_deploy
        cmd_capture
        ;;
esac
