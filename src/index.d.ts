/**
 * @arraypress/exchange-rates — TypeScript definitions.
 */

export interface FetchRatesOptions {
  /** ISO-4217 base currency code (case-insensitive). All rates
   *  returned are expressed as `1 BASE = rate * <currency>`. */
  base: string;
  /** ISO-4217 codes to include. Default: every currency the
   *  upstream dataset exposes for `base` (≈340 entries). Pass an
   *  explicit list to keep the snapshot small. */
  currencies?: string[];
  /** Upstream version pin. Default: `'latest'`. Set a `YYYY.M.D`
   *  value to lock to a specific day. */
  version?: string;
  /** Decimal places to round each rate to. Default: `4`. Pass
   *  `null` / `Infinity` to keep full upstream precision. */
  precision?: number | null;
  /** Override the upstream endpoint template. Receives `{base}` and
   *  `{version}` placeholders. Default: jsDelivr CDN URL. */
  endpoint?: string;
  /** `fetch` implementation override. Useful for tests / non-browser
   *  environments where `globalThis.fetch` is missing. */
  fetch?: typeof fetch;
}

export interface RatesSnapshot {
  /** Uppercase ISO-4217 code the snapshot is denominated in. */
  base: string;
  /** Source date stamp from the upstream dataset (YYYY-MM-DD). */
  date: string;
  /** Uppercase ISO code → rate from `base`. */
  rates: Record<string, number>;
  /** Provenance string for the snapshot. */
  source: string;
  /** Codes the caller requested but the upstream dataset didn't
   *  carry. Only present when at least one was missing. */
  missing?: string[];
}

/**
 * Fetch a currency-rate snapshot from the free, no-API-key
 * `@fawazahmed0/currency-api` dataset (CC0, mirrored on jsDelivr).
 *
 * Designed to be called at **build time** so the rates ship as a
 * static JSON file in your repo — no runtime network call, no API
 * key, no rate limit.
 *
 * @example
 *   const snapshot = await fetchRates({
 *     base: 'GBP',
 *     currencies: ['USD', 'EUR', 'JPY'],
 *   });
 */
export function fetchRates(options: FetchRatesOptions): Promise<RatesSnapshot>;

/** Build the upstream URL for a given base + version. */
export function buildUrl(
  base: string,
  version?: string,
  endpoint?: string,
): string;
