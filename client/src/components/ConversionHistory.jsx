import React, { useState } from 'react';
import { History, Trash2, ArrowRight, Clock, AlertCircle } from 'lucide-react';

export default function ConversionHistory({
  conversions,
  onClearHistory,
  onReconvert,
  loading
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleConfirmClear = async () => {
    setClearing(true);
    try {
      await onClearHistory();
      setShowConfirmModal(false);
    } finally {
      setClearing(false);
    }
  };

  const formatNumber = (num, maxDecimals = 2) => {
    try {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: maxDecimals
      }).format(num);
    } catch {
      return Number(num).toFixed(2);
    }
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="glass-card" id="recent-section" style={{ marginTop: '24px' }}>
      <div className="conversions-header-row">
        <div>
          <h2 className="card-title">
            <History size={22} color="var(--accent-primary)" />
            Recent Conversions
          </h2>
          <p className="card-subtitle">
            Local audit trail of your converted amounts and applied reference rates
          </p>
        </div>

        {conversions.length > 0 && (
          <button
            type="button"
            className="btn-clear-history"
            onClick={() => setShowConfirmModal(true)}
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {conversions.length === 0 && (
        <div className="state-container">
          <Clock size={40} color="var(--text-muted)" className="state-icon" />
          <p className="state-title">No conversions yet</p>
          <p className="state-desc">
            Your conversion calculations and recorded exchange rates will appear here automatically.
          </p>
        </div>
      )}

      {/* Conversions Table */}
      {conversions.length > 0 && (
        <div className="conversions-table-container">
          <table className="conversions-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Original Amount</th>
                <th>Converted Amount</th>
                <th>Applied Rate</th>
                <th>Rate Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {formatDateTime(item.created_at)}
                    </span>
                  </td>
                  <td>
                    <strong>{formatNumber(item.amount)}</strong>{' '}
                    <span className="table-currency-badge">{item.from_currency}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-white)' }}>
                      {formatNumber(item.converted_amount)}
                    </strong>{' '}
                    <span className="table-currency-badge">{item.to_currency}</span>
                  </td>
                  <td>
                    <span className="table-rate-mono">
                      1 {item.from_currency} = {formatNumber(item.exchange_rate, 4)} {item.to_currency}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.rate_date || '—'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-reconvert"
                      onClick={() => onReconvert(item)}
                      title="Load this conversion in converter"
                    >
                      <span>Load</span>
                      <ArrowRight size={12} style={{ display: 'inline', marginLeft: 4, verticalAlign: -1 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)' }}>
              <AlertCircle size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Clear Conversion History?</h3>
            </div>
            <p style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              This will permanently delete all {conversions.length} recorded conversions from your local SQLite database. This action cannot be undone.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowConfirmModal(false)}
                disabled={clearing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={handleConfirmClear}
                disabled={clearing}
              >
                {clearing ? 'Clearing...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
