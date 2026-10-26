import React from 'react';
import { ArrowLeftRight, Moon, Sun, ShieldCheck } from 'lucide-react';

export default function Header({
  theme,
  toggleTheme,
  latestDate,
  isCached
}) {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="header">
      <div className="logo-group">
        <div className="logo-icon-wrapper">
          <ArrowLeftRight size={24} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="logo-text-title">CurrencyFlow</span>
            <span className="logo-badge">Live</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Real-Time Currency Converter & Rate History
          </p>
        </div>
      </div>

      <nav className="header-nav">
        <button className="nav-link" onClick={() => scrollTo('converter-section')}>
          Converter
        </button>
        <button className="nav-link" onClick={() => scrollTo('chart-section')}>
          Rate History
        </button>
        <button className="nav-link" onClick={() => scrollTo('recent-section')}>
          Conversions
        </button>
      </nav>

      <div className="header-actions">
        <div className="status-pill" title={isCached ? 'Operating in cached offline mode' : 'Live data synchronized with Frankfurter API'}>
          <span className="status-dot" style={{ backgroundColor: isCached ? '#F59E0B' : '#10B981' }} />
          <span>{isCached ? 'Cached' : 'Live ECB'} • {latestDate || 'Today'}</span>
        </div>

        <button
          className="theme-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
