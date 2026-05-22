(function(){
  // API_BASE_URL injected at build time by hosting platform (Vercel) or defaults to localhost
  try {
    window.API_BASE_URL = (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) ? API_BASE_URL : 'http://localhost:8080';
  } catch (e) {
    window.API_BASE_URL = 'http://localhost:8080';
  }
})();
