// Animated, drag-driven dough board. The engine still counts the passes:
// this module only turns pointer motion into calls to opts.prepare().
const W = 300, H = 280;
// The fillable middle of the dough sheet art, in its 300×280 viewBox.
const SHEET = {x: 48, y: 93, w: 191, h: 114};
const COUNTS = {flatten: 4, butter: 3, fill: 3, roll: 2};
const COLS = 12, ROWS = 6, COVER_GOAL = .85;
const FLATTEN_PASS = 110;
const DOUGH_COLOR = {classic: '#f7d79a', cocoa: '#b47b50'};
const SPIRAL_COLOR = {cinnamon: '#75402a', 'chocolate-cinnamon': '#482b25'};
const GRAIN_COLOR = {cinnamon: ['#a76534', '#c98a4f', '#7a4424'], 'chocolate-cinnamon': ['#613929', '#4a2a1f', '#8a5a3c']};
// Tool art: width in stage units, image aspect, the contact point as a fraction of the image,
// and the resting angle. Each tool hangs from its contact point so it can tilt around it.
const TOOLS = {
  flatten: {id: 'rolling-pin', w: 250, aspect: 130 / 380, ax: .5, ay: .5, angle: 0},
  butter: {id: 'spatula', w: 40, aspect: 300 / 110, ax: .5, ay: .05, angle: 200},
  fill: {id: 'filling-shaker', w: 62, aspect: 250 / 166, ax: .5, ay: .02, angle: 168, lift: 58},
  roll: {id: 'scraper', w: 68, aspect: 160 / 180, ax: .5, ay: .97, angle: 180},
  slice: {id: 'slicing-tool', w: 120, aspect: 120 / 260, ax: .03, ay: .55, angle: -90},
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountDoughBoard(board, opts) {
  const {roll: r, art, entrance} = opts;
  const step = r.step;
  const count = COUNTS[step] || 0;
  const id = stage => `dough-${r.dough}-${r.filling || 'cinnamon'}-${stage}`;
  const src = key => art.get(key);
  const timers = new Set(), frames = new Set();
  let alive = true, busy = false, pointer = null, queued = 0;

  const stage = el('div', 'dough-stage');
  const base = img('layer base');
  const next = img('layer next');
  const canvas = el('canvas', 'layer paint');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const fx = el('div', 'layer fx');
  stage.append(base, next, canvas, fx);
  board.prepend(stage);

  const toolDef = TOOLS[step];
  let tool = null, toolImg = null, grain = null;
  if (toolDef) {
    tool = el('div', 'dough-tool resting');
    tool.dataset.tool = toolDef.id;
    toolImg = img('');
    toolImg.src = src(toolDef.id);
    tool.append(toolImg);
    if (step === 'flatten') { grain = el('span', 'pin-grain'); tool.append(grain); }
    board.append(tool);
  }

  // Mask of where butter or filling has landed; the next-stage art shows through it.
  const mask = document.createElement('canvas');
  mask.width = W; mask.height = H;
  const mctx = mask.getContext('2d');
  const cells = new Uint8Array(COLS * ROWS);
  let nextArt = null;

  const state = {f: r.work / (count || 1), dist: 0, p: r.work / 2, tilt: 0, roll: 0, lastX: 0, lastY: 0, lastEmit: 0};

  // ----- layout helpers -----
  function scale() { return stage.getBoundingClientRect().width / W; }
  function toStage(cx, cy) { const b = stage.getBoundingClientRect(); return {x: (cx - b.left) / b.width * W, y: (cy - b.top) / b.height * H}; }
  function stageToBoard(x, y) {
    const s = stage.getBoundingClientRect(), b = board.getBoundingClientRect();
    return {x: s.left - b.left - board.clientLeft + x * s.width / W, y: s.top - b.top - board.clientTop + y * s.height / H};
  }
  function sizeTool() {
    if (!tool) return;
    const k = scale(), w = toolDef.w * k, h = w * toolDef.aspect;
    toolImg.style.width = w + 'px'; toolImg.style.height = h + 'px';
    toolImg.style.left = -toolDef.ax * w + 'px'; toolImg.style.top = -toolDef.ay * h + 'px';
    toolImg.style.transformOrigin = `${toolDef.ax * 100}% ${toolDef.ay * 100}%`;
    if (grain) Object.assign(grain.style, {left: -toolDef.ax * w + w * .21 + 'px', top: -toolDef.ay * h + h * .19 + 'px', width: w * .58 + 'px', height: h * .62 + 'px', borderRadius: 26 / 130 * h + 'px'});
  }
  function placeTool(x, y, angle = toolDef.angle) {
    if (!tool) return;
    const p = stageToBoard(x, y - (toolDef.lift || 0));
    tool.style.transform = `translate(${p.x}px,${p.y}px) rotate(${angle}deg)`;
  }
  function restTool() {
    if (!tool) return;
    if (step === 'slice') { placeTool(72, 88); return; }
    // Park the tool inside the board's frame, clear of the dough.
    const bw = board.clientWidth, bh = board.clientHeight, w = toolDef.w * scale(), h = w * toolDef.aspect;
    const [x, y] = {flatten: [bw / 2, h / 2 + 10], butter: [bw - w - 22, (1 - toolDef.ay) * h + 12], fill: [bw - w / 2 - 24, h + 10], roll: [bw - w / 2 - 18, bh - h - 14]}[step];
    tool.style.transform = `translate(${x}px,${y}px) rotate(${toolDef.angle}deg)`;
  }

  // ----- drawing -----
  function setBase(key) { base.src = src(key); }
  function paintReveal() {
    ctx.clearRect(0, 0, W, H);
    if (!nextArt?.complete) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(nextArt, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  function markCells(x, y, radius) {
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const cx = SHEET.x + (col + .5) * SHEET.w / COLS, cy = SHEET.y + (row + .5) * SHEET.h / ROWS;
      if (Math.hypot(cx - x, cy - y) <= radius) cells[row * COLS + col] = 1;
    }
  }
  function coverage() { return cells.reduce((s, c) => s + c, 0) / cells.length; }
  function smear(x0, y0, x1, y1, width) {
    mctx.strokeStyle = '#000'; mctx.lineCap = 'round'; mctx.lineJoin = 'round'; mctx.lineWidth = width;
    mctx.beginPath(); mctx.moveTo(x0, y0); mctx.lineTo(x1, y1); mctx.stroke();
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
    for (let i = 0; i <= steps; i++) markCells(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, width * .62);
  }
  function stamp(x, y, radius) {
    // A landing pinch of filling: a cluster of specks that builds up into an even layer.
    mctx.fillStyle = '#000';
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * radius;
      mctx.beginPath(); mctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + Math.random() * 2.5, 0, Math.PI * 2); mctx.fill();
    }
    markCells(x, y, radius * 1.1);
  }
  function stampBand(k) {
    const y0 = SHEET.y + k / count * SHEET.h - 4, y1 = SHEET.y + (k + 1) / count * SHEET.h + 4;
    mctx.fillStyle = '#000'; mctx.fillRect(SHEET.x - 6, y0, SHEET.w + 12, y1 - y0);
    for (let row = 0; row < ROWS; row++) {
      const cy = SHEET.y + (row + .5) * SHEET.h / ROWS;
      if (cy >= y0 && cy <= y1) for (let col = 0; col < COLS; col++) cells[row * COLS + col] = 1;
    }
  }
  function drawFlatten() {
    const f = ease(clamp(state.f));
    // Squash the ball wide and low, then hand over to the sheet art at a matching size.
    base.style.transform = `scale(${1 + .14 * f},${1 - .34 * f})`;
    base.style.opacity = 1 - clamp((f - .32) / .26);
    next.style.transform = `scale(${.84 + .16 * f},${.62 + .38 * f})`;
    next.style.opacity = clamp((f - .28) / .26);
  }
  function drawRoll(p = state.p, cyOverride, rOverride) {
    const top = 72, bottom = 230;
    const edge = bottom - p * (bottom - top);
    const radius = rOverride ?? 9 + p * 38;
    const cy = cyOverride ?? edge - radius * .35;
    base.style.clipPath = `inset(0 0 ${clamp((H - edge + radius * .6) / H) * 100}% 0)`;
    ctx.clearRect(0, 0, W, H);
    const x0 = 62 - radius * .1, x1 = 252, dough = DOUGH_COLOR[r.dough], spiral = SPIRAL_COLOR[r.filling] || '#75402a';
    ctx.lineWidth = 5; ctx.strokeStyle = '#3c2726'; ctx.lineJoin = 'round';
    // shadow
    ctx.fillStyle = 'rgba(56,36,37,.18)';
    ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, cy + radius + 4, (x1 - x0) / 2 + 6, 6 + radius * .12, 0, 0, Math.PI * 2); ctx.fill();
    // body
    ctx.fillStyle = dough;
    roundRect(ctx, x0, cy - radius, x1 - x0, radius * 2, radius * .9); ctx.fill(); ctx.stroke();
    // rotation highlight: a light band that sweeps over the log as it turns
    ctx.save(); roundRect(ctx, x0, cy - radius, x1 - x0, radius * 2, radius * .9); ctx.clip();
    for (let i = 0; i < 2; i++) {
      const phase = ((state.roll / 22 + i * .5) % 1 + 1) % 1, yy = cy - radius + phase * radius * 2;
      ctx.strokeStyle = `rgba(255,228,174,${.85 * Math.sin(phase * Math.PI)})`; ctx.lineWidth = 3 + radius * .12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0 + radius * .9, yy); ctx.lineTo(x1 - radius * .5, yy); ctx.stroke();
    }
    ctx.restore();
    // spiral end
    ctx.lineWidth = 5; ctx.strokeStyle = '#3c2726'; ctx.fillStyle = dough;
    ctx.beginPath(); ctx.ellipse(x0 + radius * .1, cy, Math.max(4, radius * .68), radius, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (radius > 12) {
      ctx.strokeStyle = spiral; ctx.lineWidth = Math.max(2, radius * .13); ctx.lineCap = 'round';
      ctx.beginPath();
      const turns = 1.4 + p * 1.2;
      for (let t = 0; t <= 1; t += .02) {
        const a = -state.roll / 9 + t * turns * Math.PI * 2, rr = radius * .8 * (1 - t * .85);
        const px = x0 + radius * .1 + Math.cos(a) * rr * .68, py = cy + Math.sin(a) * rr;
        t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  // ----- particles -----
  function particle(cls, x, y, style = {}) {
    const p = el('span', 'particle ' + cls);
    Object.assign(p.style, {left: x / W * 100 + '%', top: y / H * 100 + '%'}, style);
    fx.append(p);
    return p;
  }
  function puff(x, y, n = 8, cls = 'flour') {
    if (reducedMotion()) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = 14 + Math.random() * 26;
      const p = particle(cls, x, y, {'--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d * .6 - 8 + 'px', animationDelay: Math.random() * 60 + 'ms'});
      later(() => p.remove(), 900);
    }
  }
  function sprinkle(x, y) {
    // Grains leave the jar's lid and fall to the sheet, revealing filling where they land.
    const colors = GRAIN_COLOR[r.filling] || GRAIN_COLOR.cinnamon;
    const lid = toolDef.lift;
    for (let i = 0; i < 3; i++) {
      const tx = x + (Math.random() - .5) * 34, ty = y + (Math.random() - .5) * 20;
      const sx = x + (Math.random() - .5) * 10, sy = y - lid + 6, k = scale();
      const p = particle('grain', sx, sy, {background: colors[i % 3], '--dx': (tx - sx) * k + 'px', '--dy': (ty - sy) * k + 'px'});
      const fall = 260 + Math.random() * 120;
      p.style.animationDuration = fall + 'ms';
      later(() => {
        p.remove();
        stamp(tx, ty, 8 + Math.random() * 5);
        paintReveal();
        settle();
      }, reducedMotion() ? 0 : fall);
    }
  }

  // ----- timing helpers that die with the board -----
  function later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); }
  function tween(ms, fn, done) {
    if (reducedMotion()) ms = Math.min(ms, 120);
    const start = performance.now();
    const tick = now => {
      if (!alive) return;
      const t = clamp((now - start) / ms);
      fn(t);
      if (t < 1) frames.add(requestAnimationFrame(tick)); else done?.();
    };
    frames.add(requestAnimationFrame(tick));
  }

  // ----- progress -----
  function reportPartial() {
    if (!count) return;
    const partial = step === 'flatten' ? state.dist / FLATTEN_PASS : step === 'roll' ? (state.p * 2) % 1 : Math.min(1, coverage() / COVER_GOAL * count - r.work);
    opts.progress((r.work + clamp(partial)) / count);
  }
  function advance() {
    const result = opts.prepare();
    if (result === 'done') finishStep();
    return result;
  }
  function settle() {
    // Butter and filling advance whenever enough of the sheet is covered.
    if (r.step !== step) return;
    const target = Math.min(count, Math.floor(coverage() / COVER_GOAL * count + 1e-6));
    while (r.step === step && r.work < target) if (advance() === 'done') return;
    reportPartial();
  }
  function finishStep() {
    busy = true; pointer = null;
    tool?.classList.remove('active', 'shaking');
    tool?.classList.add('resting'); restTool();
    if (step === 'flatten') {
      tween(260, t => { state.f = 1; drawFlatten(); next.style.transform = `scale(${1 + .04 * Math.sin(t * Math.PI)},${1 - .06 * Math.sin(t * Math.PI)})`; }, () => later(opts.done, 120));
      puff(150, 150, 12);
    } else if (step === 'butter' || step === 'fill') {
      next.src = nextArt.src; next.style.opacity = 0;
      tween(320, t => { next.style.opacity = t; }, () => later(opts.done, 80));
      if (step === 'butter') shine();
    } else if (step === 'roll') {
      tween(380, t => { const e = ease(t); state.roll += 1.4; drawRoll(1, (72 - 47 * .35) * (1 - e) + 160 * e, 47 + 4 * e); }, () => {
        next.src = src(id('log')); next.style.opacity = 0;
        tween(200, t => { next.style.opacity = t; canvas.style.opacity = 1 - t; }, () => later(opts.done, 60));
      });
    }
  }
  function shine() {
    if (reducedMotion()) return;
    for (let i = 0; i < 5; i++) later(() => { const p = particle('sparkle', SHEET.x + Math.random() * SHEET.w, SHEET.y + Math.random() * SHEET.h); later(() => p.remove(), 700); }, i * 70);
  }

  // ----- per-step setup -----
  function setup() {
    stage.dataset.step = step;
    next.style.opacity = 0;
    if (step === 'select') { setBase('dough-classic-cinnamon-ball'); base.style.opacity = .25; }
    else if (step === 'flatten') { setBase(id('ball')); next.src = src(id('sheet')); drawFlatten(); }
    else if (step === 'butter' || step === 'fill') {
      setBase(id(step === 'butter' ? 'sheet' : 'buttered'));
      nextArt = new Image(); nextArt.onload = paintReveal;
      if (step === 'butter' || r.filling) nextArt.src = src(id(step === 'butter' ? 'buttered' : 'filled'));
      for (let k = 0; k < r.work; k++) stampBand(k);
    } else if (step === 'roll') { setBase(id('filled')); if (state.p > 0) drawRoll(); }
    else if (step === 'slice') { setBase(id('log')); next.src = src(id('sliced')); }
    else if (step === 'ready') { setBase(`roll-${r.dough}-${r.filling}-raw`); stage.classList.add('ready'); }
    if (entrance) stage.classList.add('enter-' + entrance);
    if (entrance === 'plop') later(() => puff(150, 220, 12), reducedMotion() ? 0 : 330);
    if (entrance === 'pour' && step === 'fill') for (let i = 0; i < 6; i++) later(() => sprinkle(SHEET.x + 40 + Math.random() * (SHEET.w - 80), SHEET.y + 20 + Math.random() * (SHEET.h - 40)), i * 50);
    sizeTool(); restTool();
    requestAnimationFrame(() => { if (alive) { sizeTool(); restTool(); } });
  }

  // ----- pointer work -----
  function canWork() { return !busy && count && !(step === 'fill' && !r.filling); }
  function begin(e) {
    if (!canWork()) { if (step === 'fill' && !r.filling) opts.needFilling(); return false; }
    const {x, y} = toStage(e.clientX, e.clientY);
    pointer = e.pointerId;
    Object.assign(state, {lastX: x, lastY: y, tilt: 0});
    tool.classList.remove('resting'); tool.classList.add('active');
    if (step === 'fill') tool.classList.add('shaking');
    move(e);
    return true;
  }
  function move(e) {
    if (e.pointerId !== pointer || busy) return;
    const {x, y} = toStage(e.clientX, e.clientY);
    workAt(x, y);
  }
  function workAt(x, y) {
    const dx = x - state.lastX, dy = y - state.lastY;
    state.tilt = state.tilt * .7 + clamp(dx * 1.2, -18, 18) * .3;
    if (step === 'flatten') {
      const onDough = x > 20 && x < 280 && y > 40 && y < 250;
      if (onDough) {
        state.dist += Math.abs(dy) + Math.abs(dx) * .35;
        state.roll += dy;
        if (grain) grain.style.backgroundPositionY = state.roll * scale() + 'px';
        if (Math.random() < Math.min(.6, Math.abs(dy) / 30)) puff(x + (Math.random() < .5 ? -110 : 110), y + 6, 1);
      }
      while (state.dist >= FLATTEN_PASS && r.step === step) {
        state.dist -= FLATTEN_PASS;
        if (advance() === 'done') return;
        stage.classList.remove('squish'); void stage.offsetWidth; stage.classList.add('squish');
      }
      state.f = (r.work + state.dist / FLATTEN_PASS) / count;
      drawFlatten();
      placeTool(x, clamp(y, 30, 250), state.tilt * .35);
    } else if (step === 'butter') {
      smear(state.lastX, state.lastY, x, y, 30);
      paintReveal(); settle();
      if (Math.hypot(dx, dy) > 18 && Math.random() < .3) { const p = particle('sparkle', x, y); later(() => p.remove(), 700); }
      placeTool(x, y, toolDef.angle + state.tilt);
    } else if (step === 'fill') {
      const now = performance.now();
      if (now - state.lastEmit > (Math.hypot(dx, dy) > 3 ? 40 : 110)) { state.lastEmit = now; sprinkle(x, y); }
      placeTool(x, y, toolDef.angle + state.tilt * .6);
    } else if (step === 'roll') {
      const target = clamp((230 - y) / (230 - 72));
      const before = state.p;
      state.p = Math.max(state.p, Math.min(target, state.p + .06));
      state.roll += (state.p - before) * 160;
      if (state.p > before && Math.random() < .25) puff(70 + Math.random() * 170, 230 - state.p * 158, 1);
      drawRoll();
      const edge = 230 - state.p * 158, radius = 9 + state.p * 38;
      placeTool(clamp(x, 80, 230), edge - radius * .35 + radius + 4, 180 + state.tilt * .4);
      const target2 = state.p >= .98 ? 2 : state.p >= .5 ? 1 : 0;
      while (r.step === step && r.work < target2) if (advance() === 'done') return;
      reportPartial();
      state.lastX = x; state.lastY = y;
      return;
    }
    state.lastX = x; state.lastY = y;
    reportPartial();
  }
  function end(e) {
    if (e.pointerId !== pointer) return;
    pointer = null;
    if (busy) return;
    tool.classList.remove('active', 'shaking'); tool.classList.add('resting');
    restTool();
  }

  // Button / keyboard path: play one stroke along a scripted path, then make sure it counted.
  function auto() {
    if (busy && r.step === step && count) { queued = Math.min(queued + 1, count - r.work); return; }
    if (!canWork()) { if (step === 'fill' && !r.filling) opts.needFilling(); return; }
    busy = true;
    const workBefore = r.work, k = r.work;
    tool.classList.remove('resting'); tool.classList.add('active');
    if (step === 'fill') tool.classList.add('shaking');
    let path;
    if (step === 'flatten') { const down = k % 2 === 0; path = t => ({x: 150, y: down ? 95 + t * (FLATTEN_PASS + 2) : 207 - t * (FLATTEN_PASS + 2)}); }
    else if (step === 'roll') { const from = state.p, to = k === 0 ? .5 : 1; path = t => ({x: 150 + Math.sin(t * Math.PI) * 30, y: 230 - (from + (to - from) * t) * 158}); }
    else {
      const y0 = SHEET.y + k / count * SHEET.h + 8, band = SHEET.h / count - 16;
      path = t => { const zig = t * 3, row = Math.min(2, Math.floor(zig)), u = zig - row; return {x: SHEET.x + 8 + (row % 2 ? 1 - u : u) * (SHEET.w - 16), y: y0 + (row + u) / 3 * band}; };
    }
    const start = path(0); Object.assign(state, {lastX: start.x, lastY: start.y});
    const ms = step === 'roll' ? 520 : 650;
    tween(ms, t => { if (r.step === step && r.work === workBefore) { const p = path(t); workAt(p.x, p.y); } }, () => {
      if (r.step !== step) return; // finishStep already took over
      if (step === 'butter' || step === 'fill') { stampBand(k); paintReveal(); }
      if (step === 'roll') state.p = Math.max(state.p, k === 0 ? .5 : 1);
      if (step === 'flatten') state.dist = 0;
      if (r.work === workBefore) { if (advance() === 'done') return; }
      if (step === 'flatten') { state.f = r.work / count; drawFlatten(); }
      if (step === 'roll') drawRoll();
      reportPartial();
      busy = false;
      if (queued > 0) { queued--; auto(); return; }
      tool.classList.remove('active', 'shaking'); tool.classList.add('resting'); restTool();
    });
  }

  function setSlice(position) {
    if (step !== 'slice' || busy || !tool) return;
    tool.classList.remove('resting');
    placeTool(72 + position * 170, 88);
  }
  function chop(position, done) {
    if (step !== 'slice') { done(); return; }
    busy = true;
    const x = 72 + position * 170;
    tool.classList.add('chopping');
    tween(110, t => placeTool(x, 88 + ease(t) * 122), () => {
      stage.classList.add('thunk');
      next.style.opacity = 1; base.style.opacity = 0;
      puff(x, 205, 9, 'crumb');
      later(() => tween(220, t => placeTool(x, 210 - ease(t) * 122), () => later(done, 260)), 90);
    });
  }

  function onResize() { sizeTool(); if (!pointer && !busy) restTool(); }
  window.addEventListener('resize', onResize);
  setup();

  return {
    begin, move, end, auto, chop, setSlice,
    get busy() { return busy; },
    destroy() {
      alive = false;
      timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame);
      window.removeEventListener('resize', onResize);
    },
  };

  function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function img(cls) { const n = el('img', cls); n.alt = ''; n.draggable = false; return n; }
}

function roundRect(c, x, y, w, h, rad) {
  rad = Math.min(rad, h / 2, w / 2);
  c.beginPath();
  c.moveTo(x + rad, y); c.arcTo(x + w, y, x + w, y + h, rad); c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad); c.arcTo(x, y, x + w, y, rad); c.closePath();
}
