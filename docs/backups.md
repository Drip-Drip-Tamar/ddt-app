# Sanity Backups

Sanity is the production content store for pages, posts, water samples, sampling sites, site configuration, media assets, and contact form submissions. Contact form submissions contain private personal data, so backup archives must be treated as sensitive.

Sanity managed backups are not currently available for this project. Use the manual export workflow below and upload the generated folder to a secure private storage location.

## Create A Backup

Run from the repo root:

```sh
npm run backup:sanity
```

The script reads `.env`, exports the configured Sanity dataset, and stages the result under:

```txt
backups/sanity/<timestamp>/
```

Each backup folder contains:

- `ddt-sanity-<dataset>-<timestamp>.tar.gz`
- `ddt-sanity-<dataset>-<timestamp>.tar.gz.sha256`
- `manifest.json`

The `backups/` directory is gitignored. Do not remove that ignore rule and do not commit generated backup files.

## After Export

1. Verify the checksum:

   ```sh
   cd backups/sanity/<timestamp>
   shasum -a 256 -c ddt-sanity-<dataset>-<timestamp>.tar.gz.sha256
   ```

2. Upload the whole timestamped folder to secure private storage.
3. Keep at least the latest 4 weekly backups and 1 monthly backup.
4. Delete old local staged copies once the secure upload and retention check are complete.

## Restore Safety

Do not restore directly into `production` as a first step.

For a restore drill or incident response:

1. Take a fresh pre-restore production backup with `npm run backup:sanity`.
2. Create or choose a separate private test dataset.
3. Import the archive into the test dataset.
4. Verify document counts, key pages, water-sample data, contact-message presence, and image rendering against the test dataset.
5. Only after explicit approval, plan a production restore using the verified archive.

Sanity imports bypass Studio validation, so review restored content carefully before any production restore.

## Historical Data Provenance

The water-sample dataset was originally seeded from a one-off CSV (`DripDrip_Bacterial_Sampling_18_06_2025.csv`) via a since-removed script (`sanity-export/import-water-data.js`). Both the raw CSV and the legacy `sanity-export/` import scripts were deleted from the repo (repo hygiene sweep) once their contents were confirmed to live on in Sanity itself; ongoing water-sample data now goes in via Studio or a future importer, not that script.
