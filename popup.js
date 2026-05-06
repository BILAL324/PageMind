const summarizeBtn  = document.getElementById('summarize-btn');
const askBtn        = document.getElementById('ask-btn');
const questionInput = document.getElementById('question-input');
const resultCard    = document.getElementById('result-card');
const resultText    = document.getElementById('result-text');
const statusEl      = document.getElementById('status');
const keyCard       = document.getElementById('key-card');
const mainCard      = document.getElementById('main-card');
const apiKeyInput   = document.getElementById('api-key-input');
const saveKeyBtn    = document.getElementById('save-key-btn');
const updateKeyLink = document.getElementById('update-key-link');
const suggestionsEl = document.getElementById('suggestions');

let apiKey = '';
let pageContent = null;
let activePort = null;

const setStatus = (msg, tone = '') => {
  statusEl.textContent = msg;
  statusEl.className = `status ${tone}`.trim();
};

const setLoading = (on) => {
  summarizeBtn.disabled = on;
  askBtn.disabled = on;
  questionInput.disabled = on;
};

// -- API key --

const loadApiKey = () => new Promise(resolve =>
  chrome.runtime.sendMessage({ type: 'get-key' }, (res) => resolve(res?.apiKey || ''))
);

const saveApiKey = (key) => new Promise(resolve =>
  chrome.runtime.sendMessage({ type: 'save-key', apiKey: key }, () => resolve())
);

saveKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith('sk-')) {
    setStatus('Key should start with sk-', 'error');
    return;
  }
  await saveApiKey(key);
  apiKey = key;
  keyCard.hidden = true;
  mainCard.hidden = false;
  updateKeyLink.hidden = false;
  apiKeyInput.value = '';
  setStatus('API key saved.', 'success');
});

apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveKeyBtn.click();
});

updateKeyLink.addEventListener('click', () => {
  keyCard.hidden = !keyCard.hidden;
  updateKeyLink.textContent = keyCard.hidden ? 'Update API key' : 'Cancel';
});

// -- Page content extraction --

const getPageContent = async () => {
  if (pageContent) return pageContent;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found.');
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
    throw new Error('Cannot read this page. Navigate to a regular website first.');
  }

  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        const text = (clone.innerText || clone.textContent || '')
          .replace(/\s{3,}/g, '\n\n')
          .trim();
        const MAX = 60000;
        return {
          title: document.title,
          url: window.location.href,
          text: text.length > MAX ? text.slice(0, MAX) + '\n\n[content truncated]' : text
        };
      }
    });
  } catch (e) {
    throw new Error('Cannot access this page. Try refreshing.');
  }

  const extracted = results?.[0]?.result;
  if (!extracted || !extracted.text) throw new Error('Page content is empty or unreadable.');
  pageContent = extracted;
  return pageContent;
};

// -- Streaming --

const streamFromAI = (content, prompt, mode) => {
  return new Promise((resolve, reject) => {
    if (activePort) { try { activePort.disconnect(); } catch {} }

    const port = chrome.runtime.connect({ name: 'ai-stream' });
    activePort = port;

    let fullText = '';
    resultCard.hidden = false;
    resultText.textContent = '';

    port.onMessage.addListener((msg) => {
      if (msg.type === 'chunk') {
        fullText += msg.text;
        resultText.textContent = fullText;
        resultCard.scrollTop = resultCard.scrollHeight;
      }
      if (msg.type === 'done') {
        port.disconnect();
        activePort = null;
        resolve(fullText);
      }
      if (msg.type === 'error') {
        port.disconnect();
        activePort = null;
        reject(new Error(msg.error));
      }
    });

    port.onDisconnect.addListener(() => { activePort = null; });

    port.postMessage({ apiKey, pageContent: content, prompt, mode });
  });
};

// -- Silent stream collector (no UI update) --

const collectStream = (content, mode) => {
  return new Promise((resolve) => {
    if (!content || !content.text) { resolve(''); return; }
    const port = chrome.runtime.connect({ name: 'ai-stream' });
    let fullText = '';
    port.onMessage.addListener((msg) => {
      if (msg.type === 'chunk') fullText += msg.text;
      if (msg.type === 'done' || msg.type === 'error') { port.disconnect(); resolve(fullText); }
    });
    port.onDisconnect.addListener(() => resolve(fullText));
    port.postMessage({ apiKey, pageContent: content, prompt: '', mode });
  });
};

const renderSuggestions = (questions) => {
  suggestionsEl.innerHTML = '';
  questions.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = q;
    btn.title = q;
    btn.addEventListener('click', () => {
      questionInput.value = q;
      run('ask');
    });
    suggestionsEl.appendChild(btn);
  });
  suggestionsEl.hidden = false;
};

const generateSuggestions = async (content) => {
  try {
    const raw = await collectStream(content, 'suggest');
    const questions = raw.split('\n').map(l => l.replace(/^[-•\d.)\s]+/, '').trim()).filter(l => l.length > 8).slice(0, 3);
    if (questions.length) renderSuggestions(questions);
  } catch {
    // suggestions are non-critical, fail silently
  }
};

// -- Handlers --

const run = async (mode) => {
  if (!apiKey) { setStatus('Save your API key first.', 'error'); return; }

  setLoading(true);
  setStatus(mode === 'summarize' ? 'Reading page…' : 'Thinking…');
  resultCard.hidden = true;
  resultText.textContent = '';

  try {
    const content = await getPageContent();
    setStatus('Streaming response…');
    await streamFromAI(content, questionInput.value.trim(), mode);
    setStatus('Done.', 'success');
    if (mode === 'summarize') generateSuggestions(content);
  } catch (err) {
    setStatus(err.message, 'error');
  } finally {
    setLoading(false);
  }
};

summarizeBtn.addEventListener('click', () => run('summarize'));

askBtn.addEventListener('click', () => {
  if (!questionInput.value.trim()) {
    setStatus('Enter a question first.', 'error');
    return;
  }
  run('ask');
});

questionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') askBtn.click();
});

// -- Init --

(async () => {
  apiKey = await loadApiKey();
  if (apiKey) {
    keyCard.hidden = true;
    mainCard.hidden = false;
    updateKeyLink.hidden = false;
    run('summarize');
  }
})();
