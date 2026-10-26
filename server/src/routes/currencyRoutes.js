import express from 'express';
import {
  getSupportedCurrencies,
  getExchangeRate,
  getHistoricalRates
} from '../services/frankfurter.js';
import { getAppStats, getLatestCachedRate } from '../db.js';

const router = express.Router();

/**
 * Validate currency code format (3 uppercase ASCII letters)
 */
function isValidCurrencyCode(code) {
  return typeof code === 'string' && /^[A-Za-z]{3}$/.test(code.trim());
}

/**
 * GET /api/currencies
 * Returns list of supported currencies with code, name, and symbol
 */
router.get('/currencies', async (req, res, next) => {
  try {
    const currencies = await getSupportedCurrencies();
    res.json({
      success: true,
      count: currencies.length,
      currencies
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/rate?base=USD&quote=INR
 * (Also accepts ?from=USD&to=INR)
 */
router.get('/rate', async (req, res, next) => {
  try {
    const base = req.query.base || req.query.from;
    const quote = req.query.quote || req.query.to;

    if (!base || !quote) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: "base" (or "from") and "quote" (or "to")'
      });
    }

    if (!isValidCurrencyCode(base) || !isValidCurrencyCode(quote)) {
      return res.status(400).json({
        success: false,
        error: 'Currency codes must be 3-letter ISO codes (e.g., USD, EUR, INR)'
      });
    }

    const rateData = await getExchangeRate(base, quote);
    res.json({
      success: true,
      ...rateData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/history?base=USD&quote=INR&range=30d
 * (Also accepts ?from=USD&to=INR&days=30)
 */
router.get('/history', async (req, res, next) => {
  try {
    const base = req.query.base || req.query.from;
    const quote = req.query.quote || req.query.to;
    let range = req.query.range || req.query.days || '30d';

    if (!base || !quote) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: "base" (or "from") and "quote" (or "to")'
      });
    }

    if (!isValidCurrencyCode(base) || !isValidCurrencyCode(quote)) {
      return res.status(400).json({
        success: false,
        error: 'Currency codes must be 3-letter ISO codes (e.g., USD, EUR, INR)'
      });
    }

    // Format days number into range string if necessary
    if (/^\d+$/.test(String(range))) {
      range = `${range}d`;
    }

    const historyData = await getHistoricalRates(base, quote, range);
    res.json({
      success: true,
      ...historyData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/history/latest?from=USD&to=INR
 * Returns latest rate observation for given pair
 */
router.get('/history/latest', async (req, res, next) => {
  try {
    const base = req.query.base || req.query.from;
    const quote = req.query.quote || req.query.to;

    if (!base || !quote) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: "from" and "to"'
      });
    }

    const rateData = await getExchangeRate(base, quote);
    res.json({
      success: true,
      ...rateData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats
 * Returns overall usage and database stats
 */
router.get('/stats', (req, res) => {
  const stats = getAppStats();
  res.json({
    success: true,
    stats
  });
});

export default router;
