import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import SummaryCards from './components/SummaryCards';
import CurrencyConverter from './components/CurrencyConverter';
import RateHistory from './components/RateHistory';
import ConversionHistory from './components/ConversionHistory';
import {
  getCurrencies,
  getRate,
  getHistoricalRates,
  getConversions,
  clearConversionHistory
} from './services/api';

const DEFAULT_CURRENCIES = [
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
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' }
];

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('currencyflow_theme') || 'dark';
  });

  const [currencies, setCurrencies] = useState(DEFAULT_CURRENCIES);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('INR');
  const [selectedRange, setSelectedRange] = useState('30d');

  const [rateData, setRateData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const [conversions, setConversions] = useState([]);
  const [conversionsLoading, setConversionsLoading] = useState(false);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('currencyflow_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load currencies and initial conversions
  useEffect(() => {
    async function initData() {
      try {
        const currs = await getCurrencies();
        if (currs && currs.length > 0) {
          setCurrencies(currs);
        }
      } catch (err) {
        console.warn('Using default currencies fallback:', err.message);
      }

      loadConversions();
    }
    initData();
  }, []);

  const loadConversions = async () => {
    setConversionsLoading(true);
    try {
      const records = await getConversions(25);
      setConversions(records);
    } catch (err) {
      console.error('Error fetching conversions:', err.message);
    } finally {
      setConversionsLoading(false);
    }
  };

  // Fetch current rate and historical time-series
  const fetchRateAndHistory = useCallback(async () => {
    if (!fromCurrency || !toCurrency) return;

    // Fetch latest rate
    try {
      const rateRes = await getRate(fromCurrency, toCurrency);
      if (rateRes.success) {
        setRateData(rateRes);
      }
    } catch (err) {
      console.error('Error fetching rate:', err.message);
    }

    // Fetch history
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const histRes = await getHistoricalRates(fromCurrency, toCurrency, selectedRange);
      if (histRes.success) {
        setHistoryData(histRes.history || []);
        setHistoryStats(histRes.stats || null);
      }
    } catch (err) {
      setHistoryError(err.message || 'Failed to fetch historical exchange rates');
      setHistoryData([]);
      setHistoryStats(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [fromCurrency, toCurrency, selectedRange]);

  useEffect(() => {
    fetchRateAndHistory();
  }, [fetchRateAndHistory]);

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleConversionSuccess = () => {
    loadConversions();
  };

  const handleClearHistory = async () => {
    await clearConversionHistory();
    setConversions([]);
  };

  const handleReconvert = (item) => {
    setFromCurrency(item.from_currency);
    setToCurrency(item.to_currency);
    // Smooth scroll to converter card
    const el = document.getElementById('converter-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        latestDate={rateData?.date}
        isCached={rateData?.isCached}
      />

      {/* Summary Cards */}
      <SummaryCards
        fromCurrency={fromCurrency}
        toCurrency={toCurrency}
        rateData={rateData}
        historyStats={historyStats}
        selectedRange={selectedRange}
      />

      {/* Main Grid: Converter and History Chart */}
      <div className="main-dashboard-grid">
        <CurrencyConverter
          currencies={currencies}
          fromCurrency={fromCurrency}
          toCurrency={toCurrency}
          onFromChange={setFromCurrency}
          onToChange={setToCurrency}
          onSwap={handleSwap}
          onConversionSuccess={handleConversionSuccess}
        />

        <RateHistory
          fromCurrency={fromCurrency}
          toCurrency={toCurrency}
          historyData={historyData}
          historyStats={historyStats}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          loading={historyLoading}
          error={historyError}
          onRetry={fetchRateAndHistory}
        />
      </div>

      {/* Conversion History Table */}
      <ConversionHistory
        conversions={conversions}
        onClearHistory={handleClearHistory}
        onReconvert={handleReconvert}
        loading={conversionsLoading}
      />

      {/* Footer */}
      <footer style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        <div>
          <strong>CurrencyFlow</strong> — Designed with precision for financial tracking and currency analysis.
        </div>
        <div style={{ marginTop: '8px' }}>
          Data provided by <a href="https://frankfurter.dev" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Frankfurter API</a> (ECB reference rates).
        </div>
      </footer>
    </div>
  );
}
