# p5 + transformers.js demo

This small demo shows how to combine a p5.js sketch with transformers.js (browser) using Vite.

Getting started

1. Install dependencies

```bash
npm install
```

2. Run dev server

```bash
npm run dev
```

Open the URL shown by Vite (usually http://localhost:5173).

Notes

- This example uses `gpt2` as a small demo model. Models are downloaded to the browser and can be tens or hundreds of MBs.
- transformers.js supports different backends (WASM, WebGPU). See https://xenova.dev/transformers/ for details.
- To change model, edit `src/model.js` and replace `'gpt2'` with another supported model id.

# P5.js + Transformers.js Demo

Minimal scaffold combining a P5.js sketch with a placeholder for transformers.js usage in the browser.

Files created:

- `index.html` — page that hosts the canvas and controls.
- `main.js` — p5 sketch and a fake `generate` function to mock transformers output.

How to run locally:

1. Start a simple static server from the project folder. For example, with Python 3:

```bash
python -m http.server 8000
```

2. Open `http://localhost:8000` in your browser.

Notes and next steps:

- This demo uses p5 from jsdelivr. For real NLP/LLM generation in the browser you can integrate `transformers.js` or `@xenova/transformers` if you host a compatible WASM bundle or use a hosted inference API.
- If you want, I can now: wire a real transformers.js example (small model, local WASM), or connect to Hugging Face Inference API, or add UI to render generated prompts to visuals.
# Delivery-robot
