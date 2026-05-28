/* ===================================================
   comment-box — script.js
   Handles: theme, language tabs, editor, API calls
=================================================== */

// Elements are queried lazily inside setup functions so pages without them won't blow up

let currentLang = 'java';
let toastTimer;
let hasOwnApiKey = false;
const generateLimit = 10;

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cb-theme', theme);
}

function getStoredTheme() {
  return localStorage.getItem('cb-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function showToast(message, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  clearTimeout(toastTimer);
  t.textContent = message;
  t.classList.toggle('error', !!isError);
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }
  return { message: text || response.statusText };
}

function renderLineNumbers(textarea, container) {
  const count = textarea.value ? textarea.value.split('\n').length : 1;
  container.innerHTML = Array.from({ length: count }, (_, i) => `<span>${i + 1}</span>`).join('');
}

function renderOutLineNumbers(text, container) {
  if (!text) {
    container.innerHTML = '';
    return;
  }
  const count = text.split('\n').length;
  container.innerHTML = Array.from({ length: count }, (_, i) => `<span>${i + 1}</span>`).join('');
}

function stripCodeFences(text) {
  return text
    .replace(/^```[\w]*\n?/m, '')
    .replace(/```$/m, '')
    .trim();
}

function updateDropdownDescriptions(style, density) {
  const styleMap = {
    inline: 'Short comments on the same line as code',
    block: 'Multi-line comments above each function',
    jsdoc: 'Formal /** */ doc comments for each method'
  };
  const densityMap = {
    normal: 'Balanced coverage of key logic',
    verbose: 'Every line explained in detail',
    minimal: 'Only complex sections annotated'
  };
  const styleEl = document.getElementById('styleDescription');
  const densityEl = document.getElementById('densityDescription');
  if (styleEl) styleEl.textContent = styleMap[style] || '';
  if (densityEl) densityEl.textContent = densityMap[density] || '';
}

function isValidOpenRouterKey(key) {
  return /^(sk|or)-[A-Za-z0-9]{10,}$/i.test(key);
}

function getStoredUsageCount() {
  return Number(localStorage.getItem('cb-usage-count') || 0);
}

function setStoredUsageCount(count) {
  localStorage.setItem('cb-usage-count', String(count));
}

function updateUsageStatus(hasKey = false) {
  const status = document.getElementById('usageStatus');
  if (!status) return;
  if (hasKey) {
    status.hidden = true;
    return;
  }
  const count = getStoredUsageCount();
  status.textContent = `${count} / ${generateLimit} generates used today`;
  status.hidden = false;
}

function incrementUsageCount() {
  if (hasOwnApiKey) return;
  const next = Math.min(generateLimit, getStoredUsageCount() + 1);
  setStoredUsageCount(next);
  updateUsageStatus(false);
}

function toggleSettingsPopover(open) {
  const popover = document.getElementById('settingsPopover');
  const toggle = document.getElementById('settingsToggle');
  if (!popover || !toggle) return;
  const isOpen = open === undefined ? !popover.classList.contains('visible') : open;
  popover.classList.toggle('visible', isOpen);
  toggle.setAttribute('aria-expanded', String(isOpen));
}

function closeSettingsPopover() {
  toggleSettingsPopover(false);
}

