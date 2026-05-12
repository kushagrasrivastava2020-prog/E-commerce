import api from './axios';

// Anonymous session id so we can still attribute events for logged-out users
function getSessionId() {
  let sid = localStorage.getItem('rec_session_id');
  if (!sid) {
    sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('rec_session_id', sid);
  }
  return sid;
}

export const recApi = {
  trackEvent: (event_type, product_id, event_data) =>
    api.post('/recommendations/events', {
      event_type,
      product_id,
      session_id: getSessionId(),
      event_data,
    }).catch(() => null), // never break UI on a failed track

  getPreferences: () => api.get('/recommendations/preferences'),
  setPreferences: (payload) => api.put('/recommendations/preferences', payload),

  forYou: (limit = 8) => api.get(`/recommendations/for-you?limit=${limit}`),
  similar: (productId, limit = 8) => api.get(`/recommendations/similar/${productId}?limit=${limit}`),
  trending: (limit = 8) => api.get(`/recommendations/trending?limit=${limit}`),
};
