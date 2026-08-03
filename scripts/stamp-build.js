#!/usr/bin/env node
// Writes src/constants/buildInfo.js before bundling.
// Build number = git commit count (monotonically increasing, no manual tracking).
// Safe to run locally or inside EAS preBuildCommand.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function git(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null;
  }
}

const buildNumber = parseInt(git('git rev-list --count HEAD') || '0', 10);
const gitHash    = git('git rev-parse --short HEAD') || 'unknown';
const buildDate  = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const buildTime  = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

const content = `// AUTO-GENERATED — do not edit by hand. Re-run: npm run stamp
export const BUILD_NUMBER = ${buildNumber};
export const BUILD_DATE   = '${buildDate}';
export const BUILD_TIME   = '${buildTime}';
export const GIT_HASH     = '${gitHash}';
`;

const outDir = path.join(__dirname, '..', 'src', 'constants');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'buildInfo.js'), content);

console.log(`Stamped build #${buildNumber} (${gitHash}) dated ${buildDate}`);
