import { saveRateObservation, getLatestCachedRate, getCachedHistory } from '../db.js';

const FRANKFURTER_BASE_URL = process.env.FRANKFURTER_API_BASE || 'https://api.frankfurter.dev/v2';
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 60 * 60 * 1000; // 1 hour

// Default fallback currency list if initial cold-start fetch fails without internet
export const FALLBACK_CURRENCIES = [
  { code: 'USD', name: 'United States Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' }
];

let cachedCurrencies = null;
let lastCurrenciesFetch = 0;

/**
 * Format Date as YYYY-MM-DD
 */
export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch supported currencies from Frankfurter API with memory caching
 */
export async function getSupportedCurrencies() {
  const now = Date.now();
  if (cachedCurrencies && (now - lastCurrenciesFetch < CACHE_TTL_MS)) {
    return cachedCurrencies;
  }

  try {
    const response = await fetchWithTimeout(`${FRANKFURTER_BASE_URL}/currencies`);
    if (!response.ok) {
      throw new Error(`Frankfurter currencies returned HTTP ${response.status}`);
    }

    const data = await response.json();
    let parsed = [];

    if (Array.isArray(data)) {
      parsed = data.map(item => ({
        code: item.iso_code || item.code,
        name: item.name,
        symbol: item.symbol || ''
      }));
    } else if (typeof data === 'object' && data !== null) {
      // If key-value object (code: name)
      parsed = Object.entries(data).map(([code, name]) => ({
        code,
        name: typeof name === 'string' ? name : (name.name || code),
        symbol: (typeof name === 'object' && name.symbol) ? name.symbol : ''
      }));
    }

    if (parsed.length > 0) {
      parsed.sort((a, b) => a.code.localeCompare(b.code));
      cachedCurrencies = parsed;
      lastCurrenciesFetch = now;
      return parsed;
    }
  } catch (err) {
    console.warn(`[Frankfurter] Could not fetch live currencies (${err.message}). Using fallback list.`);
  }

  if (cachedCurrencies) {
    return cachedCurrencies;
  }

  return FALLBACK_CURRENCIES;
}

/**
 * Get latest reference exchange rate for a currency pair
 */
export async function getExchangeRate(baseInput, quoteInput) {
  const base = String(baseInput).trim().toUpperCase();
  const quote = String(quoteInput).trim().toUpperCase();

  const todayStr = formatDate(new Date());

  // Handle same-currency conversion
  if (base === quote) {
    return {
      base,
      quote,
      rate: 1.0,
      date: todayStr,
      isCached: false,
      source: 'Identical currency'
    };
  }

  try {
    // Frankfurter v2 supports /rate/{base}/{quote} or /rates?base={base}&quotes={quote}
    const response = await fetchWithTimeout(`${FRANKFURTER_BASE_URL}/rate/${base}/${quote}`);
    
    if (response.status === 422 || response.status === 404) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody.message || `Unsupported currency pair: ${base} to ${quote}`;
      const err = new Error(msg);
      err.status = 422;
      throw err;
    }

    if (!response.ok) {
      throw new Error(`Exchange rate provider returned HTTP ${response.status}`);
    }

    const data = await response.json();
    // v2 /rate/USD/INR returns { date: "2026-10-26", base: "USD", quote: "INR", rate: 94.93 }
    if (typeof data.rate !== 'number' && typeof data.rate !== 'string') {
      throw new Error('Invalid rate format returned from provider');
    }

    const rate = Number(data.rate);
    const date = data.date || todayStr;

    // Persist observation to SQLite cache
    try {
      saveRateObservation({
        base_currency: base,
        quote_currency: quote,
        rate,
        rate_date: date
      });
    } catch (dbErr) {
      console.error('[DB] Failed saving rate observation:', dbErr.message);
    }

    return {
      base,
      quote,
      rate,
      date,
      isCached: false,
      source: 'Frankfurter Reference Rates'
    };
  } catch (err) {
    if (err.status === 422) {
      throw err;
    }

    console.warn(`[Frankfurter] Rate lookup failed for ${base}/${quote}: ${err.message}. Checking local cache...`);

    // Check local database cache for this pair
    const cached = getLatestCachedRate(base, quote);
    if (cached) {
      return {
        base,
        quote,
        rate: Number(cached.rate),
        date: cached.rate_date,
        isCached: true,
        source: 'Local SQLite Cache (Offline Mode)',
        warning: 'Live provider unreachable. Displaying latest saved reference rate.'
      };
    }

    const netErr = new Error(`Unable to obtain exchange rate for ${base} to ${quote}. ${err.message}`);
    netErr.status = 502;
    throw netErr;
  }
}

/**
 * Calculate date range from range selector (7d, 30d, 90d, 1y)
 */
