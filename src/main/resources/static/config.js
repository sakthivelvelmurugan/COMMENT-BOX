(function(){
  // API_BASE_URL injected at build time by hosting platform (Vercel) or defaults to localhost
  try {
    // Default to empty so relative URLs work in production if no injection is provided
    window.API_BASE_URL = (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) ? API_BASE_URL : '';
  } catch (e) {
    window.API_BASE_URL = '';
  }
})();
