# @arraypress/exchange-rates

> Free, no-API-key currency-rate snapshots. JS API + CLI on top of
> the public [`@fawazahmed0/currency-api`](https://github.com/fawazahmed0/exchange-api)
> dataset (CC0, mirrored on jsDelivr, republished daily).

Designed to be called at **build time** so the rates ship as a
static JSON file in your repo — no runtime network call, no API
key, no rate limit, no first-paint blocking.

## Install

```bash
npm install --save-dev @arraypress/exchange-rates
```

(`--save-dev` because it's a build-time tool — your production
bundle never imports it.)

## CLI (most common)

Add to `package.json`:

```json
{
  "scripts": {
    "rates:update": "exchange-rates --base GBP --out src/data/rates.json --currencies USD,EUR,JPY,CAD,AUD"
  }
}
```

Then:

```bash
npm run rates:update
# Fetching rates for base=GBP…
# Wrote 5 rates dated 2026-05-23 → /…/src/data/rates.json
```

The output file:

```json
{
  "base": "GBP",
  "date": "2026-05-23",
  "rates": {
    "USD": 1.3432,
    "EUR": 1.1576,
    "JPY": 213.8438,
    "CAD": 1.8562,
    "AUD": 1.8842
  },
  "source": "@fawazahmed0/currency-api via jsDelivr"
}
```

Commit the JSON file. Run `npm run rates:update` whenever you want
fresh numbers — manually before a marketing push, or hook it into
a weekly cron / GitHub Action for hands-off freshness.

### CLI flags

| Flag                | Default                  | Description                                                |
|---------------------|--------------------------|------------------------------------------------------------|
| `--base BASE`       | **required**             | ISO-4217 base currency code.                               |
| `--out FILE`        | `rates.snapshot.json`    | Output path.                                               |
| `--currencies LIST` | all upstream             | Comma-separated ISO codes to include.                      |
| `--version VERSION` | `latest`                 | Pin to a specific upstream version (`YYYY.M.D`).           |
| `--precision N`     | `4`                      | Decimal places to round each rate to.                      |
| `--endpoint URL`    | jsDelivr CDN             | Override the upstream URL template (`{base}`, `{version}`).|
| `--pretty`          | on                       | Pretty-print JSON output (default).                        |
| `--compact`         | off                      | Minify JSON.                                               |
| `--quiet`           | off                      | Suppress progress output (errors still log).               |
| `--help`, `-h`      | —                        | Show usage.                                                |

## JS API

```js
import { fetchRates } from '@arraypress/exchange-rates';

const snapshot = await fetchRates({
  base: 'GBP',
  currencies: ['USD', 'EUR', 'JPY'],
});
// → { base: 'GBP', date: '2026-05-23',
//     rates: { USD: 1.3432, EUR: 1.1576, JPY: 213.8438 },
//     source: '@fawazahmed0/currency-api via jsDelivr' }
```

### Options

| Option         | Default     | Description                                                          |
|----------------|-------------|----------------------------------------------------------------------|
| `base`         | required    | ISO-4217 base. Case-insensitive.                                     |
| `currencies`   | all upstream| Codes to include. Omit for the full ≈340-entry dataset.              |
| `version`      | `'latest'`  | Upstream version pin (`'2026.5.23'`).                                |
| `precision`    | `4`         | Decimal places. Pass `null` for raw upstream precision.              |
| `endpoint`     | jsDelivr    | URL template — `{base}` and `{version}` placeholders.                |
| `fetch`        | `globalThis.fetch` | Override the fetch impl for tests / Node <18 (with polyfill). |

### Reporting missing currencies

Pass a code the upstream doesn't carry and the snapshot reports it
under `missing` (rates that *did* arrive still come back):

```js
const snap = await fetchRates({
  base: 'GBP',
  currencies: ['USD', 'XYZ', 'EUR'],
});
// → { rates: { USD: 1.34, EUR: 1.16 }, missing: ['XYZ'], … }
```

## TypeScript

Ships with `.d.ts`. Import the types:

```ts
import {
  fetchRates,
  type FetchRatesOptions,
  type RatesSnapshot,
} from '@arraypress/exchange-rates';
```

## Why a snapshot, not a runtime fetch?

- **Determinism** — same input → same HTML. SSR / static-site
  builds reproduce identically across machines + CI runners.
- **Speed** — first paint never blocks on an upstream call.
- **Reliability** — the site works offline, behind firewalls, on
  flaky wifi. If jsDelivr is down on update day, you still ship.
- **No keys, no quotas** — you don't have to rotate an API token
  or worry about hitting a free-tier ceiling.

Trade-off: rates are exactly as fresh as your last
`rates:update` run. For a "reference converter" UI (which is what
most storefronts need — checkout charges in the store's native
currency anyway) that's the right balance.

## Data source

[`@fawazahmed0/currency-api`](https://github.com/fawazahmed0/exchange-api)
republishes daily with **CC0** licensing — no attribution required,
public domain. 200+ fiat currencies + crypto + metals. The full
dataset is also served via jsDelivr at:

```
https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/<base>.min.json
```

## License

MIT
