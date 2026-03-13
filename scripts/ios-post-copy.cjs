#!/usr/bin/env node
/**
 * Post-copy hook for iOS: ensures local Capacitor plugins (like WebAuthPlugin)
 * are included in the packageClassList of the generated capacitor.config.json.
 *
 * Run after `npx cap copy ios` or `npx cap sync ios`.
 */
const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '..', 'ios', 'App', 'App', 'capacitor.config.json');

// Local plugin class names to add (must match @objc(Name) annotation in Swift)
const LOCAL_PLUGINS = ['WebAuthPlugin'];

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const classList = config.packageClassList || [];

  let modified = false;
  for (const plugin of LOCAL_PLUGINS) {
    if (!classList.includes(plugin)) {
      classList.push(plugin);
      modified = true;
    }
  }

  if (modified) {
    config.packageClassList = classList;
    fs.writeFileSync(configPath, JSON.stringify(config, null, '\t') + '\n');
    console.log('Added local plugins to iOS capacitor.config.json:', LOCAL_PLUGINS.join(', '));
  } else {
    console.log('Local plugins already present in iOS capacitor.config.json');
  }
} catch (e) {
  console.error('Failed to patch iOS capacitor config:', e.message);
  process.exit(1);
}
