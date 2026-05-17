const BASE = '/api';

async function apiFetch(path, options = {}) {
  const { body, headers, ...rest } = options;
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
    ...rest,
  });
}

export const api = {
  me: () => apiFetch('/auth/me'),
  login: (username, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),

  recipes: {
    list: (q) => apiFetch(q ? `/recipes?q=${encodeURIComponent(q)}` : '/recipes'),
    get: (id) => apiFetch(`/recipes/${id}`),
    create: (data) => apiFetch('/recipes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/recipes/${id}`, { method: 'DELETE' }),
    patchTags: (id, tags) =>
      apiFetch(`/recipes/${id}/tags`, { method: 'PATCH', body: JSON.stringify({ tags }) }),
    shop: (id) => apiFetch(`/recipes/${id}/shop`, { method: 'POST' }),
  },

  admin: {
    info: () => apiFetch('/admin/info'),
    downloadUrl: () => `${BASE}/admin/db/download`,
    upload: (file) => {
      const form = new FormData();
      form.append('database', file);
      return fetch(`${BASE}/admin/db/upload`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
    },
  },
};

export function formatAmount(amount) {
  if (amount == null) return '';
  const n = Number(amount);
  return n % 1 === 0 ? String(Math.round(n)) : String(n);
}

export function parseTags(tagsStr) {
  if (!tagsStr) return [];
  return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
}
