import React from 'react';
import { Link } from 'react-router-dom';

const RecRow = ({ title, subtitle, products, emptyText, badge }) => {
  if (!products || products.length === 0) {
    if (!emptyText) return null;
    return (
      <section className="rec-section">
        <div className="section-heading">
          <div>
            <div className="section-title">{title}</div>
            {subtitle && <span className="section-subtitle">{subtitle}</span>}
          </div>
          {badge && (
            <span className="ai-chip">
              <span className="ai-dot" />
              {badge}
            </span>
          )}
        </div>
        <div className="rec-empty">{emptyText}</div>
      </section>
    );
  }

  return (
    <section className="rec-section">
      <div className="section-heading">
        <div>
          <div className="section-title">{title}</div>
          {subtitle && <span className="section-subtitle">{subtitle}</span>}
        </div>
        {badge && <span className="ai-chip">{badge}</span>}
      </div>
      <div className="rec-row">
        {products.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`} className="rec-card">
            <div className="rec-card-image">
              {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" /> : '📦'}
            </div>
            <div className="rec-card-body">
              <div className="rec-card-title">{p.name}</div>
              {p.reason && <div className="rec-card-reason">✨ {p.reason}</div>}
              <div className="rec-card-price">${parseFloat(p.price).toFixed(2)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RecRow;
