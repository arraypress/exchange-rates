/**
 * @arraypress/exchange-rates
 *
 * Free, no-API-key currency-rate snapshots on top of the public
 * `@fawazahmed0/currency-api` dataset (CC0, mirrored on jsDelivr,
 * republished daily). Designed to be called at **build time** so
 * the rates ship as a static JSON file in your repo — no runtime
 * network call, no API key, no rate limit, no first-paint blocking.
 *
 * Two entry points:
 *
 *   1. JS API — `fetchRates({ base, currencies, ... })` returns a
 *      `{ base, date, rates, source }` snapshot object you can
 *      JSON-stringify wherever you like.
 *
 *   2. CLI — `npx @arraypress/exchange-rates --base GBP --out
 *      src/data/rates.json --currencies USD,EUR,JPY`. Wraps the JS
 *      API and writes the snapshot to disk.
 *
 * Zero dependencies. Works in Node.js (18+), Cloudflare Workers,
 * Deno, Bun, and modern browsers (anywhere `fetch` exists).
 *
 * @module @arraypress/exchange-rates
 */

/**
 * @typedef {Object} FetchRatesOptions
 * @property {string} base - ISO-4217 base currency code (case-insensitive). All rates returned are expressed as `1 BASE = rate * <currency>`.
 * @property {string[]} [currencies] - ISO-4217 codes to include. Default: every currency the upstream dataset exposes for `base` (≈340 entries). Pass an explicit list to keep the snapshot small.
 * @property {string} [version] - Upstream version pin. Default: `'latest'`. Set a `YYYY.M.D` value to lock to a specific day.
 * @property {number} [precision] - Decimal places to round each rate to. Default: `4`. Pass `null` / `Infinity` to keep full upstream precision.
 * @property {string} [endpoint] - Override the upstream endpoint template. Receives `{base}` and `{version}` placeholders. Default: jsDelivr CDN URL.
 * @property {typeof fetch} [fetch] - `fetch` implementation override. Useful for tests / non-browser environments where `globalThis.fetch` is missing.
 */

/**
 * @typedef {Object} RatesSnapshot
 * @property {string} base - Uppercase ISO-4217 code the snapshot is denominated in.
 * @property {string} date - Source date stamp from the upstream dataset (YYYY-MM-DD).
 * @property {Record<string, number>} rates - Uppercase ISO code → rate from `base`.
 * @property {string} source - Provenance string for the snapshot (humans + auditors).
 */

const DEFAULT_ENDPOINT =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{version}/v1/currencies/{base}.min.json';

const DEFAULT_PRECISION = 4;

/**
 * Round a number to `places` decimal places. Returns the value
 * unchanged if `places` is null / Infinity / negative — useful when
 * the caller wants the raw upstream precision.
 *
 * @param {number} value
 * @param {number | null | undefined} places
 * @returns {number}
 */
function roundTo(value, places) {
  if (places == null || !Number.isFinite(places) || places < 0) return value;
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
}

/**
 * Build the upstream URL for a given base + version. Exposed so
 * tests can assert URL construction without hitting the network.
 *
 * @param {string} base - Lowercase base code.
 * @param {string} version
 * @param {string} endpoint
 * @returns {string}
 */
export function buildUrl(base, version = 'latest', endpoint = DEFAULT_ENDPOINT) {
  return endpoint
    .replace('{version}', version)
    .replace('{base}', base);
}

/**
 * Fetch a currency-rate snapshot.
 *
 * @param {FetchRatesOptions} options
 * @returns {Promise<RatesSnapshot>}
 *
 * @example
 * const snapshot = await fetchRates({
 *   base: 'GBP',
 *   currencies: ['USD', 'EUR', 'JPY'],
 * });
 * // → { base: 'GBP', date: '2026-05-23', rates: { USD: 1.34, EUR: 1.16, JPY: 213.84 }, source: '@fawazahmed0/currency-api via jsDelivr' }
 */
export async function fetchRates(options) {
  if (!options || typeof options !== 'object') {
    throw new TypeError('[exchange-rates] options object is required');
  }
  if (!options.base || typeof options.base !== 'string') {
    throw new TypeError('[exchange-rates] `base` is required');
  }

  const base = options.base.toLowerCase();
  const version = options.version ?? 'latest';
  const precision = options.precision === undefined ? DEFAULT_PRECISION : options.precision;
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (typeof fetchImpl !== 'function') {
    throw new Error(
      '[exchange-rates] No fetch implementation found. Pass options.fetch on Node <18.',
    );
  }

  const url = buildUrl(base, version, endpoint);
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`[exchange-rates] Fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  const payload = await res.json();

  const allRates = payload[base];
  if (!allRates || typeof allRates !== 'object') {
    throw new Error(
      `[exchange-rates] Unexpected response shape — no "${base}" key in payload`,
    );
  }

  const wanted = Array.isArray(options.currencies)
    ? options.currencies.map((c) => String(c).toLowerCase())
    : Object.keys(allRates);

  const rates = {};
  const missing = [];
  for (const code of wanted) {
    const value = allRates[code];
    if (typeof value !== 'number') {
      missing.push(code.toUpperCase());
      continue;
    }
    rates[code.toUpperCase()] = roundTo(value, precision);
  }

  return {
    base: base.toUpperCase(),
    date: payload.date ?? '',
    rates,
    source: '@fawazahmed0/currency-api via jsDelivr',
    ...(missing.length ? { missing } : {}),
  };
}
