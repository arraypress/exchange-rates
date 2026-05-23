import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRates, buildUrl } from '../src/index.js';

/** Build a mock fetch that returns a canned upstream payload. */
function mockFetch(payload, { ok = true, status = 200, statusText = 'OK' } = {}) {
  return async (_url) => ({
    ok,
    status,
    statusText,
    async json() { return payload; },
  });
}

// ── buildUrl ────────────────────────────────

describe('buildUrl', () => {
  it('builds the default jsDelivr URL', () => {
    assert.equal(
      buildUrl('gbp', 'latest'),
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/gbp.min.json',
    );
  });

  it('honours a pinned version', () => {
    assert.equal(
      buildUrl('usd', '2026.5.23'),
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2026.5.23/v1/currencies/usd.min.json',
    );
  });

  it('honours a custom endpoint template', () => {
    assert.equal(
      buildUrl('eur', 'latest', 'https://my-cdn.example.com/{version}/{base}.json'),
      'https://my-cdn.example.com/latest/eur.json',
    );
  });
});

// ── fetchRates — input validation ──────────

describe('fetchRates — input validation', () => {
  it('throws when options is missing', async () => {
    await assert.rejects(() => fetchRates(), /options object is required/);
  });

  it('throws when base is missing', async () => {
    await assert.rejects(() => fetchRates({}), /`base` is required/);
  });

  it('throws when no fetch implementation is available', async () => {
    /* Simulate Node <18 by deleting globalThis.fetch + passing none. */
    const realFetch = globalThis.fetch;
    delete globalThis.fetch;
    try {
      await assert.rejects(
        () => fetchRates({ base: 'GBP' }),
        /No fetch implementation found/,
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

// ── fetchRates — happy path ────────────────

describe('fetchRates — happy path', () => {
  const FIXTURE = {
    date: '2026-05-23',
    gbp: {
      usd: 1.34323456,
      eur: 1.15761234,
      jpy: 213.84381111,
      btc: 0.00001322,
    },
  };

  it('returns base + date + rates + source', async () => {
    const snap = await fetchRates({
      base: 'GBP',
      currencies: ['USD', 'EUR', 'JPY'],
      fetch: mockFetch(FIXTURE),
    });
    assert.equal(snap.base, 'GBP');
    assert.equal(snap.date, '2026-05-23');
    assert.equal(snap.source, '@fawazahmed0/currency-api via jsDelivr');
    assert.deepEqual(Object.keys(snap.rates), ['USD', 'EUR', 'JPY']);
  });

  it('returns uppercase ISO codes regardless of input casing', async () => {
    const snap = await fetchRates({
      base: 'gbp',
      currencies: ['usd', 'EUR'],
      fetch: mockFetch(FIXTURE),
    });
    assert.deepEqual(Object.keys(snap.rates), ['USD', 'EUR']);
  });

  it('rounds to 4dp by default', async () => {
    const snap = await fetchRates({
      base: 'GBP',
      currencies: ['USD'],
      fetch: mockFetch(FIXTURE),
    });
    assert.equal(snap.rates.USD, 1.3432);
  });

  it('respects an explicit precision', async () => {
    const snap = await fetchRates({
      base: 'GBP',
      currencies: ['USD'],
      precision: 2,
      fetch: mockFetch(FIXTURE),
    });
    assert.equal(snap.rates.USD, 1.34);
  });

  it('keeps full precision when precision=null', async () => {
    const snap = await fetchRates({
      base: 'GBP',
      currencies: ['USD'],
      precision: null,
      fetch: mockFetch(FIXTURE),
    });
    assert.equal(snap.rates.USD, 1.34323456);
  });

  it('returns every upstream currency when none specified', async () => {
    const snap = await fetchRates({
      base: 'GBP',
      fetch: mockFetch(FIXTURE),
    });
    assert.deepEqual(Object.keys(snap.rates).sort(), ['BTC', 'EUR', 'JPY', 'USD']);
  });

  it('reports missing currencies in the snapshot', async () => {
    const snap = await fetchRates({
      base: 'GBP',
      currencies: ['USD', 'XYZ', 'EUR'],
      fetch: mockFetch(FIXTURE),
    });
    assert.deepEqual(snap.missing, ['XYZ']);
    assert.deepEqual(Object.keys(snap.rates), ['USD', 'EUR']);
  });

  it('omits the missing field when nothing is missing', async () => {
    const snap = await fetchRates({
      base: 'GBP',
      currencies: ['USD'],
      fetch: mockFetch(FIXTURE),
    });
    assert.ok(!('missing' in snap));
  });
});

// ── fetchRates — failures ──────────────────

describe('fetchRates — upstream failures', () => {
  it('throws on non-OK responses', async () => {
    await assert.rejects(
      () =>
        fetchRates({
          base: 'GBP',
          fetch: mockFetch(null, { ok: false, status: 404, statusText: 'Not Found' }),
        }),
      /Fetch failed: 404 Not Found/,
    );
  });

  it('throws when payload lacks the base key', async () => {
    await assert.rejects(
      () =>
        fetchRates({
          base: 'GBP',
          fetch: mockFetch({ date: '2026-05-23', /* gbp missing */ }),
        }),
      /Unexpected response shape — no "gbp" key/,
    );
  });
});

// ── fetchRates — URL construction ─────────

describe('fetchRates — URL construction', () => {
  it('passes the right URL to fetch', async () => {
    let calledUrl = null;
    const spyFetch = async (url) => {
      calledUrl = url;
      return {
        ok: true,
        async json() {
          return { date: '2026-05-23', gbp: { usd: 1.34 } };
        },
      };
    };
    await fetchRates({ base: 'GBP', fetch: spyFetch });
    assert.equal(
      calledUrl,
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/gbp.min.json',
    );
  });

  it('honours the version pin in the URL', async () => {
    let calledUrl = null;
    const spyFetch = async (url) => {
      calledUrl = url;
      return {
        ok: true,
        async json() {
          return { date: '2026-05-23', gbp: { usd: 1.34 } };
        },
      };
    };
    await fetchRates({ base: 'GBP', version: '2026.5.23', fetch: spyFetch });
    assert.ok(calledUrl.includes('@2026.5.23'));
  });
});
