#!/usr/bin/env node
/* eslint-disable no-console */

import crypto from 'node:crypto';
import fs from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function formatBackupTimestamp(now = new Date()) {
  return now.toISOString().replace(/[:.]/g, '-');
}

function sanitizeForFilename(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'dataset';
}

export function buildBackupPlan({ repoRoot, dataset, now = new Date() }) {
  const timestamp = formatBackupTimestamp(now);
  const safeDataset = sanitizeForFilename(dataset);
  const backupRoot = path.join(repoRoot, 'backups');
  const backupDir = path.join(backupRoot, 'sanity', timestamp);
  const archivePath = path.join(backupDir, `ddt-sanity-${safeDataset}-${timestamp}.tar.gz`);

  return {
    archivePath,
    backupDir,
    backupRoot,
    checksumPath: `${archivePath}.sha256`,
    dataset,
    manifestPath: path.join(backupDir, 'manifest.json'),
    timestamp
  };
}

export function buildSanityExportArgs({ dataset, destination, projectId }) {
  const args = ['datasets', 'export', dataset, destination];

  if (projectId) {
    args.push('--project-id', projectId);
  }

  return args;
}

export function assertSanityExportOnlyArgs(args) {
  if (args[0] !== 'datasets' || args[1] !== 'export' || !args[2] || !args[3]) {
    throw new Error(`Refusing to run non-export Sanity command: sanity ${args.join(' ')}`);
  }

  const unsafeFlags = new Set(['--overwrite', '--replace', '--replace-assets', '--no-assets', '--no-drafts']);
  const unsafeFlag = args.find((arg) => unsafeFlags.has(arg));

  if (unsafeFlag) {
    throw new Error(`Refusing unsafe Sanity export flag: ${unsafeFlag}`);
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: options.stdio || 'pipe',
      cwd: options.cwd,
      env: options.env
    });

    let stderr = '';

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}${stderr ? `\n${stderr}` : ''}`));
    });
  });
}

async function defaultCheckIgnored(relativePath, repoRoot) {
  try {
    await runCommand('git', ['check-ignore', '-q', '--', relativePath], { cwd: repoRoot });
    return true;
  } catch {
    return false;
  }
}

export async function assertBackupRootIgnored(relativePath, checkIgnored = defaultCheckIgnored, repoRoot = process.cwd()) {
  const probePath = path.posix.join(relativePath, 'sanity', '.gitignore-probe');

  if (await checkIgnored(relativePath, repoRoot) || await checkIgnored(probePath, repoRoot)) {
    return;
  }

  throw new Error(
    `Backup root is not gitignored: ${relativePath}. Add /${relativePath}/ to .gitignore before exporting sensitive Sanity data.`
  );
}

async function assertPathDoesNotExist(targetPath) {
  try {
    await stat(targetPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  throw new Error(`Refusing to overwrite existing backup path: ${targetPath}`);
}

async function assertFileExists(targetPath) {
  const fileStat = await stat(targetPath);

  if (!fileStat.isFile() || fileStat.size === 0) {
    throw new Error(`Expected a non-empty backup archive at: ${targetPath}`);
  }

  return fileStat;
}

async function writeSha256File(filePath, checksumPath) {
  const hash = crypto.createHash('sha256');
  const input = fs.createReadStream(filePath);

  await new Promise((resolve, reject) => {
    input.on('data', (chunk) => hash.update(chunk));
    input.on('error', reject);
    input.on('end', resolve);
  });

  const digest = hash.digest('hex');
  await writeFile(checksumPath, `${digest}  ${path.basename(filePath)}\n`, { flag: 'wx' });
  return digest;
}

async function writeManifest({ archiveStat, checksum, env, plan }) {
  const manifest = {
    archive: path.basename(plan.archivePath),
    checksum,
    checksumAlgorithm: 'sha256',
    containsSensitiveData: true,
    createdAt: new Date().toISOString(),
    dataset: plan.dataset,
    projectId: env.SANITY_PROJECT_ID,
    source: 'Sanity Content Lake export',
    sizeBytes: archiveStat.size,
    warning: 'Contains private Sanity content, including contact messages. Do not commit or upload to public storage.'
  };

  await writeFile(plan.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  dotenv.config({ path: path.join(repoRoot, '.env'), quiet: true });

  const env = {
    ...process.env,
    SANITY_AUTH_TOKEN: process.env.SANITY_AUTH_TOKEN || process.env.SANITY_TOKEN
  };
  const dataset = process.env.SANITY_DATASET || 'production';
  const projectId = process.env.SANITY_PROJECT_ID;

  if (!projectId) {
    throw new Error('SANITY_PROJECT_ID is required in .env');
  }

  if (!env.SANITY_AUTH_TOKEN) {
    throw new Error('SANITY_TOKEN or SANITY_AUTH_TOKEN is required in .env');
  }

  await assertBackupRootIgnored('backups', defaultCheckIgnored, repoRoot);

  const plan = buildBackupPlan({ dataset, repoRoot });
  await assertPathDoesNotExist(plan.backupDir);
  await mkdir(plan.backupDir, { recursive: true, mode: 0o700 });

  const sanityCli = path.join(repoRoot, 'studio', 'node_modules', '.bin', 'sanity');
  const args = buildSanityExportArgs({
    dataset,
    destination: plan.archivePath,
    projectId
  });
  assertSanityExportOnlyArgs(args);

  console.log(`Exporting Sanity dataset "${dataset}" to ${path.relative(repoRoot, plan.archivePath)}`);
  await runCommand(sanityCli, args, {
    cwd: path.join(repoRoot, 'studio'),
    env,
    stdio: 'inherit'
  });

  const archiveStat = await assertFileExists(plan.archivePath);
  const checksum = await writeSha256File(plan.archivePath, plan.checksumPath);
  await writeManifest({ archiveStat, checksum, env, plan });

  console.log('');
  console.log('Sanity backup staged locally.');
  console.log(`Archive: ${path.relative(repoRoot, plan.archivePath)}`);
  console.log(`Checksum: ${path.relative(repoRoot, plan.checksumPath)}`);
  console.log(`Manifest: ${path.relative(repoRoot, plan.manifestPath)}`);
  console.log('');
  console.log('This backup contains sensitive data. Upload it only to secure private storage, then apply your retention policy.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
