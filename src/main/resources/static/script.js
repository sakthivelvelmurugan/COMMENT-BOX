/* ===================================================
   comment-box — script.js
   Handles: theme, language tabs, editor, API calls
=================================================== */

/* ── DOM refs ── */
const themeToggle    = document.getElementById('themeToggle');
const codeInput      = document.getElementById('codeInput');
const lineNumbers    = document.getElementById('lineNumbers');
const outLineNumbers = document.getElementById('outLineNumbers');
const charCount      = document.getElementById('charCount');
const outCharCount   = document.getElementById('outCharCount');
const generateBtn    = document.getElementById('generateBtn');
const generateSpinner= document.getElementById('generateSpinner');
const generateInner  = generateBtn.querySelector('.generate-btn-inner');
const outputDisplay  = document.getElementById('outputDisplay');
const outputPre      = document.getElementById('outputPre');
const emptyState     = document.getElementById('emptyState');
const copyBtn        = document.getElementById('copyBtn');
const downloadBtn    = document.getElementById('downloadBtn');
const shareBtn       = document.getElementById('shareBtn');
const pasteBtn       = document.getElementById('pasteBtn');
const clearBtn       = document.getElementById('clearBtn');
const apiKeyInput    = document.getElementById('apiKeyInput');
const toggleKey      = document.getElementById('toggleKey');
const keySaveIndicator = document.getElementById('keySaveIndicator');
const langTabs       = document.querySelectorAll('.lang-tab');
const commentStyle   = document.getElementById('commentStyle');
const density        = document.getElementById('density');
const toast          = document.getElementById('toast');
const paneOutput     = document.querySelector('.pane-output');

let currentLang = 'java';
let toastTimer;

/* ============================================================
   THEME
============================================================ */
function getStoredTheme() {
  return localStorage.getItem('cb-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cb-theme', theme);
}

applyTheme(getStoredTheme());

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   LANGUAGE TABS
============================================================ */
langTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    langTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    currentLang = tab.dataset.lang;
  });
});

/* ============================================================
   LINE NUMBERS
============================================================ */
function renderLineNumbers(textarea, container) {
  const lines = textarea.value ? textarea.value.split('\n').length : 1;
  let html = '';
  for (let i = 1; i <= lines; i++) html += `<span>${i}</span>`;
  container.innerHTML = html;
}

function renderOutLineNumbers(text) {
  if (!text) { outLineNumbers.innerHTML = ''; return; }
  const lines = text.split('\n').length;
  let html = '';
  for (let i = 1; i <= lines; i++) html += `<span>${i}</span>`;
  outLineNumbers.innerHTML = html;
}

codeInput.addEventListener('input', () => {
  renderLineNumbers(codeInput, lineNumbers);
  const lines = codeInput.value.split('\n').length;
  charCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
});

/* sync scroll between textarea and line numbers */
codeInput.addEventListener('scroll', () => {
  lineNumbers.style.transform = `translateY(-${codeInput.scrollTop}px)`;
});

renderLineNumbers(codeInput, lineNumbers);

/* ============================================================
   PASTE & CLEAR
============================================================ */
pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    codeInput.value = text;
    codeInput.dispatchEvent(new Event('input'));
    showToast('Pasted from clipboard');
  } catch {
    showToast('Paste not allowed — use Ctrl+V', true);
  }
});

clearBtn.addEventListener('click', () => {
  codeInput.value = '';
  codeInput.dispatchEvent(new Event('input'));
  charCount.textContent = '0 lines';
  clearOutput();
});

/* ============================================================
   API KEY MANAGEMENT (server-backed)
   - on load: GET /api/v1/keys/openrouter
   - save: POST /api/v1/keys
   - delete: DELETE /api/v1/keys/openrouter
============================================================ */

const apikeyRow = document.querySelector('.apikey-row');
const apikeyInner = document.querySelector('.apikey-inner');

