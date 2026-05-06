import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  assertBackupRootIgnored,
  assertSanityExportOnlyArgs,
  buildBackupPlan,
  buildSanityExportArgs
} from '../../scripts/sanity-backup.mjs';

describe('sanity backup script helpers', () => {
  it('stages timestamped backups under the repo-local backups directory', () => {
    const repoRoot = path.resolve('/repo/ddt-app');
    const plan = buildBackupPlan({
      dataset: 'production',
      now: new Date('2026-05-07T13:45:30.000Z'),
      repoRoot
    });

    const expectedDir = path.join(repoRoot, 'backups', 'sanity', '2026-05-07T13-45-30-000Z');

    expect(plan.backupRoot).toBe(path.join(repoRoot, 'backups'));
    expect(plan.backupDir).toBe(expectedDir);
    expect(plan.archivePath).toBe(
      path.join(expectedDir, 'ddt-sanity-production-2026-05-07T13-45-30-000Z.tar.gz')
    );
    expect(plan.checksumPath).toBe(`${plan.archivePath}.sha256`);
    expect(plan.manifestPath).toBe(path.join(expectedDir, 'manifest.json'));
  });

  it('builds a full Sanity export command that keeps drafts and assets', () => {
    const args = buildSanityExportArgs({
      dataset: 'production',
      destination: '/repo/ddt-app/backups/sanity/export.tar.gz',
      projectId: 'i1ywpsq5'
    });

    expect(args).toEqual([
      'datasets',
      'export',
      'production',
      '/repo/ddt-app/backups/sanity/export.tar.gz',
      '--project-id',
      'i1ywpsq5'
    ]);
    expect(args).not.toContain('--no-drafts');
    expect(args).not.toContain('--no-assets');
    expect(args).not.toContain('--overwrite');
  });

  it('refuses to run if the backup root is not gitignored', async () => {
    await expect(
      assertBackupRootIgnored('backups', async () => false)
    ).rejects.toThrow(/Backup root is not gitignored/);
  });

  it('rejects any Sanity command that is not a dataset export', () => {
    expect(() => assertSanityExportOnlyArgs(['datasets', 'export', 'production', 'backup.tar.gz'])).not.toThrow();

    expect(() => assertSanityExportOnlyArgs(['datasets', 'import', 'backup.tar.gz', 'production'])).toThrow(
      /Refusing to run non-export Sanity command/
    );
    expect(() => assertSanityExportOnlyArgs(['datasets', 'delete', 'production'])).toThrow(
      /Refusing to run non-export Sanity command/
    );
    expect(() =>
      assertSanityExportOnlyArgs(['datasets', 'export', 'production', 'backup.tar.gz', '--overwrite'])
    ).toThrow(/Refusing unsafe Sanity export flag/);
  });
});
