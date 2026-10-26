import React, { useState } from 'react';
import { ArrowLeftRight, Check, Copy, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { convertCurrency } from '../services/api';

const PRESET_AMOUNTS = [10, 100, 1000, 5000, 10000];
const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD', 'AED', 'CNY', 'CHF'];

export default function CurrencyConverter({
  currencies,
  fromCurrency,
  toCurrency,
  onFromChange,
  onToChange,
  onSwap,
  onConversionSuccess
}) {
  const [amount, setAmount] = useState('100');
  const [conversionResult, setConversionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Filter query state for currency dropdowns
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');

  const filteredFromList = currencies.filter(c =>
    c.code.toLowerCase().includes(fromSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(fromSearch.toLowerCase())
  );

  const filteredToList = currencies.filter(c =>
    c.code.toLowerCase().includes(toSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(toSearch.toLowerCase())
  );

  // Format currency numbers nicely
  const formatNumber = (num, currencyCode, maxDecimals = 2) => {
    try {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: maxDecimals
      }).format(num);
    } catch {
      return Number(num).toFixed(2);
    }
  };

  const handleConvert = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || !isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const response = await convertCurrency(numericAmount, fromCurrency, toCurrency);
      if (response.success && response.result) {
        setConversionResult(response.result);
        if (onConversionSuccess) {
          onConversionSuccess(response.result);
        }
      }
    } catch (err) {
      setError(err.message || 'Conversion failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!conversionResult) return;
    const textToCopy = `${amount} ${fromCurrency} = ${conversionResult.converted_amount} ${toCurrency} (Rate: ${conversionResult.exchange_rate} on ${conversionResult.rateDate || conversionResult.rate_date})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inverseRate = conversionResult?.exchange_rate && conversionResult.exchange_rate > 0
    ? (1 / conversionResult.exchange_rate)
    : null;

  return (
    <div className="glass-card" id="converter-section">
      <div className="card-title-group">
        <h2 className="card-title">
          <Sparkles size={22} color="var(--accent-primary)" />
          Convert currencies instantly
        </h2>
        <p className="card-subtitle">
          Real-time institutional reference exchange rates with zero markup
        </p>
      </div>

      <form onSubmit={handleConvert}>
        {/* Amount Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="amount-input">
            Amount
          </label>
          <div className="amount-input-wrapper">
            <input
              id="amount-input"
              type="number"
              step="any"
              min="0.000001"
              className="amount-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="amount-presets">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="preset-chip"
                onClick={() => setAmount(String(preset))}
              >
                +{preset.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Currency Selectors */}
        <div className="currency-selection-row">
          {/* Source Currency */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="from-currency">
              From Currency
            </label>
            <div className="currency-select-box">
              <select
                id="from-currency"
                className="select-dropdown"
                value={fromCurrency}
                onChange={(e) => onFromChange(e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} {c.symbol ? `(${c.symbol})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <button
            type="button"
            className="swap-btn"
            onClick={onSwap}
            title="Swap source and target currencies"
            aria-label="Swap currencies"
          >
            <ArrowLeftRight size={20} />
          </button>

          {/* Target Currency */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="to-currency">
              To Currency
            </label>
            <div className="currency-select-box">
              <select
                id="to-currency"
                className="select-dropdown"
                value={toCurrency}
                onChange={(e) => onToChange(e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} {c.symbol ? `(${c.symbol})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Popular Quick Currency Chips */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Popular currencies:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {POPULAR_CURRENCIES.map(code => (
              <button
                key={code}
                type="button"
                className="preset-chip"
                style={{
                  borderColor: (toCurrency === code || fromCurrency === code) ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  color: (toCurrency === code) ? 'var(--accent-primary)' : 'var(--text-secondary)'
                }}
                onClick={() => {
                  if (fromCurrency === code) {
                    onSwap();
                  } else {
                    onToChange(code);
                  }
                }}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* Validation / API Error Banner */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--accent-rose)',
            fontSize: '0.85rem',
            marginBottom: '18px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Convert Button */}
        <button
          type="submit"
          className="convert-btn"
          disabled={loading || !amount || parseFloat(amount) <= 0}
        >
          {loading ? (
            <>
              <div className="spinner" />
              <span>Fetching live rates...</span>
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              <span>Convert {fromCurrency} to {toCurrency}</span>
            </>
          )}
        </button>
      </form>

      {/* Prominent Conversion Result */}
      {conversionResult && (
        <div className="conversion-result-card">
          <div className="result-from-text">
            {formatNumber(conversionResult.amount, fromCurrency, 4)} {fromCurrency} =
          </div>
          <div className="result-to-text">
            {formatNumber(conversionResult.converted_amount, toCurrency, 4)} {toCurrency}
          </div>

          <div className="result-rate-subtext">
            <span>
              <strong>1 {fromCurrency}</strong> = {formatNumber(conversionResult.exchange_rate, toCurrency, 4)} {toCurrency}
            </span>
            {inverseRate && (
              <span>
                • <strong>1 {toCurrency}</strong> = {formatNumber(inverseRate, fromCurrency, 4)} {fromCurrency}
              </span>
            )}
          </div>

          <div className="result-footer-row">
            <div>
              <span>Reference date: <strong>{conversionResult.rateDate || conversionResult.rate_date}</strong></span>
              <span style={{ marginLeft: '12px' }}>Provider: <strong>{conversionResult.source || 'Frankfurter API (ECB)'}</strong></span>
              {conversionResult.isCached && (
                <span style={{ marginLeft: '10px', color: 'var(--accent-amber)', fontWeight: 'bold' }}>
                  (Offline Cached)
                </span>
              )}
            </div>

            <button
              type="button"
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              title="Copy conversion details"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