async function fetchKeyInfo() {
  try {
    const res = await authFetch('/api/v1/keys/openrouter');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function saveKey() {
  const key = apiKeyInput.value.trim();
  if (!key) { showToast('Enter an API key first', true); return; }
  try {
    const res = await authFetch('/api/v1/keys', {
      method: 'POST',
      body: JSON.stringify({ provider: 'openrouter', apiKey: key })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Save failed');
    renderKeyState(data);
    showToast('API key saved');
  } catch (err) {
    showToast(err.message || 'Failed to save key', true);
  }
}

async function deleteKey() {
  try {
    const res = await authFetch('/api/v1/keys/openrouter', { method: 'DELETE' });
    if (res.status === 204) {
      renderKeyState({ hasKey: false, provider: 'openrouter' });
      showToast('API key removed');
    } else {
      const data = await res.json();
      throw new Error(data.message || 'Delete failed');
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete key', true);
  }
}

function renderKeyState(data) {
  const wrap = document.querySelector('.apikey-field-wrap');
  if (!wrap) return;
  // clear current contents
  wrap.innerHTML = '';
  if (data && data.hasKey) {
    const badge = document.createElement('div');
    badge.className = 'key-badge';
    badge.textContent = data.keyHint || '••••';
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-ghost';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', deleteKey);
    wrap.appendChild(badge);
    wrap.appendChild(removeBtn);
  } else {
    const input = document.createElement('input');
    input.type = 'password';
    input.id = 'apiKeyInput';
    input.className = 'apikey-input';
    input.placeholder = 'sk-or-v1-••••••••';
    input.autocomplete = 'off';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-primary';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', saveKey);
    wrap.appendChild(input);
    wrap.appendChild(saveBtn);
  }
}

// Initial load: query server for stored key
(async () => {
  const info = await fetchKeyInfo();
  if (info) renderKeyState(info);
})();

/* ============================================================
   PROMPT BUILDER
============================================================ */
const LANG_LABEL = { java: 'Java', python: 'Python', cpp: 'C++' };

const STYLE_INSTRUCTION = {
  inline:  'Use concise inline comments (// style for Java/C++, # for Python) placed on the same line or just above each statement.',
  block:   'Use descriptive block comments above each logical section or function.',
  jsdoc:   'Use Javadoc/JSDoc-style comments (/** ... */) for classes and methods, plus brief inline comments elsewhere.'
};

const DENSITY_INSTRUCTION = {
  normal:  'Comment every meaningful block and non-obvious line.',
  verbose: 'Comment every single line, including trivial ones, with thorough explanations.',
  minimal: 'Comment only the complex or non-obvious parts — skip the obvious.'
};

function buildPrompt(lang, code, style, den) {
  return `You are an expert ${LANG_LABEL[lang]} developer and technical writer.\n\n`
    + `Your task: add helpful comments to the following ${LANG_LABEL[lang]} code.\n\n`
    + `Comment style: ${STYLE_INSTRUCTION[style]}\n`
    + `Comment density: ${DENSITY_INSTRUCTION[den]}\n\n`
    + `Rules:\n`
    + `- Return ONLY the commented code, nothing else.\n`
    + `- Do not change the logic, structure, or formatting of the original code.\n`
    + `- Do not add markdown fences or any explanation outside the code.\n`
    + `- Keep comments concise, accurate, and developer-focused.\n\n`
    + `Code to comment:\n``` ${lang}\n`
    + `${code}\n````;
}

/* ============================================================
   GENERATE COMMENTS
============================================================ */
generateBtn.addEventListener('click', generateComments);

async function generateComments() {
  const code = codeInput.value.trim();
  if (!code) { showToast('Please paste some code first', true); return; }

  setLoading(true);
  clearOutput();

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
      // limit reached — show upgrade modal
      showUpgradeModal();
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'API error');
    }

    // remember latest history id for sharing
    try { window.lastHistoryId = data.historyId; } catch (e) {}

    displayOutput(data.outputCode || '');
    showToast('Comments generated ✓');

    // update usage bar after successful generate
    if (typeof renderUsageBar === 'function') {
      renderUsageBar({
        hasByok: !!data.byokActive,
        dailyLimit: 10,
        usedToday: (10 - (data.generatesRemaining >= 0 ? data.generatesRemaining : 0)),
        remaining: data.generatesRemaining
      });
    }

    // enable share button when output present
    try {
      if (shareBtn) { shareBtn.disabled = false; shareBtn.style.display = 'inline-flex'; }
    } catch (e) {}

  } catch (err) {
    showToast(err.message || 'Something went wrong', true);
    console.error('[CommentBox]', err);
  } finally {
    setLoading(false);
  }
}

async function shareLatest() {
  try {
    const id = window.lastHistoryId;
    if (!id) { showToast('No history id available', true); return; }
    const res = await authFetch(`/api/v1/history/${id}/share`, { method: 'POST' });
    if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Share failed'); }
    const payload = await res.json();
    const url = payload.shareUrl;
    await navigator.clipboard.writeText(url);
    showToast('Link copied!');
  } catch (e) { showToast(e.message || 'Share failed', true); }
}

if (shareBtn) shareBtn.addEventListener('click', shareLatest);

/* ── strip markdown code fences if model adds them ── */
function stripCodeFences(text) {
  return text
    .replace(/^```[\w]*\n?/m, '')
    .replace(/```$/m, '')
    .trim();
}