export function calculateDateRange(range = '30d') {
  const to = new Date();
  let days = 30;

  const normalized = String(range).toLowerCase().trim();
  if (normalized === '7d' || normalized === '7') {
    days = 7;
  } else if (normalized === '30d' || normalized === '30') {
    days = 30;
  } else if (normalized === '90d' || normalized === '90') {
    days = 90;
  } else if (normalized === '1y' || normalized === '365' || normalized === '365d') {
    days = 365;
  } else {
    const parsedDays = parseInt(normalized, 10);
    if (!isNaN(parsedDays) && parsedDays > 0) {
      days = Math.min(parsedDays, 365);
    }
  }

  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    from: formatDate(from),
    to: formatDate(to),
    days
  };
}

/**
 * Fetch historical time-series rates and compute statistics
 */
export async function getHistoricalRates(baseInput, quoteInput, range = '30d') {
  const base = String(baseInput).trim().toUpperCase();
  const quote = String(quoteInput).trim().toUpperCase();
  const { from, to, days } = calculateDateRange(range);

  // Identical currencies
  if (base === quote) {
    const points = [
      { date: from, rate: 1.0 },
      { date: to, rate: 1.0 }
    ];
    return {
      base,
      quote,
      range,
      from,
      to,
      isCached: false,
      history: points,
      stats: {
        highestRate: 1.0,
        highestDate: to,
        lowestRate: 1.0,
        lowestDate: from,
        percentageChange: 0,
        latestRate: 1.0,
        dataPoints: points.length
      }
    };
  }

  try {
    const url = `${FRANKFURTER_BASE_URL}/rates?from=${from}&to=${to}&base=${base}&quotes=${quote}`;
    const response = await fetchWithTimeout(url);

    if (response.status === 422 || response.status === 404) {
      const errBody = await response.json().catch(() => ({}));
      const err = new Error(errBody.message || `No historical rates available for ${base}/${quote}`);
      err.status = 422;
      throw err;
    }

    if (!response.ok) {
      throw new Error(`Frankfurter historical rates returned HTTP ${response.status}`);
    }

    const data = await response.json();
    let history = [];

    // Frankfurter v2 /rates?from=...&to=... returns an array:
    // [ { date: "2026-10-01", base: "USD", quote: "INR", rate: 95.99 }, ... ]
    if (Array.isArray(data)) {
      history = data.map(item => ({
        date: item.date,
        rate: Number(item.rate)
      })).filter(item => !isNaN(item.rate));
    } else if (data && typeof data.rates === 'object') {
      // v1 compatibility fallback if format differs
      history = Object.entries(data.rates).map(([date, quotes]) => ({
        date,
        rate: Number(quotes[quote] ?? quotes)
      })).filter(item => !isNaN(item.rate));
    }

    // Sort by date ascending
    history.sort((a, b) => a.date.localeCompare(b.date));

    // Cache observations in SQLite
    for (const item of history) {
      try {
        saveRateObservation({
          base_currency: base,
          quote_currency: quote,
          rate: item.rate,
          rate_date: item.date
        });
      } catch (cacheErr) {
        // Continue even if cache write fails
      }
    }

    const stats = computeHistoryStats(history);

    return {
      base,
      quote,
      range,
      from,
      to,
      isCached: false,
      history,
      stats
    };
  } catch (err) {
    if (err.status === 422) {
      throw err;
    }

    console.warn(`[Frankfurter] History lookup failed for ${base}/${quote}: ${err.message}. Checking cached history...`);

    // Fallback to local SQLite cache
    const cachedRows = getCachedHistory(base, quote, from, to);
    if (cachedRows && cachedRows.length > 0) {
      const history = cachedRows.map(r => ({
        date: r.date,
        rate: Number(r.rate)
      }));

      return {
        base,
        quote,
        range,
        from,
        to,
        isCached: true,
        history,
        stats: computeHistoryStats(history),
        warning: 'Historical data loaded from local cache (offline mode)'
      };
    }

    const netErr = new Error(`Unable to fetch historical rates for ${base} to ${quote}. ${err.message}`);
    netErr.status = 502;
    throw netErr;
  }
}

/**
 * Compute statistics (high, low, percent change) for a series of rate points
 */
export function computeHistoryStats(history) {
  if (!history || history.length === 0) {
    return {
      highestRate: null,
      highestDate: null,
      lowestRate: null,
      lowestDate: null,
      percentageChange: 0,
      latestRate: null,
      dataPoints: 0
    };
  }

  let highest = history[0];
  let lowest = history[0];

  for (const item of history) {
    if (item.rate > highest.rate) highest = item;
    if (item.rate < lowest.rate) lowest = item;
  }

  const oldest = history[0].rate;
  const latest = history[history.length - 1].rate;
  const percentageChange = oldest !== 0 
    ? Number((((latest - oldest) / oldest) * 100).toFixed(2))
    : 0;

  return {
    highestRate: highest.rate,
    highestDate: highest.date,
    lowestRate: lowest.rate,
    lowestDate: lowest.date,
    percentageChange,
    latestRate: latest,
    dataPoints: history.length
  };
}
