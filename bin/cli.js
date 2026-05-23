#!/usr/bin/env node
/**
 * @arraypress/exchange-rates — CLI
 * ------------------------------
 *
 * Wraps `fetchRates()` and writes the snapshot to disk. Designed
 * for `npm run rates:update` style build-time refreshes.
 *
 * Usage:
 *
 *   exchange-rates --base GBP --out src/data/rates.json
 *   exchange-rates --base USD --out rates.json --currencies USD,EUR,JPY
 *   exchange-rates --base EUR --out rates.json --pretty --precision 6
 *
 * Flags:
 *   --base BASE                ISO-4217 code to denominate rates against (required)
 *   --out FILE                 Output path. Default: rates.snapshot.json
 *   --currencies LIST          Comma-separated list of ISO codes to include
 *                              (default: every currency the upstream exposes)
 *   --version VERSION          Upstream version pin (default: latest)
 *   --precision N              Decimal places to round each rate to (default: 4)
 *   --endpoint URL             Override the upstream endpoint template
 *   --pretty                   Pretty-print JSON with tab indent (default)
 *   --compact                  Minify JSON output
 *   --quiet                    Suppress progress output (errors still log)
 *   --help                     Show this message
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fetchRates } from '../src/index.js';

function parseArgs(argv) {
  const args = {
    base: null,
    out: 'rates.snapshot.json',
    currencies: null,
    version: 'latest',
    precision: undefined,
    endpoint: undefined,
    pretty: true,
    quiet: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--base':
        args.base = argv[++i];
        break;
      case '--out':
        args.out = argv[++i];
        break;
      case '--currencies':
        args.currencies = argv[++i].split(',').map((c) => c.trim()).filter(Boolean);
        break;
      case '--version':
        args.version = argv[++i];
        break;
      case '--precision':
        args.precision = Number(argv[++i]);
        break;
      case '--endpoint':
        args.endpoint = argv[++i];
        break;
      case '--pretty':
        args.pretty = true;
        break;
      case '--compact':
        args.pretty = false;
        break;
      case '--quiet':
        args.quiet = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  /* Re-print the JSDoc usage block — single source of truth so
   * --help stays in sync with the comment at the top of the file. */
  console.log(`@arraypress/exchange-rates — CLI

Usage:
  exchange-rates --base BASE --out FILE [options]

Required:
  --base BASE            ISO-4217 code to denominate rates against

Optional:
  --out FILE             Output path (default: rates.snapshot.json)
  --currencies LIST      Comma-separated ISO codes to include
                         (default: every currency the upstream exposes)
  --version VERSION      Upstream version pin (default: latest)
  --precision N          Decimal places (default: 4)
  --endpoint URL         Override upstream endpoint template
  --pretty               Pretty-print JSON (default)
  --compact              Minify JSON output
  --quiet                Suppress progress output
  --help, -h             Show this message

Examples:
  exchange-rates --base GBP --out src/data/rates.json
  exchange-rates --base USD --out rates.json --currencies USD,EUR,JPY
  exchange-rates --base EUR --out rates.json --compact --precision 6`);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    printHelp();
    process.exit(2);
  }

  if (args.help) {
    printHelp();
    return;
  }
  if (!args.base) {
    console.error('Missing required --base flag.');
    printHelp();
    process.exit(2);
  }

  const log = args.quiet ? () => {} : (msg) => console.log(msg);

  log(`Fetching rates for base=${args.base.toUpperCase()}…`);
  const snapshot = await fetchRates({
    base: args.base,
    currencies: args.currencies ?? undefined,
    version: args.version,
    precision: args.precision,
    endpoint: args.endpoint,
  });

  const outPath = resolve(process.cwd(), args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  const json = args.pretty
    ? JSON.stringify(snapshot, null, '\t') + '\n'
    : JSON.stringify(snapshot) + '\n';
  writeFileSync(outPath, json, 'utf8');

  const tracked = Object.keys(snapshot.rates).length;
  log(`Wrote ${tracked} rate${tracked === 1 ? '' : 's'} dated ${snapshot.date} → ${outPath}`);
  if (snapshot.missing && snapshot.missing.length) {
    console.warn(
      `  ⚠  Upstream did not provide rates for: ${snapshot.missing.join(', ')}`,
    );
  }
}

main().catch((err) => {
  console.error('exchange-rates failed —', err.message);
  process.exit(1);
});
