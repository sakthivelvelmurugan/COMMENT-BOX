(function () {
  try {
    window.API_BASE_URL = (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) ? API_BASE_URL : '';
  } catch (e) {
    window.API_BASE_URL = '';
  }
})();

const themeToggle     = document.getElementById('themeToggle');
const settingsToggle  = document.getElementById('settingsToggle');
const settingsPanel   = document.getElementById('settingsPanel');
const settingsClose   = document.getElementById('settingsClose');
const saveKeyBtn      = document.getElementById('saveKeyBtn');
const removeKeyBtn    = document.getElementById('removeKeyBtn');
const toggleKeyBtn    = document.getElementById('toggleKeyBtn');
const apiKeyInput     = document.getElementById('apiKeyInput');
const keyStatus       = document.getElementById('keyStatus');
const statusBadge     = document.getElementById('statusBadge');
const keyFeedback     = document.getElementById('keyFeedback');
const generateBtn     = document.getElementById('generateBtn');
const pasteBtn        = document.getElementById('pasteBtn');
const clearBtn        = document.getElementById('clearBtn');
const copyBtn         = document.getElementById('copyBtn');
const downloadBtn     = document.getElementById('downloadBtn');
const progressRow     = document.getElementById('progressRow');
const progressFill    = document.getElementById('progressFill');
const codeInput       = document.getElementById('codeInput');
const outputPre       = document.getElementById('outputPre');
const emptyState      = document.getElementById('emptyState');
const inputLines      = document.getElementById('inputLines');
const outputLines     = document.getElementById('outputLines');
const languageSelect  = document.getElementById('languageSelect');
const commentStyle    = document.getElementById('commentStyle');
const densitySelect   = document.getElementById('density');

let currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
let isGenerating = false;

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cb-theme', theme);
  currentTheme = theme;
}

// ── API key storage ───────────────────────────────────────────────────────────
function getStoredApiKey()      { return localStorage.getItem('cb-openrouter-key') || ''; }
function setStoredApiKey(v)     { localStorage.setItem('cb-openrouter-key', v); }
function removeStoredApiKey()   { localStorage.removeItem('cb-openrouter-key'); }

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = isError ? 'toast show error' : 'toast show';
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── Key status UI ─────────────────────────────────────────────────────────────
function updateKeyStatus() {
  const active = Boolean(getStoredApiKey());
  if (keyStatus)    keyStatus.textContent = active ? 'Saved' : 'Not set';
  if (statusBadge)  {
    statusBadge.textContent = active ? 'Saved locally' : 'No key';
    statusBadge.style.backgroundColor = active ? 'rgba(34,197,94,0.12)' : 'rgba(222,126,94,0.12)';
    statusBadge.style.color = active ? '#166534' : '#b91c1c';
  }
}

function isValidOpenRouterKey(key) {
  return /^(sk(-or)?(-v\d+)?|or(-v\d+)?)-[A-Za-z0-9-]{8,}$/i.test(key);
}

// ── Settings panel ────────────────────────────────────────────────────────────
function toggleSettings(show) {
  const isOpen = show === undefined ? !settingsPanel.classList.contains('open') : show;
  settingsPanel.classList.toggle('open', isOpen);
  settingsPanel.setAttribute('aria-hidden', String(!isOpen));
  if (isOpen) { apiKeyInput.value = getStoredApiKey(); keyFeedback.textContent = ''; }
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function showProgress() {
  progressRow.style.display = 'grid';
  progressFill.style.transition = 'none';
  progressFill.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    progressFill.style.transition = 'width 1.4s ease';
    progressFill.style.width = '65%';
  }));
}

function hideProgress() {
  progressFill.style.transition = 'width 0.25s ease';
  progressFill.style.width = '100%';
  setTimeout(() => {
    progressRow.style.display = 'none';
    progressFill.style.transition = 'none';
    progressFill.style.width = '0%';
  }, 300);
}

// ── Loading state ─────────────────────────────────────────────────────────────
function setLoading(on) {
  isGenerating = on;
  generateBtn.disabled = on;
  copyBtn.disabled = on || !outputPre.textContent.trim();
  downloadBtn.disabled = on || !outputPre.textContent.trim();
  if (on) showProgress(); else hideProgress();
}

// ── Line counters ─────────────────────────────────────────────────────────────
function updateInputLines() {
  const count = codeInput.value ? codeInput.value.trimEnd().split('\n').length : 0;
  inputLines.textContent = `${count} line${count === 1 ? '' : 's'}`;
}

function updateOutputLines() {
  const text = outputPre.textContent.trim();
  if (!text) { outputLines.textContent = 'Ready'; return; }
  const lines = text.split('\n').length;
  outputLines.textContent = `${lines} line${lines === 1 ? '' : 's'}`;
}

// ── Output helpers ────────────────────────────────────────────────────────────
function clearOutput() {
  outputPre.textContent = '';
  outputPre.hidden = true;
  emptyState.hidden = false;
  outputLines.textContent = 'Ready';
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
}

