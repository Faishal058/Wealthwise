const API = import.meta.env.VITE_API_URL || 'http://localhost:8081';
const DEFAULT_CACHE_TTL_MS = 30 * 1000;

const getCache = new Map();
const inFlightGets = new Map();

function cacheKey(path, token) {
  return `${token || 'anon'}:${path}`;
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const token = localStorage.getItem('ww_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const shouldCache = method === 'GET' && options.cache !== false;
  const key = shouldCache ? cacheKey(path, token) : null;

  if (shouldCache) {
    const cached = getCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < (options.cacheTtl ?? DEFAULT_CACHE_TTL_MS)) {
      return cached.data;
    }
    if (inFlightGets.has(key)) return inFlightGets.get(key);
  }

  const run = (async () => {
    const fetchOpts = { ...options, method, headers };
    delete fetchOpts.cache;
    delete fetchOpts.cacheTtl;
    const res = await fetch(`${API}${path}`, fetchOpts);
    if (res.status === 401) {
      localStorage.removeItem('ww_token');
      localStorage.removeItem('ww_user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (shouldCache) getCache.set(key, { data, fetchedAt: Date.now() });
    else if (method !== 'GET') getCache.clear();
    return data;
  })();

  if (shouldCache) {
    inFlightGets.set(key, run);
    run.finally(() => inFlightGets.delete(key));
  }

  return run;
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (path) => request(path, { method: 'DELETE' }),
  clearCache: () => getCache.clear(),
};
