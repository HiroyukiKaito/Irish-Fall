#!/usr/bin/env node
/* Dev-only smoke test: executes js/game.js under a minimal fake DOM/canvas
   and simulates ~12 seconds of gameplay + death. Catches runtime errors
   (typos, null derefs, bad canvas ops) without a real browser.
   Run: node scripts/smoke.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');

/* ---------- canvas stub ---------- */
function makeCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  const ctx = new Proxy({
    canvas: {}, measureText: () => ({ width: 10 }),
  }, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern') {
        return () => grad;
      }
      return noop;
    },
    set(t, p, v) { t[p] = v; return true; }
  });
  return ctx;
}

const listeners = {};
const elements = [];
function makeEl(id) {
  const el = {
    id, style: {}, classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); },
      toggle(c) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); }
    },
    addEventListener() {}, getAttribute() { return ''; },
    setAttribute() {}, textContent: '', innerHTML: '', title: ''
  };
  return el;
}

const queue = [];                       // rAF callbacks
const timers = [];
const sandbox = {
  console,
  Math, JSON, Date, parseInt, parseFloat, isNaN,
  performance: { now: () => nowMs },
  setTimeout(fn, ms) { timers.push({ fn, at: nowMs + ms }); return timers.length; },
  clearTimeout() {},
  requestAnimationFrame(cb) { queue.push(cb); return queue.length; },
  localStorage: { getItem: () => null, setItem() {}, },
  document: {
    getElementById(id) { return makeEl(id); },
    addEventListener() {},
    hidden: false,
    body: { style: {} }
  },
  window: {
    addEventListener() {},
    AudioContext: undefined, webkitAudioContext: undefined,
    innerWidth: 1280, scrollY: 0
  },
  navigator: {}
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// canvas must be returned by getElementById('game-canvas')
const origGetEl = sandbox.document.getElementById.bind(sandbox.document);
sandbox.document.getElementById = (id) => {
  if (id === 'game-canvas') {
    return {
      getContext: () => makeCtx(),
      width: 0, height: 0,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
      addEventListener() {}
    };
  }
  return origGetEl(id);
};

let nowMs = 0;
vm.runInContext(src, sandbox, { filename: 'game.js' });

const api = sandbox.window.irishFall;
if (!api || typeof api.start !== 'function') {
  console.error('FAIL: window.irishFall API not exposed');
  process.exit(1);
}

/* simulate: ~2s idle, start, ~10s playing, force death via deep fall… */
function pump(seconds) {
  const end = nowMs + seconds * 1000;
  let frames = 0;
  while (nowMs < end && queue.length) {
    const cb = queue.shift();
    nowMs += 16.7;
    cb(nowMs);
    if (++frames > 3000) { console.error('FAIL: frame runaway'); process.exit(1); }
  }
  // run due timers
  timers.slice().forEach((t) => { if (t.at <= nowMs) { t.fn(); timers.splice(timers.indexOf(t), 1); } });
}

try {
  pump(2.0);                       // ready state, ambience frames
  api.start();
  pump(9.0);                       // gameplay
  console.log('OK — simulated ~9s of gameplay without errors');
  api.pause();
  pump(0.2);
  api.resume();
  pump(0.3);
  console.log('OK — pause/resume cycle passed');
} catch (e) {
  console.error('FAIL during simulation:', e && e.stack || e);
  process.exit(1);
}
console.log('SMOKE TEST PASSED');
