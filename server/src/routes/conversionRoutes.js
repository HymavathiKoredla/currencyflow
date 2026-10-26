import express from 'express';
import {
  saveConversion,
  getRecentConversions,
  clearConversions
} from '../db.js';
import { getExchangeRate } from '../services/frankfurter.js';

const router = express.Router();

function isValidCurrencyCode(code) {
  return typeof code === 'string' && /^[A-Za-z]{3}$/.test(code.trim());
}

/**
 * Common handler for conversion logic
 */
async function performConversion(amountRaw, fromRaw, toRaw) {
  // Validate amount
  if (amountRaw === undefined || amountRaw === null || amountRaw === '') {
    const err = new Error('Amount is required');
    err.status = 400;
    throw err;
  }

  const amount = Number(amountRaw);
  if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
    const err = new Error('Amount must be a positive finite number greater than zero');
    err.status = 400;
    throw err;
  }

  // Validate currency codes
  if (!fromRaw || !toRaw) {
    const err = new Error('Both "from" and "to" currencies are required');
    err.status = 400;
    throw err;
  }

  const from = String(fromRaw).trim().toUpperCase();
  const to = String(toRaw).trim().toUpperCase();

  if (!isValidCurrencyCode(from) || !isValidCurrencyCode(to)) {
    const err = new Error('Currencies must be 3-letter ISO codes (e.g. USD, EUR, INR)');
    err.status = 400;
    throw err;
  }

  // Fetch exchange rate
  const rateData = await getExchangeRate(from, to);
  const rate = rateData.rate;
  const convertedAmount = Number((amount * rate).toFixed(6));

  // Save to database
  const record = saveConversion({
    amount,
    from_currency: from,
    to_currency: to,
    exchange_rate: rate,
    converted_amount: convertedAmount,
    rate_date: rateData.date
  });

  return {
    ...record,
    rate,
    rateDate: rateData.date,
    isCached: rateData.isCached || false,
    source: rateData.source || 'Frankfurter Reference Rates',
    warning: rateData.warning || null
  };
}

/**
 * GET /api/conversions
 * Retrieve recent conversions
 */
router.get('/conversions', (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const conversions = getRecentConversions(limit);
    res.json({
      success: true,
      count: conversions.length,
      conversions
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/convert
 * Convert amount from one currency to another and persist record
 */
router.post('/convert', async (req, res, next) => {
  try {
    const { amount, from, to, from_currency, to_currency } = req.body || {};
    const result = await performConversion(
      amount,
      from || from_currency,
      to || to_currency
    );
    res.status(201).json({
      success: true,
      result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/convert?amount=100&from=USD&to=INR
 * Convenience GET conversion endpoint
 */
router.get('/convert', async (req, res, next) => {
  try {
    const { amount, from, to } = req.query;
    const result = await performConversion(amount, from, to);
    res.json({
      success: true,
      result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/conversions
 * Clear all conversion history
 */
router.delete('/conversions', (req, res, next) => {
  try {
    const { deleted } = clearConversions();
    res.json({
      success: true,
      message: 'Conversion history cleared successfully',
      deleted
    });
  } catch (err) {
    next(err);
  }
});

export default router;