function renderKeyState(data, options = {}) {
  const wrap = document.querySelector('.apikey-field-wrap');
  if (!wrap) return;
  hasOwnApiKey = !!(data && data.hasKey);
  updateUsageStatus(hasOwnApiKey);
  wrap.innerHTML = '';

  if (data && data.hasKey) {
    const badge = document.createElement('div');
    badge.className = 'key-badge';
    badge.textContent = data.keyHint || '••••';
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-ghost';
    removeBtn.textContent = 'Remove';
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', deleteKey);
    wrap.appendChild(badge);
    if (options.message) {
      const feedback = document.createElement('div');
      feedback.className = 'apikey-feedback success';
      feedback.innerHTML = `<span class="feedback-dot"></span>${options.message}`;
      wrap.appendChild(feedback);
    }
    wrap.appendChild(removeBtn);
    return;
  }

  const group = document.createElement('div');
  group.className = 'password-group';

  const input = document.createElement('input');
  input.type = 'password';
  input.id = 'apiKeyInput';
  input.className = 'apikey-input';
  input.placeholder = 'sk-or-v1-••••••••';
  input.autocomplete = 'off';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'password-toggle';
  toggle.textContent = 'Show';
  toggle.addEventListener('click', () => {
    if (input.type === 'password') {
      input.type = 'text';
      toggle.textContent = 'Hide';
    } else {
      input.type = 'password';
      toggle.textContent = 'Show';
    }
  });

  group.appendChild(input);
  group.appendChild(toggle);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-primary';
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', saveKey);

  const feedback = document.createElement('div');
  feedback.className = 'apikey-feedback';
  feedback.id = 'apiKeyFeedback';
  if (options.message) {
    feedback.classList.add(options.type === 'success' ? 'success' : 'error');
    feedback.innerHTML = `<span class="feedback-dot"></span>${options.message}`;
  }

  wrap.appendChild(group);
  wrap.appendChild(saveBtn);
  wrap.appendChild(feedback);
}

function setApiKeyFeedback(message, type = 'error') {
  const feedback = document.getElementById('apiKeyFeedback');
  if (!feedback) return;
  feedback.className = `apikey-feedback ${type}`;
  feedback.innerHTML = `<span class="feedback-dot"></span>${message}`;
}

