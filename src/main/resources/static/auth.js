class AuthError extends Error {}

function getToken() {
  return localStorage.getItem('cb-token');
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(payload)));
  } catch {
    return null;
  }
}

function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp > nowSec;
}

function logout() {
  localStorage.removeItem('cb-token');
  window.location.href = '/login.html';
}

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = options.headers ? new Headers(options.headers) : new Headers();
  if (token) headers.set('Authorization', 'Bearer ' + token);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const base = (window.API_BASE_URL && window.API_BASE_URL.length) ? window.API_BASE_URL : '';
  const full = url.startsWith('http') ? url : `${base}${url}`;
  const res = await fetch(full, { ...options, headers });
  if (res.status === 401) throw new AuthError('Unauthorized');
  return res;
}

// On every page load, check auth for protected pages
(() => {
  const path = window.location.pathname || '';
  const publicPaths = ['/login.html', '/register.html', '/share.html', '/docs.html', '/auth.js', '/style.css', '/script.js', '/config.js', '/'];
  if (path.startsWith('/s/')) return;
  if (!publicPaths.includes(path) && !isLoggedIn()) {
    window.location.href = '/login.html';
  }
})();

window.authFetch = authFetch;
window.getToken = getToken;
window.isLoggedIn = isLoggedIn;
window.logout = logout;
window.AuthError = AuthError;
