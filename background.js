const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'ai-stream') return;

  port.onMessage.addListener(async (msg) => {
    const { apiKey, pageContent, prompt, mode } = msg;

    try {
      let messages;

      if (mode === 'free') {
        messages = [
          {
            role: 'system',
            content: 'You are a helpful writing and productivity assistant. Be concise, direct, and practical. No preamble or filler.'
          },
          { role: 'user', content: prompt }
        ];
      } else {
        if (!pageContent || !pageContent.text) {
          port.postMessage({ type: 'error', error: 'Could not read page content. Refresh the page and try again.' });
          return;
        }

        const systemPrompt = `You are a helpful assistant that analyzes web pages. Answer accurately and concisely based on the page content provided.
Page title: ${pageContent.title}
Page URL: ${pageContent.url}`;

        const userContent = mode === 'summarize'
          ? `Summarize this web page following these rules strictly:
1. Write a single short paragraph — maximum 200 characters total.
2. After the paragraph, if (and only if) there are truly critical points the reader must not miss, list them as bullet points. Each bullet must be 4–7 words only. Maximum 5 bullets. If nothing is critical, omit the bullets entirely.
3. No headings, no filler, no repetition.

Page content:\n\n${pageContent.text}`
          : mode === 'suggest'
          ? `Based on this page content, write exactly 3 specific questions a reader would want answered. Rules: one question per line, no numbering or bullets, each question under 55 characters, no extra text.

Page content:\n\n${pageContent.text.slice(0, 4000)}`
          : `Answer in 2-3 sentences max. Be direct and specific. No preamble.\n\nPage content:\n\n${pageContent.text}\n\nQuestion: ${prompt}`;

        messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ];
      }

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model: MODEL, max_tokens: 1024, stream: true, messages })
      });

      if (!response.ok) {
        const errText = await response.text();
        port.postMessage({ type: 'error', error: `API error ${response.status}: ${errText}` });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            port.postMessage({ type: 'done' });
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) port.postMessage({ type: 'chunk', text });
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      port.postMessage({ type: 'error', error: err.message });
    }
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'save-key') {
    chrome.storage.local.set({ apiKey: msg.apiKey }, () => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'get-key') {
    chrome.storage.local.get(['apiKey'], (result) => sendResponse({ apiKey: result.apiKey || '' }));
    return true;
  }
});