async function saveKey() {
  const input = document.getElementById('apiKeyInput');
  if (!input) return;
  const key = input.value.trim();
  if (!key) {
    setApiKeyFeedback('Enter an API key first', 'error');
    return;
  }
  if (!isValidOpenRouterKey(key)) {
    setApiKeyFeedback('Key format looks invalid', 'error');
    return;
  }
  try {
    const res = await authFetch('/api/v1/keys', {
      method: 'POST',
      body: JSON.stringify({ provider: 'openrouter', apiKey: key })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Save failed');
    renderKeyState(data, { message: 'Key saved', type: 'success' });
    showToast('API key saved');
  } catch (err) {
    setApiKeyFeedback(err.message || 'Failed to save key', 'error');
    showToast(err.message || 'Failed to save key', true);
  }
}

async function deleteKey() {
  try {
    const res = await authFetch('/api/v1/keys/openrouter', { method: 'DELETE' });
    if (res.status === 204) {
      renderKeyState({ hasKey: false, provider: 'openrouter' });
      showToast('API key removed');
      return;
    }
    const data = await res.json();
    throw new Error(data.message || 'Delete failed');
  } catch (err) {
    showToast(err.message || 'Failed to delete key', true);
  }
}

function buildPrompt(lang, code, style, density) {
  const styleHint = {
    inline: 'Use concise inline comments (// for Java/C++, # for Python) placed beside or above each line.',
    block: 'Use descriptive block comments above each logical section or function.',
    jsdoc: 'Use Javadoc/JSDoc-style comments for classes and methods, plus brief inline comments elsewhere.'
  }[style];

  const densityHint = {
    normal: 'Comment every meaningful block and non-obvious line.',
    verbose: 'Comment every single line, including trivial ones, with thorough explanations.',
    minimal: 'Comment only the complex or non-obvious parts — skip the obvious.'
  }[density];

  return `You are an expert ${lang} developer and technical writer.\n\n`
    + `Your task: add helpful comments to the following ${lang} code.\n\n`
    + `Comment style: ${styleHint}\n`
    + `Comment density: ${densityHint}\n\n`
    + `Rules:\n`
    + `- Return ONLY the commented code, nothing else.\n`
    + `- Do not change the logic, structure, or formatting of the original code.\n`
    + `- Do not add markdown fences or any explanation outside the code.\n`
    + `- Keep comments concise, accurate, and developer-focused.\n\n`
    + "Code to comment:\n```" + lang + "\n"
    + code + "\n```";
}

function setLoading(on, elements) {
  if (!elements.generateBtn) return;
  const progress = document.getElementById('genProgress');
  const bar = document.getElementById('genProgressBar');
  if (on) {
    elements.generateBtn.disabled = true;
    elements.generateInner?.classList.add('hidden');
    elements.generateSpinner?.classList.add('visible');
    elements.paneOutput?.classList.add('loading');
    if (progress && bar) {
      progress.hidden = false;
      bar.style.transition = 'none';
      bar.style.width = '0%';
      setTimeout(() => {
        bar.style.transition = 'width 10s cubic-bezier(0.1, 0.5, 0.2, 1)';
        bar.style.width = '90%';
      }, 50);
    }
  } else {
    elements.generateBtn.disabled = false;
    elements.generateInner?.classList.remove('hidden');
    elements.generateSpinner?.classList.remove('visible');
    elements.paneOutput?.classList.remove('loading');
    if (progress && bar) {
      bar.style.transition = 'width 0.2s ease-out';
      bar.style.width = '100%';
      setTimeout(() => { progress.hidden = true; bar.style.width = '0%'; }, 400);
    }
  }
}

function showUpgradeModal() {
  const modal = document.getElementById('upgradeModal');
  if (!modal) return;
  modal.style.display = 'flex';
}

function closeUpgradeModal() {
  const modal = document.getElementById('upgradeModal');
  if (!modal) return;
  modal.style.display = 'none';
}

function focusApiKey() {
  closeUpgradeModal();
  toggleSettingsPopover(true);
  const input = document.querySelector('.apikey-input');
  if (input) {
    input.focus();
    return;
  }
  fetchKeyInfo().then(info => {
    if (!info || !info.hasKey) renderKeyState({ hasKey: false });
    const nextInput = document.querySelector('.apikey-input');
    if (nextInput) nextInput.focus();
  });
}

async function fetchKeyInfo() {
  try {
    const res = await authFetch('/api/v1/keys/openrouter');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function generateComments(config) {
  const {
    codeInput, commentStyle, density, generateBtn, generateInner,
    generateSpinner, paneOutput, emptyState, outputPre,
    outLineNumbers, outCharCount, copyBtn, downloadBtn, shareBtn
  } = config;

  const code = codeInput.value.trim();
  if (!code) { showToast('Please paste some code first', true); return; }

  setLoading(true, { generateBtn, generateInner, generateSpinner, paneOutput });
  if (emptyState) emptyState.hidden = true;
  if (outputPre) outputPre.hidden = true;
  outputPre.textContent = '';
  outLineNumbers.innerHTML = '';
  outCharCount.textContent = '';

  const payload = {
    language: currentLang,
    style: commentStyle.value,
    density: density.value,
    code
  };

  try {
    const res = await authFetch('/api/v1/comments/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.status === 429) {
      setStoredUsageCount(generateLimit);
      updateUsageStatus(false);
      showUpgradeModal();
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API error');

    const output = stripCodeFences(data.outputCode || '');
    outputPre.textContent = output;
    outputPre.hidden = false;
    renderOutLineNumbers(output, outLineNumbers);

    const lines = output.split('\n').length;
    outCharCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
    if (copyBtn) copyBtn.disabled = false;
    if (downloadBtn) downloadBtn.disabled = false;
    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.hidden = false;
    }
    window.lastHistoryId = data.historyId;
    incrementUsageCount();
    showToast('Comments generated ✓');

    // Google Analytics: track successful generation event
    if (typeof gtag === 'function') {
      gtag('event', 'generate_comments', {
        language: currentLang,
        style: payload.style,
        density: payload.density
      });
    }
  } catch (err) {
    showToast(err.message || 'Something went wrong', true);
    console.error('[CommentBox]', err);
  } finally {
    setLoading(false, { generateBtn, generateInner, generateSpinner, paneOutput });
  }
}

async function shareLatest() {
  try {
    const id = window.lastHistoryId;
    if (!id) { showToast('No history id available', true); return; }
    const res = await authFetch(`/api/v1/history/${id}/share`, { method: 'POST' });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.message || 'Share failed');
    }
    const payload = await res.json();
    await navigator.clipboard.writeText(payload.shareUrl);
    showToast('Link copied!');
  } catch (err) {
    showToast(err.message || 'Share failed', true);
    console.error(err);
  }
}

function restoreFromHistory(config) {
  if (!config) return false;
  try {
    const raw = sessionStorage.getItem('cb-restore');
    if (!raw) return false;
    const obj = JSON.parse(raw);
    if (!obj) return false;

    if (obj.inputCode) {
      config.codeInput.value = obj.inputCode;
      config.codeInput.dispatchEvent(new Event('input'));
    }
    if (obj.language) {
      const languageSelect = document.getElementById('languageSelect');
      if (languageSelect) {
        languageSelect.value = obj.language;
        currentLang = obj.language;
      }
    }
    if (obj.style) config.commentStyle.value = obj.style;
    if (obj.density) config.density.value = obj.density;
    if (obj.outputCode) {
      config.outputPre.textContent = obj.outputCode;
      config.outputPre.hidden = false;
      renderOutLineNumbers(obj.outputCode, config.outLineNumbers);
      const lines = obj.outputCode.split('\n').length;
      config.outLineCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
      if (config.copyBtn) config.copyBtn.disabled = false;
      if (config.downloadBtn) config.downloadBtn.disabled = false;
      if (config.shareBtn) {
        config.shareBtn.disabled = false;
        config.shareBtn.hidden = false;
      }
      config.emptyState.hidden = true;
    }

    sessionStorage.removeItem('cb-restore');
    showToast('Restored from history');
    return true;
  } catch (err) {
    console.error('restoreFromHistory', err);
    return false;
  }
}

function setupAuth() {
  Array.from(document.querySelectorAll('.password-toggle')).forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.password-group');
      if (!group) return;
      const input = group.querySelector('input[type="password"], input[type="text"]');
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? 'Show' : 'Hide';
    });
  });

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value || '';
      const password = document.getElementById('loginPassword')?.value || '';
      const errPanel = document.getElementById('loginError');
      try {
        const res = await authFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        const data = await parseJsonResponse(res);
        if (!res.ok) throw new Error(data.message || `Login failed (${res.status})`);
        localStorage.setItem('cb-token', data.token);
        window.location.href = '/index.html';
      } catch (err) {
        if (errPanel) { errPanel.hidden = false; errPanel.textContent = err.message || 'Login failed'; }
        showToast(err.message || 'Login failed', true);
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('registerEmail')?.value || '';
      const password = document.getElementById('registerPassword')?.value || '';
      const confirm = document.getElementById('confirmPassword')?.value || '';
      const errPanel = document.getElementById('registerError');
      if (password !== confirm) {
        if (errPanel) { errPanel.hidden = false; errPanel.textContent = 'Passwords do not match'; }
        return showToast('Passwords do not match', true);
      }
      try {
        const res = await authFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
        const data = await parseJsonResponse(res);
        if (!res.ok) throw new Error(data.message || `Register failed (${res.status})`);
        localStorage.setItem('cb-token', data.token);
        window.location.href = '/index.html';
      } catch (err) {
        if (errPanel) { errPanel.hidden = false; errPanel.textContent = err.message || 'Register failed'; }
        showToast(err.message || 'Register failed', true);
      }
    });
  }
}

