/**
 * API client service for CurrencyFlow
 */

const BASE_URL = '/api';

/**
 * Helper to handle fetch responses and extract clean error messages
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error || `Request failed with status ${res.status}`;
      const error = new Error(errorMsg);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
      throw new Error('Could not connect to the CurrencyFlow backend server. Is it running?');
    }
    throw err;
  }
}

/**
 * Fetch supported currency list
 */
export async function getCurrencies() {
  const data = await request('/currencies');
  return data.currencies || [];
}

/**
 * Fetch latest reference rate for a pair
 */
export async function getRate(base, quote) {
  const params = new URLSearchParams({ base, quote });
  return request(`/rate?${params.toString()}`);
}

/**
 * Perform currency conversion and persist to database
 */
export async function convertCurrency(amount, from, to) {
  return request('/convert', {
    method: 'POST',
    body: JSON.stringify({ amount: Number(amount), from, to })
  });
}

/**
 * Fetch historical time series
 */
export async function getHistoricalRates(base, quote, range = '30d') {
  const params = new URLSearchParams({ base, quote, range });
  return request(`/history?${params.toString()}`);
}

/**
 * Fetch recent saved conversions
 */
export async function getConversions(limit = 20) {
  const params = new URLSearchParams({ limit });
  const data = await request(`/conversions?${params.toString()}`);
  return data.conversions || [];
}

/**
 * Clear conversion history
 */
export async function clearConversionHistory() {
  return request('/conversions', {
    method: 'DELETE'
  });
}

/**
 * Fetch system stats
 */
export async function getStats() {
  const data = await request('/stats');
  return data.stats || {};
}

/**
 * Backend health check
 */
export async function checkHealth() {
  return request('/health');
}