function updateControlsAfterOutput() {
  const has = Boolean(outputPre.textContent.trim());
  copyBtn.disabled = !has;
  downloadBtn.disabled = !has;
}

// ── API key save / remove ─────────────────────────────────────────────────────
async function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) { keyFeedback.textContent = 'Enter an API key first.'; keyFeedback.className = 'feedback-text error'; return; }
  if (!isValidOpenRouterKey(key)) { keyFeedback.textContent = 'Key format looks invalid.'; keyFeedback.className = 'feedback-text error'; return; }
  setStoredApiKey(key);
  keyFeedback.textContent = 'API key saved locally.';
  keyFeedback.className = 'feedback-text success';
  updateKeyStatus();
  showToast('API key saved locally');
}

function removeApiKey() {
  removeStoredApiKey();
  apiKeyInput.value = '';
  keyFeedback.textContent = 'API key removed.';
  keyFeedback.className = 'feedback-text success';
  updateKeyStatus();
  showToast('API key removed');
}

function toggleApiKeyVisibility() {
  apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  toggleKeyBtn.textContent = apiKeyInput.type === 'password' ? 'Show' : 'Hide';
}

// ── Generate ──────────────────────────────────────────────────────────────────
async function generateComments() {
  if (isGenerating) return;
  const code = codeInput.value.trim();
  if (!code) { showToast('Paste some code first.', true); return; }

  setLoading(true);
  emptyState.hidden = true;
  outputPre.hidden = true;
  outputPre.textContent = '';
  updateOutputLines();

  const payload = {
    language: languageSelect.value,
    style: commentStyle.value,
    density: densitySelect.value,
    code,
    apiKey: getStoredApiKey() || undefined
  };

  try {
    const response = await fetch(`${window.API_BASE_URL}/api/v1/comments/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(async () => {
      const text = await response.text().catch(() => '');
      return { message: text || response.statusText || 'Server error' };
    });

    if (!response.ok) throw new Error(data.message || data.error || `Generation failed (${response.status})`);

    const output = (data.outputCode || data.output || '')
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/```$/i, '')
      .trim();

    if (!output) throw new Error('No output returned from the API.');

    outputPre.textContent = output;
    outputPre.hidden = false;
    updateOutputLines();
    updateControlsAfterOutput();
    showToast('Comments generated successfully.');
  } catch (error) {
    showToast(error.message || 'Unable to generate comments.', true);
    outputPre.hidden = true;
    emptyState.hidden = false;
  } finally {
    setLoading(false);
  }
}

// ── Clipboard / download ──────────────────────────────────────────────────────
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) { codeInput.value = text; updateInputLines(); showToast('Pasted from clipboard'); }
    else showToast('Clipboard is empty.', true);
  } catch { showToast('Clipboard access denied.', true); }
}

function downloadOutput() {
  const text = outputPre.textContent.trim();
  if (!text) return;
  const ext = { java: 'java', python: 'py', cpp: 'cpp', other: 'txt' }[languageSelect.value] || 'txt';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `commented.${ext}` });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  showToast('Downloaded commented code');
}

async function copyOutput() {
  const text = outputPre.textContent.trim();
  if (!text) return;
  try { await navigator.clipboard.writeText(text); showToast('Copied to clipboard'); }
  catch { showToast('Copy failed.', true); }
}

// ── Event binding ─────────────────────────────────────────────────────────────
function bindEvents() {
  themeToggle.addEventListener('click', () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark'));
  settingsToggle.addEventListener('click', () => toggleSettings());
  settingsClose.addEventListener('click', () => toggleSettings(false));
  saveKeyBtn.addEventListener('click', saveApiKey);
  removeKeyBtn.addEventListener('click', removeApiKey);
  toggleKeyBtn.addEventListener('click', toggleApiKeyVisibility);
  generateBtn.addEventListener('click', generateComments);
  pasteBtn.addEventListener('click', pasteFromClipboard);
  clearBtn.addEventListener('click', () => { codeInput.value = ''; updateInputLines(); clearOutput(); });
  copyBtn.addEventListener('click', copyOutput);
  downloadBtn.addEventListener('click', downloadOutput);
  codeInput.addEventListener('input', updateInputLines);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); generateComments(); }
    if (e.key === 'Escape' && settingsPanel.classList.contains('open')) toggleSettings(false);
  });

  document.addEventListener('click', (e) => {
    if (settingsPanel.classList.contains('open') &&
        !settingsPanel.contains(e.target) &&
        !settingsToggle.contains(e.target)) toggleSettings(false);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initialize() {
  const saved = localStorage.getItem('cb-theme');
  if (saved) applyTheme(saved);
  updateKeyStatus();
  updateInputLines();
  updateControlsAfterOutput();
  bindEvents();
}

document.addEventListener('DOMContentLoaded', initialize);
