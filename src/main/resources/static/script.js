/* ===================================================
   comment-box — script.js
   Handles: theme, language tabs, editor, API calls
=================================================== */

const toast = document.getElementById('toast');
const themeToggle = document.getElementById('themeToggle');
const navToggle = document.getElementById('navToggle');
const logoutBtn = document.getElementById('logoutBtn');

let currentLang = 'java';
let toastTimer;

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cb-theme', theme);
}

function getStoredTheme() {
  return localStorage.getItem('cb-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function showToast(message, isError = false) {
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
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
  if (on) {
    elements.generateBtn.disabled = true;
    elements.generateInner?.classList.add('hidden');
    elements.generateSpinner?.classList.add('visible');
    elements.paneOutput?.classList.add('loading');
  } else {
    elements.generateBtn.disabled = false;
    elements.generateInner?.classList.remove('hidden');
    elements.generateSpinner?.classList.remove('visible');
    elements.paneOutput?.classList.remove('loading');
  }
}

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
  if (used >= dailyLimit) fill.style.background = '#ef4444';
  else if (used >= 7) fill.style.background = '#f59e0b';
  else fill.style.background = '#16a34a';
  label.textContent = `${used} / ${dailyLimit} free generates used today`;
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
  const input = document.querySelector('.apikey-input');
  if (input) {
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

async function saveKey() {
  const input = document.getElementById('apiKeyInput');
  if (!input) return;
  const key = input.value.trim();
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
      return;
    }
    const data = await res.json();
    throw new Error(data.message || 'Delete failed');
  } catch (err) {
    showToast(err.message || 'Failed to delete key', true);
  }
}

function renderKeyState(data) {
  const wrap = document.querySelector('.apikey-field-wrap');
  if (!wrap) return;
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
    return;
  }
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

async function generateComments(config) {
  const {
    codeInput, commentStyle, density, generateBtn, generateInner,
    generateSpinner, paneOutput, emptyState, outputPre,
    outLineNumbers, outCharCount, copyBtn, downloadBtn, shareBtn
  } = config;

  const code = codeInput.value.trim();
  if (!code) { showToast('Please paste some code first', true); return; }

  setLoading(true, { generateBtn, generateInner, generateSpinner, paneOutput });
  emptyState.style.display = 'none';
  outputPre.style.display = 'none';
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
      showUpgradeModal();
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API error');

    const output = stripCodeFences(data.outputCode || '');
    outputPre.textContent = output;
    outputPre.style.display = 'block';
    renderOutLineNumbers(output, outLineNumbers);

    const lines = output.split('\n').length;
    outCharCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
    if (copyBtn) copyBtn.disabled = false;
    if (downloadBtn) downloadBtn.disabled = false;
    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.style.display = 'inline-flex';
    }
    window.lastHistoryId = data.historyId;
    showToast('Comments generated ✓');

    renderUsageBar({
      hasByok: !!data.byokActive,
      dailyLimit: 10,
      usedToday: (10 - (data.generatesRemaining >= 0 ? data.generatesRemaining : 0)),
      remaining: data.generatesRemaining
    });
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
      const tab = Array.from(document.querySelectorAll('.lang-tab')).find(t => t.dataset.lang === obj.language);
      if (tab) tab.click();
    }
    if (obj.style) config.commentStyle.value = obj.style;
    if (obj.density) config.density.value = obj.density;
    if (obj.outputCode) {
      config.outputPre.textContent = obj.outputCode;
      config.outputPre.style.display = 'block';
      renderOutLineNumbers(obj.outputCode, config.outLineNumbers);
      const lines = obj.outputCode.split('\n').length;
      config.outLineCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
      if (config.copyBtn) config.copyBtn.disabled = false;
      if (config.downloadBtn) config.downloadBtn.disabled = false;
      if (config.shareBtn) {
        config.shareBtn.disabled = false;
        config.shareBtn.style.display = 'inline-flex';
      }
      config.emptyState.style.display = 'none';
    }

    sessionStorage.removeItem('cb-restore');
    showToast('Restored from history');
    return true;
  } catch (err) {
    console.error('restoreFromHistory', err);
    return false;
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
  const commentStyleEl = document.getElementById('commentStyle');
  const densityEl = document.getElementById('density');

  if (!codeInputEl || !outputPreEl || !generateBtnEl || !lineNumbersEl || !commentStyleEl || !densityEl) {
    return;
  }

  renderLineNumbers(codeInputEl, lineNumbersEl);
  charCountEl.textContent = '0 lines';

  codeInputEl.addEventListener('input', () => {
    renderLineNumbers(codeInputEl, lineNumbersEl);
    const lines = codeInputEl.value.split('\n').length;
    charCountEl.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
  });

  codeInputEl.addEventListener('scroll', () => {
    lineNumbersEl.style.transform = `translateY(-${codeInputEl.scrollTop}px)`;
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

  clearBtnEl?.addEventListener('click', () => {
    codeInputEl.value = '';
    codeInputEl.dispatchEvent(new Event('input'));
    charCountEl.textContent = '0 lines';
    emptyStateEl.style.display = '';
    outputPreEl.style.display = 'none';
    outputPreEl.textContent = '';
    outLineNumbersEl.innerHTML = '';
    outCharCountEl.textContent = '';
    if (copyBtnEl) copyBtnEl.disabled = true;
    if (downloadBtnEl) downloadBtnEl.disabled = true;
  });

  const tabs = Array.from(document.querySelectorAll('.lang-tab'));
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentLang = tab.dataset.lang;
    });
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

  try {
    const res = await authFetch('/api/v1/usage');
    if (res.ok) {
      renderUsageBar(await res.json());
    }
  } catch (err) {
    console.warn('Failed to load usage', err);
  }
}

function setupGlobal() {
  applyTheme(getStoredTheme());

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
  fetchKeyInfo().then(info => { if (info) renderKeyState(info); });
});
