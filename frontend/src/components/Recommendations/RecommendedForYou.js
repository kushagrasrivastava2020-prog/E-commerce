import React, { useEffect, useState, useCallback } from 'react';
import { recApi } from '../../api/recommendations';
import { useAuth } from '../../context/AuthContext';
import PreferencesModal from './PreferencesModal';
import RecRow from './RecRow';

const RecommendedForYou = () => {
  const { user } = useAuth();
  const [forYou, setForYou] = useState([]);
  const [trending, setTrending] = useState([]);
  const [meta, setMeta] = useState({ llm_enabled: false, llm_provider: null, llm_model: null });
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const loadForYou = useCallback(async () => {
    if (!user) return;
    try {
      const r = await recApi.forYou(8);
      setForYou(r.data.data || []);
      setMeta(r.data.meta || {});
    } catch {
      setForYou([]);
    }
  }, [user]);

  const loadTrending = useCallback(async () => {
    try {
      const r = await recApi.trending(8);
      setTrending(r.data.data || []);
    } catch {
      setTrending([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setPrefsLoaded(true); return; }
      try {
        const r = await recApi.getPreferences();
        const hasPrefs = !!r.data?.data;
        if (!cancelled && !hasPrefs) setShowPrefs(true);
      } catch { /* ignore */ }
      finally { if (!cancelled) setPrefsLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => { loadForYou(); }, [loadForYou]);
  useEffect(() => { loadTrending(); }, [loadTrending]);

  const aiBadge = meta.llm_enabled
    ? `🤖 ${meta.llm_provider}${meta.llm_model ? ' · ' + meta.llm_model : ''}`
    : null;

  return (
    <>
      {showPrefs && (
        <PreferencesModal
          onClose={() => setShowPrefs(false)}
          onSaved={() => { setShowPrefs(false); loadForYou(); }}
        />
      )}

      {user && (
        <RecRow
          title={`Recommended for ${user.first_name}`}
          subtitle={meta.llm_enabled
            ? 'AI-curated picks based on your preferences and activity'
            : 'Personalised based on your preferences and recent activity'}
          badge={aiBadge}
          products={forYou}
          emptyText={prefsLoaded ? 'Tell us what you like to unlock personalised picks.' : null}
        />
      )}

      <RecRow
        title="🔥 Trending now"
        subtitle="What other shoppers are loving this week"
        products={trending}
      />

      {user && (
        <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPrefs(true)}>
            ⚙️ Edit my preferences
          </button>
        </div>
      )}
    </>
  );
};

export default RecommendedForYou;
