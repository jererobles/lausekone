# lausekone

Paste a Finnish sentence, get its anatomy: every case and why it's there, morpheme boundaries, and dependency arcs showing which word governs which.

## Deployment

Static site served by **GitHub Pages** from the `main` branch root — no build step. `index.html` loads `lausekone.jsx` directly in the browser (React + lucide-react via esm.sh, JSX transpiled by Babel standalone, Tailwind via CDN).

## Bring your own key (BYOK)

Parsing runs on the Anthropic API with a key you provide in the UI ("avain · api key"). The key:

- is stored only in your browser's `localStorage` (`lausekone.apiKey`) — there is no backend;
- is sent only to `api.anthropic.com` (using the [CORS direct-browser-access header](https://platform.claude.com/docs));
- can be changed ("vaihda") or removed ("poista") at any time.

Get a key at [console.anthropic.com](https://console.anthropic.com). Don't save it on shared machines.

## Local development

Serve the repo root with any static server, e.g.:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
