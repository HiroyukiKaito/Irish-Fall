#!/usr/bin/env node
/* Builds downloads/irish-fall-demo.html — a single, self-contained,
   offline copy of the Irish Fall demo (game code inlined, no external
   requests). Run from the repository root:  node scripts/build-offline.js */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const gameSrc = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');

const css = `
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh;
    font-family: Georgia, 'Times New Roman', serif;
    color: #e9eef7;
    background:
      radial-gradient(70% 55% at 50% 0%, rgba(245,185,66,.10), transparent 60%),
      radial-gradient(80% 60% at 50% 100%, rgba(61,220,151,.07), transparent 60%),
      linear-gradient(180deg, #070b13 0%, #0a111d 60%, #060a11 100%);
    display: flex; flex-direction: column; align-items: center;
    padding: 26px 14px 40px;
  }
  .wrap { width: min(960px, 100%); }
  h1 { margin: 0 0 4px; font-size: clamp(30px, 6vw, 52px); letter-spacing: .06em; text-align:center; }
  h1 .g { color: #f5b942; text-shadow: 0 0 26px rgba(245,185,66,.4); }
  .tag { margin: 0 0 22px; color: #93a1b5; text-align: center; font-size: 15px; font-style: italic; }
  .toolbar {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    background: #0a1322; border: 1px solid rgba(148,196,255,.14); border-bottom: 0;
    border-radius: 14px 14px 0 0; padding: 9px 14px;
    font-family: Arial, sans-serif; font-size: 12px; font-weight: 700;
    letter-spacing: .16em; text-transform: uppercase; color: #cfe0ee;
  }
  .toolbar button {
    width: 34px; height: 34px; border-radius: 9px; border: 1px solid rgba(148,196,255,.2);
    background: #0e1a2e; color: #fff; font-size: 16px; cursor: pointer;
  }
  .toolbar button:hover { border-color: rgba(245,185,66,.6); }
  .tools { display: flex; gap: 8px; }
  .stage {
    position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden;
    border: 1px solid rgba(148,196,255,.14); border-radius: 0 0 14px 14px;
    background: #04070d; box-shadow: 0 30px 90px rgba(0,0,0,.6);
  }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
  .overlay {
    position: absolute; inset: 0; z-index: 5; display: grid; place-items: center;
    background: rgba(4,8,15,.55); backdrop-filter: blur(3px);
  }
  .card {
    text-align: center; background: linear-gradient(180deg, rgba(16,26,44,.95), rgba(9,15,27,.97));
    border: 1px solid rgba(245,185,66,.3); border-radius: 18px;
    padding: 26px 34px; max-width: min(92%, 400px); box-shadow: 0 24px 70px rgba(0,0,0,.7);
  }
  .logo { font-size: 26px; letter-spacing: .14em; font-weight: 700; }
  .logo .g { color: #f5b942; }
  .sub { color: #93a1b5; font-style: italic; font-size: 14px; margin: 6px 0 18px; }
  .btn {
    display: inline-block; cursor: pointer; border: 0; border-radius: 12px;
    background: linear-gradient(120deg, #ffd97a, #f5b942 45%, #d98f1f);
    color: #151006; font: 800 17px/1 Arial, sans-serif; padding: 15px 34px;
    box-shadow: 0 10px 30px rgba(245,185,66,.3);
  }
  .btn:hover { filter: brightness(1.08); }
  .stat { color: #93a1b5; font-size: 13px; font-style: italic; margin: 14px 0 0; }
  .hint { margin: 14px 0 0; color: #93a1b5; font-size: 12px; text-align: center; font-family: Arial, sans-serif; }
  .hint b { color: #ffe08a; }
  .meta { margin-top: 18px; color: #5b6b7e; font-size: 12px; font-family: Arial, sans-serif; text-align: center; }
  .meta a { color: #93a1b5; }
  .hidden { display: none !important; }
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Irish Fall — offline demo</title>
<meta name="description" content="Irish Fall — an endless, dark browser game. Playable offline from this single file." />
<style>${css}</style>
</head>
<body>
  <div class="wrap">
    <h1>IRISH <span class="g">FALL</span></h1>
    <p class="tag">The Emerald Abyss — endless descent demo (offline edition)</p>

    <div class="toolbar">
      <span>IRISH FALL · live demo</span>
      <span class="tools">
        <button id="btn-sound" type="button" aria-label="Sound">&#128266;</button>
        <button id="btn-restart" type="button" aria-label="Restart">&#8635;</button>
      </span>
    </div>

    <div class="stage" id="game-wrap">
      <canvas id="game-canvas" width="960" height="540"></canvas>

      <div class="overlay" id="ov-start">
        <div class="card">
          <div class="logo">IRISH <span class="g">FALL</span></div>
          <p class="sub">The Emerald Abyss is waiting below.</p>
          <button class="btn" id="btn-play" type="button">&#9654; Start falling</button>
          <p class="stat" id="ov-best">Best depth: 0 m</p>
        </div>
      </div>

      <div class="overlay hidden" id="ov-pause">
        <div class="card" style="max-width:300px;padding:20px 26px">
          <div class="logo" style="font-size:20px">PAUSED</div>
          <p class="hint">Press <b>P</b> or tap to resume</p>
        </div>
      </div>

      <div class="overlay hidden" id="ov-over">
        <div class="card">
          <div class="logo" style="font-size:20px;letter-spacing:.22em">GAME OVER</div>
          <p style="color:#93a1b5;font-size:13px;margin:6px 0 14px">The mist took you...</p>
          <p class="stat" style="font-style:normal;font-family:Arial,sans-serif;font-weight:800;color:#ffe08a;font-size:15px">
            Depth: <span id="final-depth">0 m</span> &nbsp;·&nbsp; Gold: <span id="final-coins">0</span>
          </p>
          <p class="stat" id="final-best" style="margin:6px 0 16px">Best: 0 m</p>
          <button class="btn" id="btn-retry" type="button">&#8635; Fall again</button>
          <p class="hint">Press <b>Space</b> to retry</p>
        </div>
      </div>
    </div>

    <p class="hint">
      Steer: <b>&larr;</b> <b>&rarr;</b> / <b>A</b> <b>D</b> or drag &nbsp;·&nbsp;
      Start / retry: <b>Space</b> &nbsp;·&nbsp; Pause: <b>P</b> &nbsp;·&nbsp; Sound: <b>M</b>
    </p>
    <p class="meta">Single-file demo · works fully offline · no internet needed.<br />
      Full site &amp; source: <a href="https://github.com/HiroyukiKaito/Irish-Fall">github.com/HiroyukiKaito/Irish-Fall</a></p>
  </div>
<script>
${gameSrc}
</script>
</body>
</html>
`;

const outDir = path.join(ROOT, 'downloads');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'irish-fall-demo.html'), html);
console.log('Wrote downloads/irish-fall-demo.html (' + Buffer.byteLength(html) + ' bytes)');
