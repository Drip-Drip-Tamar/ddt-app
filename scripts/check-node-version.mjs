#!/usr/bin/env node
/* eslint-disable no-console */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

export function normalizeNodeVersion(value) {
  return String(value ?? '').trim().replace(/^v/i, '');
}

export function checkNodeVersion({ actualVersion, expectedVersion }) {
  const actual = normalizeNodeVersion(actualVersion);
  const expected = normalizeNodeVersion(expectedVersion);

  return {
    actualVersion: actual,
    expectedVersion: expected,
    matches: actual === expected
  };
}

export function formatNodeMismatch(result) {
  return [
    `Expected Node.js ${result.expectedVersion} from .nvmrc, but current Node.js is ${result.actualVersion}.`,
    'Run `nvm install && nvm use` before installing dependencies or deploying.'
  ].join('\n');
}

function readExpectedVersion() {
  return readFileSync(path.join(repoRoot, '.nvmrc'), 'utf8');
}

function main() {
  const result = checkNodeVersion({
    actualVersion: process.versions.node,
    expectedVersion: readExpectedVersion()
  });

  if (!result.matches) {
    console.error(formatNodeMismatch(result));
    process.exit(1);
  }

  console.log(`Node.js ${result.actualVersion} matches .nvmrc.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
