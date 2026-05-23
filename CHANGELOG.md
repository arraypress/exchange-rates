# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] — Unreleased

### Initial Release

- `fetchRates({ base, currencies?, version?, precision?, endpoint?, fetch? })`
  — Promise → `{ base, date, rates, source, missing? }`. Defaults
  to all upstream currencies + 4dp precision; pass an explicit
  list to keep the snapshot small. Reports any requested ISO codes
  the upstream didn't carry under `missing`.
- `buildUrl(base, version?, endpoint?)` — pure helper to inspect
  the upstream URL the library would hit. Useful for cache layers
  + audit logs.
- `exchange-rates` CLI (`bin/cli.js`) — write the snapshot to disk
  for build-time refreshes. Flags: `--base`, `--out`, `--currencies`,
  `--version`, `--precision`, `--endpoint`, `--pretty` / `--compact`,
  `--quiet`, `--help`.
- Data source: `@fawazahmed0/currency-api` (CC0, mirrored on
  jsDelivr, republished daily). No API key, no rate limit.

18 tests passing under Node's built-in test runner. ESM-only,
zero runtime dependencies.
