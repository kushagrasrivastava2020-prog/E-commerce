import React from 'react';

const items = [
  { icon: '🚚', tone: '',      label: 'Free shipping',    sub: 'On orders over $50' },
  { icon: '✨', tone: 'amber', label: 'AI personalisation', sub: 'Picks reranked by your local Llama' },
  { icon: '🔒', tone: 'green', label: 'Secure checkout',  sub: 'Encrypted Razorpay payments' },
  { icon: '↩️', tone: 'pink',  label: '30-day returns',    sub: 'No-questions-asked refunds' },
];

const TrustStrip = () => (
  <div className="trust-strip reveal">
    {items.map((it) => (
      <div className="trust-item" key={it.label}>
        <span className={`trust-icon ${it.tone}`}>{it.icon}</span>
        <div>
          <div className="trust-label">{it.label}</div>
          <div className="trust-sub">{it.sub}</div>
        </div>
      </div>
    ))}
  </div>
);

export default TrustStrip;
