# PageMind — AI Web Page Summarizer & Content Extractor Chrome Extension

**PageMind** is a lightweight Chrome extension that uses OpenAI GPT-4o-mini to instantly summarize any web page and let you ask specific questions about its content — without leaving your browser tab.

> Powered by OpenAI · Built with Manifest V3 · No backend required · Costs fractions of a cent per use

---

## Features

- **One-click page summary** — get a concise breakdown of any article, docs page, or blog post in seconds
- **Ask anything about the page** — extract specific facts, dates, names, steps, or any targeted info
- **Streaming responses** — answers appear word-by-word as they generate, no waiting
- **Clean dark UI** — minimal popup that stays out of your way
- **Secure key storage** — your OpenAI API key is stored locally in Chrome's sync storage, never sent anywhere except OpenAI
- **Ultra-cheap** — uses `gpt-4o-mini`, one of the most cost-efficient models (~$0.15 per 1M input tokens)

---

## Screenshots

> _Add screenshots here once loaded in Chrome_

---

## Installation

### Option 1 — Load unpacked (Developer Mode)

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/your-username/pagemind.git
   ```

2. **Open Chrome** and navigate to:
   ```
   chrome://extensions
   ```

3. **Enable Developer Mode** — toggle in the top-right corner

4. **Click "Load unpacked"** and select the `pagemind/` folder

5. **Pin the extension** to your toolbar via the puzzle icon

### Option 2 — Chrome Web Store

> Coming soon

---

## Setup

1. Click the **PageMind** icon in your Chrome toolbar
2. Paste your **OpenAI API key** (starts with `sk-`) and click **Save**
3. Navigate to any web page and click **Summarize this page** or type a question

You can get an OpenAI API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

---

## Usage

| Action | How |
|---|---|
| Summarize a page | Click **Summarize this page** |
| Ask a specific question | Type in the question box and press **Ask** or hit Enter |
| Change your API key | Reload the extension popup (it shows the key input again if no key is saved) |

**Example questions you can ask:**
- _"What are the main steps in this tutorial?"_
- _"What is the pricing mentioned on this page?"_
- _"Who is the author and when was this published?"_
- _"List all the features mentioned"_
- _"What are the pros and cons?"_

---

## Tech Stack

| Component | Technology |
|---|---|
| Extension API | Chrome Manifest V3 |
| AI Model | OpenAI `gpt-4o-mini` |
| Streaming | Server-Sent Events (SSE) via `chrome.runtime.Port` |
| Key Storage | `chrome.storage.sync` |
| UI | Vanilla HTML/CSS/JS — zero dependencies |

---

## Privacy

- **No backend server** — API calls go directly from your browser to OpenAI
- **No data collection** — page content is never stored or logged
- **API key stays local** — stored in Chrome's encrypted sync storage
- **OpenAI's data policy** applies to content sent for processing — see [openai.com/privacy](https://openai.com/privacy)

---

## Cost Estimate

Using `gpt-4o-mini` pricing (as of 2025):

| Action | Approx. cost |
|---|---|
| Summarize a typical article (5,000 words) | ~$0.001 |
| Ask a question on the same page | ~$0.001 |
| 100 summarizations per month | ~$0.10 |

---

## Project Structure

```
pagemind/
├── manifest.json     # Chrome extension manifest (MV3)
├── background.js     # Service worker — handles OpenAI API calls & streaming
├── popup.html        # Extension popup markup
├── popup.css         # Dark UI styles
└── popup.js          # Popup logic — extraction, streaming, key management
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push and open a Pull Request

---

## License

[MIT](LICENSE)

---

## Related

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Chrome Extensions — Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [gpt-4o-mini Model Card](https://platform.openai.com/docs/models/gpt-4o-mini)
