import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { clearConversions, getRecentConversions } from '../src/db.js';

// Setup mock fetch for deterministic tests without relying on internet
const originalFetch = globalThis.fetch;

function setupMockFetch() {
  globalThis.fetch = async (url, options) => {
    const urlStr = String(url);

    // Mock /currencies
    if (urlStr.includes('/currencies')) {
      return {
        ok: true,
        status: 200,
        json: async () => [
          { iso_code: 'USD', name: 'United States Dollar', symbol: '$' },
          { iso_code: 'EUR', name: 'Euro', symbol: '€' },
          { iso_code: 'INR', name: 'Indian Rupee', symbol: '₹' },
          { iso_code: 'GBP', name: 'British Pound Sterling', symbol: '£' },
          { iso_code: 'JPY', name: 'Japanese Yen', symbol: '¥' }
        ]
      };
    }

    // Mock invalid currency error
    if (urlStr.includes('/rate/USD/BAD') || urlStr.includes('INVALID')) {
      return {
        ok: false,
        status: 422,
        json: async () => ({ status: 422, message: 'invalid currency' })
      };
    }

    // Mock rate endpoint /rate/USD/INR
    if (urlStr.includes('/rate/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          date: '2026-10-26',
          base: 'USD',
          quote: 'INR',
          rate: 94.50
        })
      };
    }

    // Mock historical time series
    if (urlStr.includes('/rates?')) {
      return {
        ok: true,
        status: 200,
        json: async () => [
          { date: '2026-10-01', base: 'USD', quote: 'INR', rate: 93.00 },
          { date: '2026-10-10', base: 'USD', quote: 'INR', rate: 95.00 },
          { date: '2026-10-20', base: 'USD', quote: 'INR', rate: 94.00 },
          { date: '2026-10-26', base: 'USD', quote: 'INR', rate: 94.50 }
        ]
      };
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' })
    };
  };
}

describe('CurrencyFlow API Tests', () => {
  before(() => {
    setupMockFetch();
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    clearConversions();
  });

  test('GET /api/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(typeof res.body.uptime, 'number');
  });

  test('GET /api/currencies returns list of currencies', async () => {
    const res = await request(app).get('/api/currencies');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.currencies));
    assert.ok(res.body.currencies.length > 0);
    assert.ok(res.body.currencies.some(c => c.code === 'USD'));
    assert.ok(res.body.currencies.some(c => c.code === 'INR'));
  });

  test('GET /api/rate retrieves latest rate for valid pair', async () => {
    const res = await request(app).get('/api/rate?base=USD&quote=INR');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.base, 'USD');
    assert.strictEqual(res.body.quote, 'INR');
    assert.strictEqual(typeof res.body.rate, 'number');
    assert.strictEqual(res.body.rate, 94.50);
  });

  test('GET /api/rate handles identical currency with rate 1', async () => {
    const res = await request(app).get('/api/rate?base=USD&quote=USD');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.rate, 1.0);
  });

  test('GET /api/rate rejects invalid currency codes with 400', async () => {
    const res = await request(app).get('/api/rate?base=TOOLONG&quote=USD');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  test('POST /api/convert performs conversion and persists to DB', async () => {
    const res = await request(app)
      .post('/api/convert')
      .send({
        amount: 100,
        from: 'USD',
        to: 'INR'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.result.amount, 100);
    assert.strictEqual(res.body.result.from_currency, 'USD');
    assert.strictEqual(res.body.result.to_currency, 'INR');
    assert.strictEqual(res.body.result.exchange_rate, 94.50);
    assert.strictEqual(res.body.result.converted_amount, 9450);

    // Verify it was stored in DB
    const saved = getRecentConversions(5);
    assert.strictEqual(saved.length, 1);
    assert.strictEqual(saved[0].converted_amount, 9450);
  });

  test('POST /api/convert handles same currency correctly', async () => {
    const res = await request(app)
      .post('/api/convert')
      .send({
        amount: 250.50,
        from: 'EUR',
        to: 'EUR'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.result.exchange_rate, 1.0);
    assert.strictEqual(res.body.result.converted_amount, 250.50);
  });

  test('POST /api/convert rejects negative, zero, and non-numeric amounts', async () => {
    const resNegative = await request(app)
      .post('/api/convert')
      .send({ amount: -10, from: 'USD', to: 'INR' });
    assert.strictEqual(resNegative.status, 400);

    const resZero = await request(app)
      .post('/api/convert')
      .send({ amount: 0, from: 'USD', to: 'INR' });
    assert.strictEqual(resZero.status, 400);

    const resInvalid = await request(app)
      .post('/api/convert')
      .send({ amount: 'not-a-number', from: 'USD', to: 'INR' });
    assert.strictEqual(resInvalid.status, 400);
  });

  test('GET /api/convert (GET method) also works correctly', async () => {
    const res = await request(app).get('/api/convert?amount=50&from=USD&to=INR');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.result.converted_amount, 4725);
  });

  test('GET /api/history returns time series and statistics', async () => {
    const res = await request(app).get('/api/history?base=USD&quote=INR&range=30d');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.history));
    assert.strictEqual(res.body.history.length, 4);
    assert.strictEqual(res.body.stats.highestRate, 95.00);
    assert.strictEqual(res.body.stats.lowestRate, 93.00);
    assert.strictEqual(typeof res.body.stats.percentageChange, 'number');
  });

  test('GET /api/conversions and DELETE /api/conversions work properly', async () => {
    // Insert 2 conversions
    await request(app).post('/api/convert').send({ amount: 10, from: 'USD', to: 'INR' });
    await request(app).post('/api/convert').send({ amount: 20, from: 'EUR', to: 'USD' });

    const listRes = await request(app).get('/api/conversions');
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.count, 2);

    // Delete conversions
    const delRes = await request(app).delete('/api/conversions');
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.deleted, 2);

    // Verify empty
    const emptyRes = await request(app).get('/api/conversions');
    assert.strictEqual(emptyRes.body.count, 0);
  });

  test('GET /api/stats returns system statistics', async () => {
    const res = await request(app).get('/api/stats');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok('totalConversions' in res.body.stats);
    assert.ok('mostPopularPair' in res.body.stats);
  });
});
