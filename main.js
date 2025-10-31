import p5 from 'https://cdn.jsdelivr.net/npm/p5@1.6.0/lib/p5.min.js';
// Transformers.js can be used in the browser via a CDN build. We'll use a lightweight approach
// NOTE: transformers.js (huggingface) may require CORS or a bundler in production. This demo shows
// how you would wire it if a browser-compatible bundle is available.

const sketch = (p) => {
  p.setup = () => {
    p.createCanvas(window.innerWidth, window.innerHeight);
    p.background(30);
    p.noLoop();
  };

  p.draw = () => {
    // placeholder visuals
    p.push();
    p.translate(p.width / 2, p.height / 2);
    p.noFill();
    p.stroke(255, 100);
    for (let i = 0; i < 50; i++) {
      p.ellipse(0, 0, i * 20 + 10, i * 10 + 20);
      p.rotate(0.1);
    }
    p.pop();
  };

  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
    p.redraw();
  };
};

new p5(sketch);

// Transformers usage: We'll dynamically import a browser-compatible transformers bundle if available.
// For demonstration, we implement a fake generate function to avoid network/model loading complications.

async function fakeGenerate(prompt) {
  await new Promise((r) => setTimeout(r, 700));
  return `Generated (fake) response for: "${prompt}"\n\n- Palette: vibrant\n- Style: abstract\n- Mood: energetic`;
}

const promptInput = document.getElementById('prompt');
const generateBtn = document.getElementById('generate');
const out = document.getElementById('out');

generateBtn.addEventListener('click', async () => {
  const val = promptInput.value.trim();
  out.textContent = 'Generating...';
  try {
    // TODO: replace fakeGenerate with actual transformers.js call when the user wants.
    const txt = await fakeGenerate(val || '');
    out.textContent = txt;
  } catch (err) {
    out.textContent = 'Error: ' + err.message;
  }
});