async function setupEditor() {
  const codeInputEl = document.getElementById('codeInput');
  const outputPreEl = document.getElementById('outputPre');
  const generateBtnEl = document.getElementById('generateBtn');
  const generateSpinnerEl = document.getElementById('generateSpinner');
  const generateInnerEl = document.querySelector('.generate-btn-inner');
  const paneOutputEl = document.querySelector('.pane-output');
  const lineNumbersEl = document.getElementById('lineNumbers');
  const outLineNumbersEl = document.getElementById('outLineNumbers');
  const charCountEl = document.getElementById('charCount');
  const outCharCountEl = document.getElementById('outCharCount');
  const emptyStateEl = document.getElementById('emptyState');
  const copyBtnEl = document.getElementById('copyBtn');
  const downloadBtnEl = document.getElementById('downloadBtn');
  const shareBtnEl = document.getElementById('shareBtn');
  const pasteBtnEl = document.getElementById('pasteBtn');
  const clearBtnEl = document.getElementById('clearBtn');
  const languageSelectEl = document.getElementById('languageSelect');
  const usageStatusEl = document.getElementById('usageStatus');
  const settingsToggleEl = document.getElementById('settingsToggle');
  const settingsPopoverEl = document.getElementById('settingsPopover');
  const settingsCloseBtnEl = document.getElementById('settingsCloseBtn');
  const commentStyleEl = document.getElementById('commentStyle');
  const densityEl = document.getElementById('density');
  const styleDescEl = document.getElementById('styleDescription');
  const densityDescEl = document.getElementById('densityDescription');

  if (!codeInputEl || !outputPreEl || !generateBtnEl || !lineNumbersEl || !commentStyleEl || !densityEl || !languageSelectEl) {
    return;
  }

  renderLineNumbers(codeInputEl, lineNumbersEl);

  codeInputEl.addEventListener('input', () => {
    renderLineNumbers(codeInputEl, lineNumbersEl);
    if (!codeInputEl.value.trim()) {
      charCountEl.hidden = true;
    } else {
      charCountEl.hidden = false;
      const lines = codeInputEl.value.split('\n').length;
      charCountEl.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
    }
  });

  // Resizer Logic
  const editorGrid = document.getElementById('editorGrid');
  const divider = document.getElementById('editorDivider');
  let isResizing = false;

  divider?.addEventListener('mousedown', (e) => {
    if (window.innerWidth <= 768) return;
    e.preventDefault();
    isResizing = true;
    divider.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing || !editorGrid) return;
    const containerRect = editorGrid.getBoundingClientRect();
    const pointerRelativeX = e.clientX - containerRect.left;
    const minWidth = 280;
    const maxWidth = editorGrid.clientWidth - minWidth;
    const newBasis = Math.max(minWidth, Math.min(pointerRelativeX, maxWidth));
    editorGrid.style.gridTemplateColumns = `${newBasis}px auto 1fr`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      divider?.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  codeInputEl.addEventListener('scroll', () => {
    // Sync line-number gutter scroll with the textarea scroll
    lineNumbersEl.scrollTop = codeInputEl.scrollTop;
  });

  const outputDisplayEl = document.getElementById('outputDisplay');
  outputDisplayEl?.addEventListener('scroll', () => {
    // Sync output line-number gutter with output display scroll
    outLineNumbersEl.scrollTop = outputDisplayEl.scrollTop;
  });

  pasteBtnEl?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      codeInputEl.value = text;
      codeInputEl.dispatchEvent(new Event('input'));
      showToast('Pasted from clipboard');
    } catch {
      showToast('Paste not allowed — use Ctrl+V', true);
    }
  });

  document.getElementById('tryExampleBtn')?.addEventListener('click', () => {
    const sample = `public class Example {
  public static int add(int a, int b) {
    return a + b;
  }
}`;
    codeInputEl.value = sample;
    codeInputEl.dispatchEvent(new Event('input'));
    showToast('Sample code loaded');
  });

  clearBtnEl?.addEventListener('click', () => {
    codeInputEl.value = '';
    codeInputEl.dispatchEvent(new Event('input'));
    if (emptyStateEl) emptyStateEl.hidden = false;
    if (outputPreEl) outputPreEl.hidden = true;
    outputPreEl.textContent = '';
    outLineNumbersEl.innerHTML = '';
    outCharCountEl.textContent = '';
    if (copyBtnEl) copyBtnEl.disabled = true;
    if (downloadBtnEl) downloadBtnEl.disabled = true;
    if (shareBtnEl) {
      shareBtnEl.disabled = true;
      shareBtnEl.hidden = true;
    }
  });

  languageSelectEl.value = currentLang;
  languageSelectEl.addEventListener('change', () => {
    currentLang = languageSelectEl.value;
  });

  updateDropdownDescriptions(commentStyleEl.value, densityEl.value);
  commentStyleEl.addEventListener('change', () => updateDropdownDescriptions(commentStyleEl.value, densityEl.value));
  densityEl.addEventListener('change', () => updateDropdownDescriptions(commentStyleEl.value, densityEl.value));

  updateUsageStatus(hasOwnApiKey);
  settingsToggleEl?.addEventListener('click', () => toggleSettingsPopover());
  settingsCloseBtnEl?.addEventListener('click', () => closeSettingsPopover());
  document.addEventListener('click', (event) => {
    const popover = settingsPopoverEl;
    const toggle = settingsToggleEl;
    if (!popover || !toggle) return;
    if (!popover.classList.contains('visible')) return;
    if (popover.contains(event.target) || toggle.contains(event.target)) return;
    closeSettingsPopover();
  });

  generateBtnEl.addEventListener('click', () => generateComments({
    codeInput: codeInputEl,
    commentStyle: commentStyleEl,
    density: densityEl,
    generateBtn: generateBtnEl,
    generateInner: generateInnerEl,
    generateSpinner: generateSpinnerEl,
    paneOutput: paneOutputEl,
    emptyState: emptyStateEl,
    outputPre: outputPreEl,
    outLineNumbers: outLineNumbersEl,
    outCharCount: outCharCountEl,
    copyBtn: copyBtnEl,
    downloadBtn: downloadBtnEl,
    shareBtn: shareBtnEl
  }));

  copyBtnEl?.addEventListener('click', async () => {
    const text = outputPreEl.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard');
    } catch {
      showToast('Copy failed', true);
    }
  });

  downloadBtnEl?.addEventListener('click', () => {
    const text = outputPreEl.textContent;
    if (!text) return;
    const ext = { java: 'java', python: 'py', cpp: 'cpp' };
    const filename = `commented.${ext[currentLang] || 'txt'}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  });

  shareBtnEl?.addEventListener('click', shareLatest);

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      generateBtnEl.click();
    }
  });

  document.getElementById('focusApiKeyBtn')?.addEventListener('click', focusApiKey);
  document.getElementById('closeUpgradeBtn')?.addEventListener('click', closeUpgradeModal);
  document.getElementById('closeUpgradeBtnFallback')?.addEventListener('click', closeUpgradeModal);

  restoreFromHistory({
    codeInput: codeInputEl,
    commentStyle: commentStyleEl,
    density: densityEl,
    outputPre: outputPreEl,
    outLineNumbers: outLineNumbersEl,
    outLineCount: outCharCountEl,
    copyBtn: copyBtnEl,
    downloadBtn: downloadBtnEl,
    shareBtn: shareBtnEl,
    emptyState: emptyStateEl
  });

  // Usage fetch removed
}

function setupGlobal() {
  applyTheme(getStoredTheme());

  const themeToggle = document.getElementById('themeToggle');
  const navToggle = document.getElementById('navToggle');
  const logoutBtn = document.getElementById('logoutBtn');

  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  navToggle?.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('open');
  });

  logoutBtn?.addEventListener('click', () => {
    try { localStorage.removeItem('cb-token'); } catch (e) {}
    window.location.href = '/login.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupGlobal();
  setupEditor();
  setupAuth();
  fetchKeyInfo().then(info => { renderKeyState(info || { hasKey: false }); });
});
