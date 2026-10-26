import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { LineChart as ChartIcon, RefreshCw, AlertTriangle, Calendar } from 'lucide-react';

const RANGES = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y', value: '1y' }
];

// Custom Tooltip component
const CustomTooltip = ({ active, payload, label, quote }) => {
  if (active && payload && payload.length) {
    const rateVal = payload[0].value;
    return (
      <div className="custom-chart-tooltip">
        <div className="tooltip-date">
          <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
          {label}
        </div>
        <div className="tooltip-rate">
          {Number(rateVal).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
          })} {quote}
        </div>
      </div>
    );
  }
  return null;
};

export default function RateHistory({
  fromCurrency,
  toCurrency,
  historyData,
  historyStats,
  selectedRange,
  onRangeChange,
  loading,
  error,
  onRetry
}) {
  const chartData = historyData || [];

  // Calculate dynamic min/max domain with padding for pleasant scaling
  let yDomain = ['auto', 'auto'];
  if (chartData.length > 0) {
    const rates = chartData.map(d => d.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const spread = max - min || (min * 0.05);
    const padding = spread * 0.15;
    yDomain = [
      Math.max(0, Number((min - padding).toFixed(4))),
      Number((max + padding).toFixed(4))
    ];
  }

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const isPositive = (historyStats?.percentageChange ?? 0) >= 0;
  const strokeColor = isPositive ? '#10B981' : '#6366F1';
  const gradientColor = isPositive ? '#10B981' : '#6366F1';

  return (
    <div className="glass-card" id="chart-section">
      <div className="chart-header-row">
        <div>
          <h2 className="card-title">
            <ChartIcon size={22} color="var(--accent-primary)" />
            {fromCurrency} to {toCurrency} Rate History
          </h2>
          <p className="card-subtitle">
            Historical exchange rate trends and period volatility
          </p>
        </div>

        {/* Range Selector Buttons */}
        <div className="range-selector-group">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`range-btn ${selectedRange === r.value ? 'active' : ''}`}
              onClick={() => onRangeChange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats pill bar */}
      {historyStats && historyStats.dataPoints > 0 && (
        <div className="chart-stats-pill-group">
          <div className="chart-stat-chip">
            Period High: <strong>{historyStats.highestRate}</strong> ({historyStats.highestDate})
          </div>
          <div className="chart-stat-chip">
            Period Low: <strong>{historyStats.lowestRate}</strong> ({historyStats.lowestDate})
          </div>
          <div className="chart-stat-chip">
            Change: <strong style={{ color: isPositive ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
              {isPositive ? `+${historyStats.percentageChange}%` : `${historyStats.percentageChange}%`}
            </strong>
          </div>
          <div className="chart-stat-chip">
            Points: <strong>{historyStats.dataPoints}</strong>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="state-container">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: 'var(--accent-primary)' }} />
          <p className="state-title" style={{ marginTop: 16 }}>Loading historical data...</p>
          <p className="state-desc">Fetching rate time-series for {fromCurrency}/{toCurrency} ({selectedRange})</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="state-container">
          <AlertTriangle size={36} color="var(--accent-rose)" className="state-icon" />
          <p className="state-title">Unable to load exchange rate history</p>
          <p className="state-desc">{error}</p>
          <button className="btn-retry" onClick={onRetry}>
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && chartData.length === 0 && (
        <div className="state-container">
          <Calendar size={36} color="var(--text-muted)" className="state-icon" />
          <p className="state-title">No rate history available</p>
          <p className="state-desc">
            No historical observations were reported by the reference provider for {fromCurrency}/{toCurrency} over this period.
          </p>
        </div>
      )}

      {/* Recharts Line/Area Chart */}
      {!loading && !error && chartData.length > 0 && (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={gradientColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.06)"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                minTickGap={20}
              />

              <YAxis
                domain={yDomain}
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => Number(val).toFixed(2)}
              />

              <Tooltip
                content={<CustomTooltip quote={toCurrency} />}
              />

              <Area
                type="monotone"
                dataKey="rate"
                stroke={strokeColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#rateGradient)"
                activeDot={{ r: 5, fill: '#FFFFFF', stroke: strokeColor, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
