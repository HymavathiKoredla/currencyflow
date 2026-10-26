import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export default function SummaryCards({
  fromCurrency,
  toCurrency,
  rateData,
  historyStats,
  selectedRange
}) {
  const currentRate = rateData?.rate ?? null;
  const inverseRate = currentRate && currentRate > 0 ? (1 / currentRate) : null;
  const percentChange = historyStats?.percentageChange ?? 0;
  const isPositive = percentChange >= 0;

  const formatRate = (val, maxDecimals = 4) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals
    });
  };

  return (
    <div className="summary-grid">
      {/* Current Reference Rate */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-title">Reference Rate</span>
          <div className="summary-icon-box">
            <DollarSign size={18} />
          </div>
        </div>
        <div className="summary-value">
          {currentRate !== null ? `${formatRate(currentRate, 4)} ${toCurrency}` : '—'}
        </div>
        <div className="summary-footer">
          <span>1 {fromCurrency} = {formatRate(currentRate, 4)} {toCurrency}</span>
          {inverseRate && (
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
              1 {toCurrency} = {formatRate(inverseRate, 4)} {fromCurrency}
            </span>
          )}
        </div>
      </div>

      {/* Period High */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-title">{selectedRange.toUpperCase()} High</span>
          <div className="summary-icon-box" style={{ color: 'var(--accent-emerald)' }}>
            <ArrowUpRight size={18} />
          </div>
        </div>
        <div className="summary-value" style={{ color: 'var(--accent-emerald)' }}>
          {historyStats?.highestRate !== null ? formatRate(historyStats?.highestRate, 4) : '—'}
        </div>
        <div className="summary-footer">
          <span>Date: {historyStats?.highestDate || '—'}</span>
        </div>
      </div>

      {/* Period Low */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-title">{selectedRange.toUpperCase()} Low</span>
          <div className="summary-icon-box" style={{ color: 'var(--accent-rose)' }}>
            <ArrowDownRight size={18} />
          </div>
        </div>
        <div className="summary-value" style={{ color: 'var(--accent-rose)' }}>
          {historyStats?.lowestRate !== null ? formatRate(historyStats?.lowestRate, 4) : '—'}
        </div>
        <div className="summary-footer">
          <span>Date: {historyStats?.lowestDate || '—'}</span>
        </div>
      </div>

      {/* Period Net Movement */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-title">{selectedRange.toUpperCase()} Movement</span>
          <div className="summary-icon-box" style={{ color: isPositive ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
            {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
        </div>
        <div className="summary-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{isPositive ? `+${percentChange}%` : `${percentChange}%`}</span>
        </div>
        <div className="summary-footer">
          <span className={isPositive ? 'badge-trend-up' : 'badge-trend-down'}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? 'Gain' : 'Decline'}
          </span>
          <span style={{ marginLeft: '6px' }}>over last {selectedRange}</span>
        </div>
      </div>
    </div>
  );
}
