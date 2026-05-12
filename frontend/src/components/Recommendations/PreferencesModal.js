import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { recApi } from '../../api/recommendations';

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle = {
  background: 'var(--white)', borderRadius: 'var(--radius-lg)',
  padding: '1.5rem', maxWidth: '520px', width: '92%',
  boxShadow: 'var(--shadow-lg)',
};
const chipStyle = (active) => ({
  display: 'inline-block', padding: '0.35rem 0.75rem', marginRight: '0.4rem', marginBottom: '0.4rem',
  borderRadius: '999px', cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem',
  background: active ? 'var(--primary)' : 'var(--gray-100)',
  color: active ? 'var(--white)' : 'var(--gray-700)',
  border: '1px solid',
  borderColor: active ? 'var(--primary)' : 'var(--gray-200)',
});

const PreferencesModal = ({ onClose, onSaved }) => {
  const [categories, setCategories] = useState([]);
  const [picked, setPicked] = useState([]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/products/categories/list').then(r => setCategories(r.data.data || [])).catch(() => {});
  }, []);

  const toggle = (id) => {
    setPicked(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await recApi.setPreferences({
        category_preferences: { categories: picked },
        price_range_min: priceMin ? Number(priceMin) : null,
        price_range_max: priceMax ? Number(priceMax) : null,
      });
      onSaved?.();
      onClose?.();
    } catch {
      // ignore — modal stays open
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>✨ Personalise your store</h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
          Pick categories you’re into so we can recommend products you’ll actually like.
        </p>

        <div style={{ marginBottom: '1rem' }}>
          {categories.map(c => (
            <span key={c.id} style={chipStyle(picked.includes(c.id))} onClick={() => toggle(c.id)}>
              {c.name}
            </span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Min price ($)</label>
            <input type="number" className="form-control" value={priceMin}
                   onChange={(e) => setPriceMin(e.target.value)} placeholder="e.g. 0" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Max price ($)</label>
            <input type="number" className="form-control" value={priceMax}
                   onChange={(e) => setPriceMax(e.target.value)} placeholder="e.g. 5000" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Skip for now</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || picked.length === 0}>
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesModal;
