import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Rolling debug log buffer — shared across the app
const DEBUG_LOG = [];
const MAX_LOG_ENTRIES = 15;
let logListeners = [];

export function debugLog(message) {
  const entry = `${new Date().toISOString().slice(11, 23)} ${message}`;
  DEBUG_LOG.push(entry);
  if (DEBUG_LOG.length > MAX_LOG_ENTRIES) DEBUG_LOG.shift();
  console.log('[GhostLog Debug]', message);
  // Notify listeners
  logListeners.forEach(fn => fn([...DEBUG_LOG]));
}

function useDebugLog() {
  const [logs, setLogs] = useState(() => [...DEBUG_LOG]);
  useEffect(() => {
    logListeners.push(setLogs);
    return () => {
      logListeners = logListeners.filter(fn => fn !== setLogs);
    };
  }, []);
  return logs;
}

/**
 * Debug overlay for native (iOS/Android) builds.
 * Shows auth state and rolling console log.
 * Dismissible, only renders on native platforms.
 *
 * TEMPORARY: Remove this component when iOS auth is confirmed working.
 */
export function DebugOverlay({ authPhase, cloudUser, authLoading, authError }) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const logs = useDebugLog();

  // Only show on native platforms
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  if (!isNative || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 60,
        left: 4,
        right: 4,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.92)',
        border: '1px solid #333',
        borderRadius: 8,
        padding: 8,
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#aaa',
        maxHeight: expanded ? '60vh' : 120,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Header with controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 11 }}>DEBUG</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ color: '#666', background: 'none', border: 'none', fontFamily: 'monospace', fontSize: 10, cursor: 'pointer' }}
          >
            {expanded ? 'collapse' : 'expand'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{ color: '#666', background: 'none', border: 'none', fontFamily: 'monospace', fontSize: 10, cursor: 'pointer' }}
          >
            dismiss
          </button>
        </div>
      </div>

      {/* Auth state summary */}
      <div style={{ marginBottom: 4, lineHeight: 1.5 }}>
        <div>
          <span style={{ color: '#666' }}>phase:</span>{' '}
          <span style={{ color: authPhase === 'authenticated' ? '#22c55e' : authPhase === 'error' ? '#ef4444' : '#facc15' }}>
            {authPhase}
          </span>
        </div>
        <div>
          <span style={{ color: '#666' }}>user:</span>{' '}
          <span style={{ color: cloudUser ? '#22c55e' : '#ef4444' }}>
            {cloudUser ? cloudUser.email : 'null'}
          </span>
        </div>
        <div>
          <span style={{ color: '#666' }}>loading:</span>{' '}
          <span>{String(authLoading)}</span>
          {authError && (
            <>
              {' '}<span style={{ color: '#666' }}>err:</span>{' '}
              <span style={{ color: '#ef4444' }}>{authError}</span>
            </>
          )}
        </div>
      </div>

      {/* Rolling log */}
      {expanded && (
        <div style={{ borderTop: '1px solid #333', paddingTop: 4, marginTop: 4 }}>
          {logs.length === 0 ? (
            <div style={{ color: '#444' }}>No log entries yet</div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} style={{ color: '#777', fontSize: 9, lineHeight: 1.4, wordBreak: 'break-all' }}>
                {entry}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
