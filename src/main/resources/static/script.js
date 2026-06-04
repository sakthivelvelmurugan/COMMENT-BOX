const themeToggle = document.getElementById('themeToggle');
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const settingsClose = document.getElementById('settingsClose');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const removeKeyBtn = document.getElementById('removeKeyBtn');
const toggleKeyBtn = document.getElementById('toggleKeyBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const keyStatus = document.getElementById('keyStatus');
const statusBadge = document.getElementById('statusBadge');
const keyFeedback = document.getElementById('keyFeedback');
const generateBtn = document.getElementById('generateBtn');
const pasteBtn = document.getElementById('pasteBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const progressRow = document.getElementById('progressRow');
const progressFill = document.getElementById('progressFill');
const codeInput = document.getElementById('codeInput');
const outputPre = document.getElementById('outputPre');
const emptyState = document.getElementById('emptyState');
const inputLines = document.getElementById('inputLines');
const outputLines = document.getElementById('outputLines');
const languageSelect = document.getElementById('languageSelect');
const commentStyle = document.getElementById('commentStyle');
const densitySelect = document.getElementById('density');
let currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
let isGenerating = false;

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cb-theme', theme);
  currentTheme = theme;
}

function getStoredApiKey() {
  return localStorage.getItem('cb-openrouter-key') || '';
}

function setStoredApiKey(value) {
  localStorage.setItem('cb-openrouter-key', value);
}

function removeStoredApiKey() {
  localStorage.removeItem('cb-openrouter-key');
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = isError ? 'toast show error' : 'toast show';
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

function updateKeyStatus() {
  const key = getStoredApiKey();
  const active = Boolean(key);
  keyStatus.textContent = active ? 'Saved' : 'Not set';
  statusBadge.textContent = active ? 'Saved locally' : 'No key';
  statusBadge.style.backgroundColor = active ? 'rgba(34,197,94,0.12)' : 'rgba(222,126,94,0.12)';
  statusBadge.style.color = active ? '#166534' : '#b91c1c';
}

function isValidOpenRouterKey(key) {
  return /^(sk(-or)?(-v\d+)?|or(-v\d+)?)-[A-Za-z0-9-]{8,}$/i.test(key);
}

function toggleSettings(show) {
  const isOpen = show === undefined ? !settingsPanel.classList.contains('open') : show;
  settingsPanel.classList.toggle('open', isOpen);
  settingsPanel.setAttribute('aria-hidden', String(!isOpen));
  if (isOpen) {
    const key = getStoredApiKey();
    apiKeyInput.value = key;
    keyFeedback.textContent = '';
  }
}

function setLoading(on) {
  isGenerating = on;
  generateBtn.disabled = on;
  copyBtn.disabled = on || !outputPre.textContent;
  downloadBtn.disabled = on || !outputPre.textContent;
  progressRow.hidden = !on;
  if (on) {
    progressFill.style.width = '10%';
    window.requestAnimationFrame(() => { progressFill.style.width = '60%'; });
  } else {
    progressFill.style.width = '100%';
    window.setTimeout(() => { progressFill.style.width = '0%'; }, 300);
  }
}

function updateInputLines() {
  const count = codeInput.value ? codeInput.value.trimEnd().split('\n').length : 0;
  inputLines.textContent = `${count} line${count === 1 ? '' : 's'}`;
}

function updateOutputLines() {
  const text = outputPre.textContent.trim();
  if (!text) {
    outputLines.textContent = 'Ready';
    return;
  }
  const lines = text.split('\n').length;
  outputLines.textContent = `${lines} line${lines === 1 ? '' : 's'}`;
}

function clearOutput() {
  outputPre.textContent = '';
  outputPre.hidden = true;
  emptyState.hidden = false;
  outputLines.textContent = 'Ready';
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
}

async function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    keyFeedback.textContent = 'Enter an API key first.';
    keyFeedback.className = 'feedback-text error';
    return;
  }
  if (!isValidOpenRouterKey(key)) {
    keyFeedback.textContent = 'Key format looks invalid.';
    keyFeedback.className = 'feedback-text error';
    return;
  }
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

function updateControlsAfterOutput() {
  const hasOutput = Boolean(outputPre.textContent.trim());
  copyBtn.disabled = !hasOutput;
  downloadBtn.disabled = !hasOutput;
}

async function generateComments() {
  if (isGenerating) return;
  const code = codeInput.value.trim();
  if (!code) {
    showToast('Paste some code first.', true);
    return;
  }

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
    const response = await fetch('/api/v1/comments/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(async () => {
      const text = await response.text().catch(() => '');
      return { message: text || response.statusText || 'Server error' };
    });
    if (!response.ok) {
      const errorMessage = data.message || data.error || `Generation failed (${response.status})`;
      throw new Error(errorMessage);
    }

    const output = (data.outputCode || data.output || '').replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    if (!output) {
      throw new Error('No output returned from the API.');
    }

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

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      codeInput.value = text;
      updateInputLines();
      showToast('Pasted from clipboard');
    } else {
      showToast('Clipboard is empty.', true);
    }
  } catch {
    showToast('Clipboard access denied.', true);
  }
}

function downloadOutput() {
  const text = outputPre.textContent.trim();
  if (!text) return;
  const extMap = { java: 'java', python: 'py', cpp: 'cpp', other: 'txt' };
  const ext = extMap[languageSelect.value] || 'txt';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `commented.${ext}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast('Downloaded commented code');
}

async function copyOutput() {
  const text = outputPre.textContent.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  } catch {
    showToast('Copy failed.', true);
  }
}

function bindEvents() {
  themeToggle.addEventListener('click', () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark'));
  settingsToggle.addEventListener('click', () => toggleSettings());
  settingsClose.addEventListener('click', () => toggleSettings(false));
  saveKeyBtn.addEventListener('click', saveApiKey);
  removeKeyBtn.addEventListener('click', removeApiKey);
  toggleKeyBtn.addEventListener('click', toggleApiKeyVisibility);
  generateBtn.addEventListener('click', generateComments);
  pasteBtn.addEventListener('click', pasteFromClipboard);
  clearBtn.addEventListener('click', () => {
    codeInput.value = '';
    updateInputLines();
    clearOutput();
  });
  copyBtn.addEventListener('click', copyOutput);
  downloadBtn.addEventListener('click', downloadOutput);
  codeInput.addEventListener('input', updateInputLines);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      generateComments();
    }
    if (event.key === 'Escape' && settingsPanel.classList.contains('open')) {
      toggleSettings(false);
    }
  });
  document.addEventListener('click', (event) => {
    if (!settingsPanel.contains(event.target) && !settingsToggle.contains(event.target)) {
      toggleSettings(false);
    }
  });
}

function initialize() {
  const savedTheme = localStorage.getItem('cb-theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  }
  updateKeyStatus();
  updateInputLines();
  updateControlsAfterOutput();
  bindEvents();
}

document.addEventListener('DOMContentLoaded', initialize);