/* ============================================================
   OUTPUT DISPLAY
============================================================ */
function displayOutput(text) {
  emptyState.style.display = 'none';
  outputPre.style.display = 'block';
  outputPre.textContent = text;
  renderOutLineNumbers(text);

  const lines = text.split('\n').length;
  outCharCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;

  copyBtn.disabled = false;
  downloadBtn.disabled = false;
}

function clearOutput() {
  emptyState.style.display = '';
  outputPre.style.display = 'none';
  outputPre.textContent = '';
  outLineNumbers.innerHTML = '';
  outCharCount.textContent = '';
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
}

/* ============================================================
   COPY & DOWNLOAD
============================================================ */
copyBtn.addEventListener('click', async () => {
  const text = outputPre.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  } catch {
    showToast('Copy failed', true);
  }
});

downloadBtn.addEventListener('click', () => {
  const text = outputPre.textContent;
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

/* ============================================================
   LOADING STATE
============================================================ */
function setLoading(on) {
  if (on) {
    generateBtn.disabled = true;
    generateInner.classList.add('hidden');
    generateSpinner.classList.add('visible');
    paneOutput.classList.add('loading');
  } else {
    generateBtn.disabled = false;
    generateInner.classList.remove('hidden');
    generateSpinner.classList.remove('visible');
    paneOutput.classList.remove('loading');
  }
}

/* ============================================================
   TOAST
============================================================ */
function showToast(msg, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    generateComments();
  }
});

charCount.textContent = '0 lines';

// Restore editor from history if sessionStorage contains cb-restore
function restoreFromHistory() {
  try {
    const raw = sessionStorage.getItem('cb-restore');
    if (!raw) return false;
    const obj = JSON.parse(raw);
    if (!obj) return false;
    // populate code
    if (obj.inputCode) {
      codeInput.value = obj.inputCode;
      codeInput.dispatchEvent(new Event('input'));
    }
    // set language tab
    if (obj.language) {
      const tab = Array.from(document.querySelectorAll('.lang-tab')).find(t => t.dataset.lang === obj.language);
      if (tab) tab.click();
    }
    // set style and density
    if (obj.style) commentStyle.value = obj.style;
    if (obj.density) density.value = obj.density;
    // populate output
    if (obj.outputCode) {
      displayOutput(obj.outputCode);
    }
    sessionStorage.removeItem('cb-restore');
    showToast('Restored from history');
    return true;
  } catch (e) {
    console.error('restoreFromHistory', e);
    return false;
  }
}

// attempt restore on load
document.addEventListener('DOMContentLoaded', () => {
  restoreFromHistory();
  // load usage info
  (async ()=>{
    try {
      const r = await authFetch('/api/v1/usage');
      if (!r.ok) return;
      const d = await r.json();
      if (typeof renderUsageBar === 'function') renderUsageBar(d);
    } catch (e) { /* ignore */ }
  })();
});

function renderUsageBar(data) {
  const strip = document.getElementById('usageStrip');
  const fill = document.getElementById('usageBarFill');
  const label = document.getElementById('usageLabel');
  if (!strip || !fill || !label || !data) return;
  if (data.hasByok) {
    strip.style.display = 'none';
    return;
  }
  strip.style.display = 'flex';
  const dailyLimit = data.dailyLimit || 10;
  const used = data.usedToday || (dailyLimit - Math.max(0, data.remaining || 0));
  const pct = Math.min(100, Math.round((used / dailyLimit) * 100));
  fill.style.width = pct + '%';
  // color thresholds: amber at 7/10 (70%), red at 100%
  if (used >= dailyLimit) fill.style.background = '#ef4444';
  else if (used >= 7) fill.style.background = '#f59e0b';
  else fill.style.background = '#16a34a';
  label.textContent = `${used} / ${dailyLimit} free generates used today`;
}

function showUpgradeModal() {
  const m = document.getElementById('upgradeModal');
  if (!m) return;
  m.style.display = 'flex';
}

function closeUpgradeModal() {
  const m = document.getElementById('upgradeModal');
  if (!m) return;
  m.style.display = 'none';
}

function focusApiKey() {
  closeUpgradeModal();
  const input = document.querySelector('.apikey-input');
  if (input) {
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus();
  } else {
    // if input not present, render the key input by fetching state
    (async ()=>{ const info = await fetchKeyInfo(); if (!info || !info.hasKey) renderKeyState({hasKey:false}); const i = document.querySelector('.apikey-input'); if(i) { i.focus(); }})();
  }
}

document.getElementById('focusApiKeyBtn')?.addEventListener('click', focusApiKey);
document.getElementById('closeUpgradeBtn')?.addEventListener('click', closeUpgradeModal);
