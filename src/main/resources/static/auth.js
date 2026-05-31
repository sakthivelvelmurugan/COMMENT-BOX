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
  return Boolean(getToken());
}

function logout() {
  localStorage.removeItem('cb-token');
  window.location.href = '/index.html';
}

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = options.headers ? new Headers(options.headers) : new Headers();
  if (token) headers.set('Authorization', 'Bearer ' + token);
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const base = (window.API_BASE_URL && window.API_BASE_URL.length) ? window.API_BASE_URL : '';
  const full = url.startsWith('http') ? url : `${base}${url}`;
  const res = await fetch(full, { ...options, headers });
  if (res.status === 401) throw new AuthError('Unauthorized');
  return res;
}

// No redirect checks needed as authentication is bypassed
(() => {
  // Theme state setup can go here or let global handle it
})();

window.authFetch = authFetch;
window.getToken = getToken;
window.isLoggedIn = isLoggedIn;
window.logout = logout;
window.AuthError = AuthError;
