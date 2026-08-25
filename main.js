/* ═══════════════════════════════════════════
   SIGNAL-IQ — main.js
   Taste-Skill Interactive Logic & Simulator Engine
   ═══════════════════════════════════════════ */

// ── Utility ──
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const ease = t => 1 - Math.pow(1 - t, 3); // easeOutCubic

// ═══════════════════════════════════════════
// 1. STAT COUNTER ANIMATION
// ═══════════════════════════════════════════
function initCounters() {
  const els = $$('.stat-val[data-target]');
  let fired = false;

  const obs = new IntersectionObserver(entries => {
    if (fired) return;
    for (const e of entries) {
      if (e.isIntersecting) {
        fired = true;
        els.forEach((el, i) => {
          const target = parseFloat(el.dataset.target);
          const suffix = el.dataset.suffix || '';
          const dec = parseInt(el.dataset.decimals) || 0;
          const dur = 1500 + i * 80;
          const offset = 480 + i * 90;
          setTimeout(() => animateCounter(el, target, suffix, dec, dur), offset);
        });
        obs.disconnect();
      }
    }
  }, { threshold: 0.25 });

  els.forEach(el => obs.observe(el));
}

function animateCounter(el, target, suffix, decimals, duration) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const val = ease(t) * target;
    el.textContent = val.toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ═══════════════════════════════════════════
// 2. KPI COUNTER ANIMATION (dashboard)
// ═══════════════════════════════════════════
function initKpiCounters() {
  const els = $$('.kpi-val[data-target]');
  let fired = false;
  const obs = new IntersectionObserver(entries => {
    if (fired) return;
    for (const e of entries) {
      if (e.isIntersecting) {
        fired = true;
        els.forEach((el, i) => {
          const target = parseFloat(el.dataset.target);
          const suffix = el.dataset.suffix || '';
          setTimeout(() => animateCounter(el, target, suffix, 0, 1200), 200 + i * 100);
        });
        obs.disconnect();
      }
    }
  }, { threshold: 0.25 });
  els.forEach(el => obs.observe(el));
}

// ═══════════════════════════════════════════
// 3. MOBILE MENU
// ═══════════════════════════════════════════
function initMobileMenu() {
  const burger = $('.burger');
  const overlay = $('.overlay');
  const menu = $('.mobile-menu');
  if (!burger || !overlay || !menu) return;

  function open() {
    burger.setAttribute('aria-expanded', 'true');
    overlay.hidden = false;
    menu.hidden = false;
    document.body.classList.add('menu-open');
  }
  function close() {
    burger.setAttribute('aria-expanded', 'false');
    overlay.hidden = true;
    menu.hidden = true;
    document.body.classList.remove('menu-open');
  }

  burger.addEventListener('click', () => {
    burger.getAttribute('aria-expanded') === 'true' ? close() : open();
  });
  overlay.addEventListener('click', close);
  $$('.mm-link', menu).forEach(l => l.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) close(); });
}

// ═══════════════════════════════════════════
// 4. INTERSECTION SIMULATOR ENGINE
// ═══════════════════════════════════════════

const VEHICLE_COLORS = ['#2563EB', '#0891B2', '#7C3AED', '#D97706', '#64748B'];

class TrafficSim {
  constructor(canvasId, mode) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.mode = mode; // 'fixed' | 'adaptive'

    // Density per direction
    this.density = { N: 'medium', S: 'medium', E: 'medium', W: 'medium' };

    // Vehicles
    this.vehicles = [];
    this.nextId = 0;

    // Signal state: 0=N Gr, 1=N Yel, 2=E Gr, 3=E Yel, 4=S Gr, 5=S Yel, 6=W Gr, 7=W Yel
    this.phase = 0;
    this.phaseStart = Date.now();
    this.phaseDurations = mode === 'fixed'
      ? [15000, 3000, 15000, 3000, 15000, 3000, 15000, 3000]
      : [15000, 3000, 15000, 3000, 15000, 3000, 15000, 3000];

    this.emergencyActive = false;

    // Spawn timers
    this.spawnTimers = { N: 0, S: 0, E: 0, W: 0 };

    // Metrics
    this.totalWait = 0;
    this.totalWaited = 0;
    this.totalCleared = 0;
    this.clearLog = [];
    this.startTime = Date.now();

    // Layout
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Start rendering loop
    this.running = true;
    this.loop();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = rect.width;
    let h = rect.height;
    if (!w || w < 50) {
      const parentRect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
      w = (parentRect && parentRect.width > 50) ? parentRect.width : 540;
      h = (parentRect && parentRect.height > 50) ? parentRect.height : 380;
    }
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.roadW = this.w * 0.15;
    this.cx = this.w / 2;
    this.cy = this.h / 2;
    this.laneW = this.roadW / 2;
    this.vLen = this.laneW * 0.75;
    this.vWid = this.laneW * 0.52;
    this.stopDist = this.roadW * 0.6;
  }

  getSpawnInterval(level) {
    switch (level) {
      case 'low':    return 2400 + Math.random() * 800;
      case 'medium': return 1000 + Math.random() * 600;
      case 'high':   return 380 + Math.random() * 250;
    }
    return 1200;
  }

  isGreen(dir) {
    if (this.phase === 0) return dir === 'N';
    if (this.phase === 2) return dir === 'E';
    if (this.phase === 4) return dir === 'S';
    if (this.phase === 6) return dir === 'W';
    return false;
  }

  isYellow(dir) {
    if (this.phase === 1) return dir === 'N';
    if (this.phase === 3) return dir === 'E';
    if (this.phase === 5) return dir === 'S';
    if (this.phase === 7) return dir === 'W';
    return false;
  }

  updateSignal() {
    const now = Date.now();
    const elapsed = now - this.phaseStart;

    if (this.mode === 'adaptive') {
      // Check emergency vehicle priority
      const hasEmergency = this.vehicles.some(v => v.isEmergency);
      if (hasEmergency) {
        const emV = this.vehicles.find(v => v.isEmergency);
        let targetPhase = 0;
        if (emV.dir === 'N') targetPhase = 0;
        if (emV.dir === 'E') targetPhase = 2;
        if (emV.dir === 'S') targetPhase = 4;
        if (emV.dir === 'W') targetPhase = 6;
        
        if (this.phase !== targetPhase) {
          this.phase = targetPhase;
          this.phaseStart = now;
          this.phaseDurations[targetPhase] = 30000;
        }
      } else if (this.phase % 2 === 0) {
        // Dynamically adjust current green duration via real-time queue ratio
        const nQ = this.vehicles.filter(v => v.dir === 'N' && v.waiting).length;
        const eQ = this.vehicles.filter(v => v.dir === 'E' && v.waiting).length;
        const sQ = this.vehicles.filter(v => v.dir === 'S' && v.waiting).length;
        const wQ = this.vehicles.filter(v => v.dir === 'W' && v.waiting).length;
        const totalQ = nQ + eQ + sQ + wQ || 1;

        this.phaseDurations[0] = Math.max(8000, Math.min(48000, (nQ / totalQ) * 50000 + 6000));
        this.phaseDurations[2] = Math.max(8000, Math.min(48000, (eQ / totalQ) * 50000 + 6000));
        this.phaseDurations[4] = Math.max(8000, Math.min(48000, (sQ / totalQ) * 50000 + 6000));
        this.phaseDurations[6] = Math.max(8000, Math.min(48000, (wQ / totalQ) * 50000 + 6000));
      }
    }

    if (elapsed >= this.phaseDurations[this.phase]) {
      this.phase = (this.phase + 1) % 8;
      this.phaseStart = now;
    }
  }

  spawnVehicles() {
    const now = Date.now();
    for (const dir of ['N', 'S', 'E', 'W']) {
      if (now - this.spawnTimers[dir] > this.getSpawnInterval(this.density[dir])) {
        this.spawnTimers[dir] = now;
        this.spawnVehicle(dir);
      }
    }
  }

  spawnVehicle(dir, isEmergency = false) {
    const col = isEmergency ? '#ffffff' : VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
    let x, y, vx = 0, vy = 0;
    const speed = isEmergency ? 2.4 : (1.2 + Math.random() * 0.6);

    switch (dir) {
      case 'N':
        x = this.cx + this.laneW / 2;
        y = -this.vLen;
        vy = speed;
        break;
      case 'S':
        x = this.cx - this.laneW / 2;
        y = this.h + this.vLen;
        vy = -speed;
        break;
      case 'E':
        x = this.w + this.vLen;
        y = this.cy + this.laneW / 2;
        vx = -speed;
        break;
      case 'W':
        x = -this.vLen;
        y = this.cy - this.laneW / 2;
        vx = speed;
        break;
    }

    this.vehicles.push({
      id: this.nextId++,
      x, y, vx, vy, dir, col,
      baseSpeed: speed,
      waiting: false,
      waitStart: 0,
      cleared: false,
      isEmergency
    });
  }

  getStopLine(dir) {
    switch (dir) {
      case 'N': return this.cy - this.roadW - this.stopDist;
      case 'S': return this.cy + this.roadW + this.stopDist;
      case 'E': return this.cx + this.roadW + this.stopDist;
      case 'W': return this.cx - this.roadW - this.stopDist;
    }
  }

  shouldStop(v) {
    if (this.isGreen(v.dir)) return false;
    const sl = this.getStopLine(v.dir);
    const gap = 4;
    switch (v.dir) {
      case 'N': return v.y + this.vLen + gap >= sl && v.y < this.cy;
      case 'S': return v.y - this.vLen - gap <= sl && v.y > this.cy;
      case 'E': return v.x - this.vLen - gap <= sl && v.x > this.cx;
      case 'W': return v.x + this.vLen + gap >= sl && v.x < this.cx;
    }
    return false;
  }

  moveVehicles() {
    const now = Date.now();

    for (const v of this.vehicles) {
      const mustStop = this.shouldStop(v);

      let blocked = false;
      for (const other of this.vehicles) {
        if (other.id === v.id || other.dir !== v.dir) continue;
        const gap = this.vLen + 4;
        switch (v.dir) {
          case 'N':
            if (other.y > v.y && other.y - v.y < gap * 2 && (other.waiting || (other.vy === 0 && other.y < this.cy + this.roadW)))
              blocked = true;
            break;
          case 'S':
            if (other.y < v.y && v.y - other.y < gap * 2 && (other.waiting || (other.vy === 0 && other.y > this.cy - this.roadW)))
              blocked = true;
            break;
          case 'E':
            if (other.x < v.x && v.x - other.x < gap * 2 && (other.waiting || (other.vx === 0 && other.x > this.cx - this.roadW)))
              blocked = true;
            break;
          case 'W':
            if (other.x > v.x && other.x - v.x < gap * 2 && (other.waiting || (other.vx === 0 && other.x < this.cx + this.roadW)))
              blocked = true;
            break;
        }
      }

      if (mustStop || blocked) {
        if (!v.waiting) {
          v.waiting = true;
          v.waitStart = now;
        }
        switch (v.dir) {
          case 'N': case 'S': v.vy = 0; break;
          case 'E': case 'W': v.vx = 0; break;
        }
      } else {
        if (v.waiting) {
          this.totalWait += (now - v.waitStart);
          this.totalWaited++;
          v.waiting = false;
        }
        switch (v.dir) {
          case 'N': v.vy = v.baseSpeed; break;
          case 'S': v.vy = -v.baseSpeed; break;
          case 'E': v.vx = -v.baseSpeed; break;
          case 'W': v.vx = v.baseSpeed; break;
        }
      }

      v.x += v.vx;
      v.y += v.vy;
    }

    // Remove off-screen vehicles
    this.vehicles = this.vehicles.filter(v => {
      const offScreen = v.x < -60 || v.x > this.w + 60 || v.y < -60 || v.y > this.h + 60;
      const pastCenter = (
        (v.dir === 'N' && v.y > this.cy + this.roadW * 2) ||
        (v.dir === 'S' && v.y < this.cy - this.roadW * 2) ||
        (v.dir === 'E' && v.x < this.cx - this.roadW * 2) ||
        (v.dir === 'W' && v.x > this.cx + this.roadW * 2)
      );
      if (offScreen && pastCenter) {
        this.totalCleared++;
        this.clearLog.push(now);
        return false;
      }
      return !offScreen;
    });
  }

  getMetrics() {
    const now = Date.now();
    this.clearLog = this.clearLog.filter(t => now - t < 60000);
    const waiting = this.vehicles.filter(v => v.waiting).length;
    const avgWait = this.totalWaited > 0 ? (this.totalWait / this.totalWaited / 1000) : 0;
    return {
      avgWait: avgWait.toFixed(1) + 's',
      queue: waiting,
      clearedMin: this.clearLog.length,
      throughput: this.totalCleared,
    };
  }

  draw() {
    const ctx = this.ctx;
    const w = this.w, h = this.h;

    // Background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, w, h);

    // Roads
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(this.cx - this.roadW, 0, this.roadW * 2, h);
    ctx.fillRect(0, this.cy - this.roadW, w, this.roadW * 2);

    // Intersection center
    ctx.fillStyle = '#293548';
    ctx.fillRect(this.cx - this.roadW, this.cy - this.roadW, this.roadW * 2, this.roadW * 2);

    // Center lane dashes
    ctx.setLineDash([8, 12]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.cx, 0); ctx.lineTo(this.cx, this.cy - this.roadW);
    ctx.moveTo(this.cx, this.cy + this.roadW); ctx.lineTo(this.cx, h);
    ctx.moveTo(0, this.cy); ctx.lineTo(this.cx - this.roadW, this.cy);
    ctx.moveTo(this.cx + this.roadW, this.cy); ctx.lineTo(w, this.cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stop lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(this.cx, this.cy - this.roadW - 2); ctx.lineTo(this.cx + this.roadW, this.cy - this.roadW - 2);
    ctx.moveTo(this.cx - this.roadW, this.cy + this.roadW + 2); ctx.lineTo(this.cx, this.cy + this.roadW + 2);
    ctx.moveTo(this.cx + this.roadW + 2, this.cy); ctx.lineTo(this.cx + this.roadW + 2, this.cy + this.roadW);
    ctx.moveTo(this.cx - this.roadW - 2, this.cy - this.roadW); ctx.lineTo(this.cx - this.roadW - 2, this.cy);
    ctx.stroke();

    // Draw Signal Lights
    this.drawLight('N');
    this.drawLight('S');
    this.drawLight('E');
    this.drawLight('W');

    // Draw Vehicles
    for (const v of this.vehicles) {
      ctx.fillStyle = v.col;
      const isVert = v.dir === 'N' || v.dir === 'S';
      const vw = isVert ? this.vWid : this.vLen;
      const vh = isVert ? this.vLen : this.vWid;
      ctx.beginPath();
      this.roundRect(ctx, v.x - vw/2, v.y - vh/2, vw, vh, 4);
      ctx.fill();

      // Emergency vehicle flashing strobe light
      if (v.isEmergency) {
        ctx.fillStyle = (Date.now() % 300 < 150) ? '#DC2626' : '#2563EB';
        ctx.beginPath();
        ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawLight(dir) {
    const ctx = this.ctx;
    const r = 6;
    let x, y;
    const offset = this.roadW + 12;

    switch (dir) {
      case 'N': x = this.cx + this.roadW + 8; y = this.cy - offset; break;
      case 'S': x = this.cx - this.roadW - 8; y = this.cy + offset; break;
      case 'E': x = this.cx + offset; y = this.cy + this.roadW + 8; break;
      case 'W': x = this.cx - offset; y = this.cy - this.roadW - 8; break;
    }

    let color = '#DC2626';
    if (this.isGreen(dir)) color = '#16A34A';
    else if (this.isYellow(dir)) color = '#D97706';

    // Glow halo
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = color + '33';
    ctx.fill();

    // Solid light
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  roundRect(ctx, x, y, w, h, rad) {
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
  }

  update() {
    this.updateSignal();
    this.spawnVehicles();
    this.moveVehicles();
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }

  setDensity(dir, level) {
    this.density[dir] = level;
  }

  reset() {
    this.vehicles = [];
    this.phase = 0;
    this.phaseStart = Date.now();
    this.totalWait = 0;
    this.totalWaited = 0;
    this.totalCleared = 0;
    this.clearLog = [];
    this.startTime = Date.now();
    this.spawnTimers = { N: 0, S: 0, E: 0, W: 0 };
  }
}

// ── Initialize simulators ──
let simFixed = null;
let simAdaptive = null;

function initSimulators() {
  const cf = document.getElementById('canvas-fixed');
  const ca = document.getElementById('canvas-adaptive');
  if (!cf || !ca) return;

  simFixed = new TrafficSim('canvas-fixed', 'fixed');
  simAdaptive = new TrafficSim('canvas-adaptive', 'adaptive');

  // Metrics update loop
  setInterval(() => {
    if (!simFixed || !simAdaptive) return;
    const mf = simFixed.getMetrics();
    const ma = simAdaptive.getMetrics();

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('m-fixed-wait', mf.avgWait);
    setTxt('m-fixed-queue', mf.queue);
    setTxt('m-fixed-cleared', mf.clearedMin);
    setTxt('m-fixed-throughput', mf.throughput);
    setTxt('m-adaptive-wait', ma.avgWait);
    setTxt('m-adaptive-queue', ma.queue);
    setTxt('m-adaptive-cleared', ma.clearedMin);
    setTxt('m-adaptive-throughput', ma.throughput);

    updateAIPanel();
  }, 500);

  // Density controls
  $$('.density-group select').forEach(sel => {
    sel.addEventListener('change', () => {
      const dir = sel.dataset.dir;
      const val = sel.value;
      simFixed.setDensity(dir, val);
      simAdaptive.setDensity(dir, val);
    });
  });

  // Randomize Button
  const randBtn = document.getElementById('randomize-btn');
  if (randBtn) {
    randBtn.addEventListener('click', () => {
      const levels = ['low', 'medium', 'high'];
      $$('.density-group select').forEach(sel => {
        const lvl = levels[Math.floor(Math.random() * 3)];
        sel.value = lvl;
        const dir = sel.dataset.dir;
        simFixed.setDensity(dir, lvl);
        simAdaptive.setDensity(dir, lvl);
      });
    });
  }

  // Reset Button
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      simFixed.reset();
      simAdaptive.reset();
    });
  }

  // Rush Hour Surge Button
  const rushBtn = document.getElementById('btn-rush-hour');
  if (rushBtn) {
    rushBtn.addEventListener('click', () => {
      $$('.density-group select').forEach(sel => {
        const dir = sel.dataset.dir;
        const lvl = (dir === 'E' || dir === 'W') ? 'high' : 'medium';
        sel.value = lvl;
        simFixed.setDensity(dir, lvl);
        simAdaptive.setDensity(dir, lvl);
      });
      // Spawn wave immediately
      for (let i = 0; i < 6; i++) {
        simFixed.spawnVehicle('E');
        simFixed.spawnVehicle('W');
        simAdaptive.spawnVehicle('E');
        simAdaptive.spawnVehicle('W');
      }
    });
  }

  // Emergency Priority Button
  const emergBtn = document.getElementById('btn-emergency');
  if (emergBtn) {
    emergBtn.addEventListener('click', () => {
      simFixed.spawnVehicle('N', true);
      simAdaptive.spawnVehicle('N', true);
    });
  }
}

// ═══════════════════════════════════════════
// 5. AI ENGINE PANEL UPDATE
// ═══════════════════════════════════════════
function updateAIPanel() {
  if (!simAdaptive) return;

  const dirMap = { N: 'ai-n', S: 'ai-s', E: 'ai-e', W: 'ai-w' };
  for (const [dir, id] of Object.entries(dirMap)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const q = simAdaptive.vehicles.filter(v => v.dir === dir && v.waiting).length;
    const all = simAdaptive.vehicles.filter(v => v.dir === dir).length;
    let level = 'Low';
    let barClass = 'low';
    if (all > 6 || q > 4) { level = 'High'; barClass = 'high'; }
    else if (all > 3 || q > 2) { level = 'Medium'; barClass = 'med'; }
    el.textContent = level;
    
    const bar = el.closest('.lane-item')?.querySelector('.lane-bar');
    if (bar) {
      bar.className = 'lane-bar ' + barClass;
    }
  }

  // Phase recommendations
  const nsD = (simAdaptive.phaseDurations[0] + simAdaptive.phaseDurations[4]) / 1000;
  const ewD = (simAdaptive.phaseDurations[2] + simAdaptive.phaseDurations[6]) / 1000;
  const nsEl = document.getElementById('ai-ns');
  const ewEl = document.getElementById('ai-ew');
  const nsBar = document.getElementById('ai-ns-bar');
  const ewBar = document.getElementById('ai-ew-bar');
  if (nsEl) nsEl.textContent = nsD.toFixed(0) + 's';
  if (ewEl) ewEl.textContent = ewD.toFixed(0) + 's';
  if (nsBar) nsBar.style.width = Math.min(100, (nsD / 100 * 100)) + '%';
  if (ewBar) ewBar.style.width = Math.min(100, (ewD / 100 * 100)) + '%';

  // Confidence
  const conf = document.getElementById('ai-conf');
  if (conf) {
    const base = 93 + Math.random() * 5;
    conf.textContent = base.toFixed(1) + '%';
  }
}

// ═══════════════════════════════════════════
// 6. 24-HOUR CHART.JS COMPARISON
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// 6. TIER-1 INDIAN METROPOLITAN DATASET & 24H CHART
// ═══════════════════════════════════════════

const TIER1_CITIES = {
  delhi: {
    name: 'Delhi NCR',
    center: [28.6139, 77.2090],
    zoom: 12,
    kpi: { wait: 42, delay: '-18.4s avg delay', throughput: 31, veh: '+110 veh/hour', co2: '-4,120 kg CO₂/day', fuel: '-1,850 L/day' },
    fixedWait: [25, 22, 18, 15, 14, 16, 28, 52, 68, 58, 45, 48, 55, 50, 42, 38, 45, 62, 72, 55, 42, 35, 30, 27],
    adaptiveWait: [12, 10, 8, 7, 7, 8, 14, 29, 36, 30, 24, 25, 29, 26, 22, 20, 24, 33, 38, 28, 22, 18, 15, 13],
    corridors: [
      { path: [[28.6315, 77.2167], [28.6289, 77.2410], [28.5672, 77.2100]], color: '#2563EB', dash: '6, 8' },
      { path: [[28.5921, 77.1691], [28.4800, 77.0500]], color: '#16A34A', dash: null }
    ],
    junctions: [
      { id: 'del-cp', name: 'Connaught Place Outer Circle', coords: [28.6315, 77.2167], status: 'Coordinated Flow', badgeClass: 'green', wait: '14.2s', throughput: '168 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'medium', E: 'low', W: 'medium' } },
      { id: 'del-ito', name: 'ITO Intersection (Ring Rd)', coords: [28.6289, 77.2410], status: 'High Traffic Surge', badgeClass: 'red', wait: '44.6s', throughput: '78 veh/h', cams: '6 Live Cams', mode: 'Legacy Baseline', density: { N: 'high', S: 'high', E: 'high', W: 'medium' } },
      { id: 'del-aiims', name: 'AIIMS Ring Road Flyover', coords: [28.5672, 77.2100], status: 'Moderate Flow', badgeClass: 'yellow', wait: '24.1s', throughput: '124 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'medium', S: 'medium', E: 'high', W: 'low' } },
      { id: 'del-dhaula', name: 'Dhaula Kuan Interchange', coords: [28.5921, 77.1691], status: 'Green Wave Corridor', badgeClass: 'green', wait: '9.8s', throughput: '190 veh/h', cams: '5 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'low', W: 'medium' } },
      { id: 'del-nh48', name: 'NH-48 Cyber City Corridor', coords: [28.4800, 77.0500], status: 'Free Flow AI', badgeClass: 'green', wait: '8.5s', throughput: '210 veh/h', cams: '6 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'low', W: 'low' } }
    ]
  },
  bengaluru: {
    name: 'Bengaluru',
    center: [12.9650, 77.6200],
    zoom: 12,
    kpi: { wait: 48, delay: '-22.6s avg delay', throughput: 36, veh: '+140 veh/hour', co2: '-5,280 kg CO₂/day', fuel: '-2,410 L/day' },
    fixedWait: [20, 18, 15, 12, 12, 18, 35, 68, 85, 74, 52, 50, 58, 54, 48, 44, 56, 78, 88, 64, 48, 38, 30, 24],
    adaptiveWait: [10, 9, 7, 6, 6, 9, 18, 36, 42, 38, 27, 26, 30, 28, 25, 23, 29, 40, 44, 32, 25, 20, 15, 12],
    corridors: [
      { path: [[12.9177, 77.6238], [12.9352, 77.6245], [12.9734, 77.6205]], color: '#2563EB', dash: '6, 8' },
      { path: [[12.9569, 77.7011], [12.9352, 77.6245]], color: '#16A34A', dash: null }
    ],
    junctions: [
      { id: 'blr-silk', name: 'Silk Board Junction (Bottleneck)', coords: [12.9177, 77.6238], status: 'Peak Congestion', badgeClass: 'red', wait: '52.4s', throughput: '64 veh/h', cams: '6 Live Cams', mode: 'Legacy Baseline', density: { N: 'high', S: 'high', E: 'high', W: 'high' } },
      { id: 'blr-sony', name: 'Sony World Signal (Koramangala)', coords: [12.9352, 77.6245], status: 'Adaptive Split', badgeClass: 'yellow', wait: '21.5s', throughput: '132 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'medium', S: 'medium', E: 'medium', W: 'high' } },
      { id: 'blr-marath', name: 'Marathahalli Outer Ring Rd', coords: [12.9569, 77.7011], status: 'Green Wave Active', badgeClass: 'green', wait: '11.8s', throughput: '175 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'medium', E: 'low', W: 'low' } },
      { id: 'blr-hebbal', name: 'Hebbal Flyover Junction', coords: [13.0358, 77.5970], status: 'Optimal Flow', badgeClass: 'green', wait: '13.2s', throughput: '188 veh/h', cams: '5 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'medium', W: 'low' } },
      { id: 'blr-trinity', name: 'Trinity Circle (MG Road)', coords: [12.9734, 77.6205], status: 'Optimized Wave', badgeClass: 'green', wait: '10.4s', throughput: '158 veh/h', cams: '3 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'low', W: 'low' } }
    ]
  },
  mumbai: {
    name: 'Mumbai',
    center: [19.0400, 72.8600],
    zoom: 12,
    kpi: { wait: 45, delay: '-20.1s avg delay', throughput: 34, veh: '+128 veh/hour', co2: '-4,890 kg CO₂/day', fuel: '-2,150 L/day' },
    fixedWait: [22, 18, 16, 14, 14, 18, 32, 64, 78, 68, 50, 52, 56, 52, 46, 42, 52, 70, 82, 60, 46, 36, 28, 24],
    adaptiveWait: [11, 9, 8, 7, 7, 9, 16, 32, 39, 34, 26, 27, 29, 27, 24, 22, 27, 36, 41, 30, 24, 19, 14, 12],
    corridors: [
      { path: [[19.0330, 72.8170], [19.0600, 72.8650], [19.1136, 72.8697]], color: '#2563EB', dash: '6, 8' },
      { path: [[18.9774, 72.8105], [19.0178, 72.8478]], color: '#16A34A', dash: null }
    ],
    junctions: [
      { id: 'mum-bkc', name: 'BKC Connector Junction', coords: [19.0600, 72.8650], status: 'RL Optimized Flow', badgeClass: 'green', wait: '11.5s', throughput: '185 veh/h', cams: '5 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'medium', E: 'low', W: 'medium' } },
      { id: 'mum-bwsl', name: 'Bandra-Worli Sea Link Toll Plaza', coords: [19.0330, 72.8170], status: 'High Throughput', badgeClass: 'green', wait: '8.9s', throughput: '220 veh/h', cams: '6 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'low', W: 'low' } },
      { id: 'mum-dadar', name: 'Dadar TT Circle (Central Hub)', coords: [19.0178, 72.8478], status: 'Heavy Density', badgeClass: 'red', wait: '48.2s', throughput: '72 veh/h', cams: '4 Live Cams', mode: 'Legacy Baseline', density: { N: 'high', S: 'high', E: 'high', W: 'medium' } },
      { id: 'mum-andheri', name: 'Andheri WEH Flyover Interchange', coords: [19.1136, 72.8697], status: 'Moderate Flow', badgeClass: 'yellow', wait: '25.6s', throughput: '114 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'medium', S: 'medium', E: 'high', W: 'low' } },
      { id: 'mum-haji', name: 'Haji Ali Seaface Signal', coords: [18.9774, 72.8105], status: 'Green Wave Flow', badgeClass: 'green', wait: '13.4s', throughput: '145 veh/h', cams: '3 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'medium', W: 'low' } }
    ]
  },
  hyderabad: {
    name: 'Hyderabad',
    center: [17.4350, 78.3950],
    zoom: 12,
    kpi: { wait: 39, delay: '-16.8s avg delay', throughput: 29, veh: '+98 veh/hour', co2: '-3,850 kg CO₂/day', fuel: '-1,720 L/day' },
    fixedWait: [20, 16, 14, 12, 12, 15, 26, 48, 62, 54, 42, 44, 48, 45, 38, 35, 42, 56, 68, 50, 38, 30, 25, 22],
    adaptiveWait: [10, 8, 7, 6, 6, 8, 13, 24, 31, 27, 21, 22, 24, 23, 19, 18, 21, 28, 34, 25, 19, 15, 13, 11],
    corridors: [
      { path: [[17.4483, 78.3800], [17.4399, 78.3489], [17.4325, 78.4070]], color: '#2563EB', dash: '6, 8' }
    ],
    junctions: [
      { id: 'hyd-cyber', name: 'Hitec City Cyber Towers Junction', coords: [17.4483, 78.3800], status: 'Adaptive AI Wave', badgeClass: 'green', wait: '12.1s', throughput: '178 veh/h', cams: '5 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'medium', E: 'low', W: 'low' } },
      { id: 'hyd-gachi', name: 'Gachibowli Outer Ring Rd Signal', coords: [17.4399, 78.3489], status: 'Free Flow AI', badgeClass: 'green', wait: '9.4s', throughput: '195 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'low', W: 'low' } },
      { id: 'hyd-jubilee', name: 'Jubilee Hills Checkpost', coords: [17.4325, 78.4070], status: 'Moderate Surge', badgeClass: 'yellow', wait: '23.8s', throughput: '120 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'medium', S: 'medium', E: 'high', W: 'low' } },
      { id: 'hyd-panja', name: 'Panjagutta Central Flyover', coords: [17.4265, 78.4528], status: 'High Queue Area', badgeClass: 'red', wait: '39.8s', throughput: '86 veh/h', cams: '4 Live Cams', mode: 'Legacy Baseline', density: { N: 'high', S: 'high', E: 'medium', W: 'medium' } }
    ]
  },
  chennai: {
    name: 'Chennai',
    center: [13.0400, 80.2200],
    zoom: 12,
    kpi: { wait: 38, delay: '-15.9s avg delay', throughput: 28, veh: '+95 veh/hour', co2: '-3,620 kg CO₂/day', fuel: '-1,610 L/day' },
    fixedWait: [20, 16, 14, 12, 12, 16, 28, 50, 64, 55, 42, 45, 48, 44, 38, 36, 44, 58, 66, 52, 38, 32, 26, 22],
    adaptiveWait: [10, 8, 7, 6, 6, 8, 14, 25, 32, 28, 21, 23, 24, 22, 19, 18, 22, 29, 33, 26, 19, 16, 13, 11],
    corridors: [
      { path: [[13.0569, 80.2525], [13.0067, 80.2016], [12.9350, 80.2300]], color: '#2563EB', dash: '6, 8' }
    ],
    junctions: [
      { id: 'che-anna', name: 'Anna Salai (Gemini Flyover)', coords: [13.0569, 80.2525], status: 'Green Wave Corridor', badgeClass: 'green', wait: '11.2s', throughput: '172 veh/h', cams: '5 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'medium', E: 'low', W: 'low' } },
      { id: 'che-kathi', name: 'Kathipara Cloverleaf Junction (Guindy)', coords: [13.0067, 80.2016], status: 'High Traffic Hub', badgeClass: 'yellow', wait: '24.2s', throughput: '128 veh/h', cams: '6 Live Cams', mode: 'RL Adaptive', density: { N: 'medium', S: 'high', E: 'medium', W: 'low' } },
      { id: 'che-omr', name: 'OMR IT Express Corridor', coords: [12.9350, 80.2300], status: 'Free Flow AI', badgeClass: 'green', wait: '9.1s', throughput: '198 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'low', W: 'low' } },
      { id: 'che-tnagar', name: 'T. Nagar Panagal Park Signal', coords: [13.0418, 80.2341], status: 'Shopping Bottleneck', badgeClass: 'red', wait: '42.5s', throughput: '75 veh/h', cams: '3 Live Cams', mode: 'Legacy Baseline', density: { N: 'high', S: 'high', E: 'high', W: 'medium' } }
    ]
  },
  kolkata: {
    name: 'Kolkata',
    center: [22.5600, 88.3700],
    zoom: 12,
    kpi: { wait: 44, delay: '-19.2s avg delay', throughput: 32, veh: '+115 veh/hour', co2: '-4,450 kg CO₂/day', fuel: '-1,980 L/day' },
    fixedWait: [24, 20, 16, 14, 14, 16, 30, 56, 72, 62, 48, 50, 54, 50, 44, 40, 48, 66, 76, 58, 44, 36, 30, 26],
    adaptiveWait: [12, 10, 8, 7, 7, 8, 15, 28, 36, 31, 24, 25, 27, 25, 22, 20, 24, 33, 38, 29, 22, 18, 15, 13],
    corridors: [
      { path: [[22.5390, 88.3650], [22.5855, 88.3468], [22.5180, 88.3980]], color: '#2563EB', dash: '6, 8' }
    ],
    junctions: [
      { id: 'kol-park', name: 'Park Circus 7-Point Crossing', coords: [22.5390, 88.3650], status: 'Multi-Way Bottleneck', badgeClass: 'red', wait: '46.8s', throughput: '70 veh/h', cams: '6 Live Cams', mode: 'Legacy Baseline', density: { N: 'high', S: 'high', E: 'high', W: 'high' } },
      { id: 'kol-howrah', name: 'Howrah Bridge Strand Approach', coords: [22.5855, 88.3468], status: 'Adaptive Coordinated', badgeClass: 'yellow', wait: '26.4s', throughput: '112 veh/h', cams: '5 Live Cams', mode: 'RL Adaptive', density: { N: 'medium', S: 'high', E: 'medium', W: 'low' } },
      { id: 'kol-em', name: 'EM Bypass (Ruby Hospital Signal)', coords: [22.5180, 88.3980], status: 'Green Wave Corridor', badgeClass: 'green', wait: '10.6s', throughput: '182 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'medium', E: 'low', W: 'low' } },
      { id: 'kol-esplanade', name: 'Esplanade Central Signal', coords: [22.5645, 88.3518], status: 'Optimal AI Transit', badgeClass: 'green', wait: '13.8s', throughput: '154 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'medium', W: 'low' } }
    ]
  },
  pune: {
    name: 'Pune',
    center: [18.5204, 73.8567],
    zoom: 12,
    kpi: { wait: 41, delay: '-17.5s avg delay', throughput: 30, veh: '+105 veh/hour', co2: '-3,950 kg CO₂/day', fuel: '-1,780 L/day' },
    fixedWait: [22, 18, 15, 13, 13, 16, 28, 52, 66, 56, 44, 46, 50, 46, 40, 37, 46, 60, 70, 54, 40, 34, 28, 24],
    adaptiveWait: [11, 9, 8, 7, 7, 8, 14, 26, 33, 28, 22, 23, 25, 23, 20, 19, 23, 30, 35, 27, 20, 17, 14, 12],
    corridors: [
      { path: [[18.5308, 73.8474], [18.5538, 73.8242], [18.5089, 73.7925]], color: '#2563EB', dash: '6, 8' }
    ],
    junctions: [
      { id: 'pun-univ', name: 'Pune University Circle', coords: [18.5538, 73.8242], status: 'Green Wave Flow', badgeClass: 'green', wait: '12.8s', throughput: '162 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'medium', E: 'low', W: 'low' } },
      { id: 'pun-shivaji', name: 'Shivajinagar Sancheti Crossing', coords: [18.5308, 73.8474], status: 'Moderate Traffic', badgeClass: 'yellow', wait: '23.4s', throughput: '122 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'medium', S: 'medium', E: 'high', W: 'low' } },
      { id: 'pun-chandani', name: 'Chandani Chowk Interchange (Bavdhan)', coords: [18.5089, 73.7925], status: 'Free Flow AI', badgeClass: 'green', wait: '9.2s', throughput: '189 veh/h', cams: '5 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'low', W: 'low' } },
      { id: 'pun-swargate', name: 'Swargate Bus Terminal Chowk', coords: [18.5018, 73.8582], status: 'Transit Bottleneck', badgeClass: 'red', wait: '43.2s', throughput: '76 veh/h', cams: '4 Live Cams', mode: 'Legacy Baseline', density: { N: 'high', S: 'high', E: 'high', W: 'medium' } }
    ]
  },
  ahmedabad: {
    name: 'Ahmedabad',
    center: [23.0300, 72.5400],
    zoom: 12,
    kpi: { wait: 37, delay: '-15.2s avg delay', throughput: 27, veh: '+90 veh/hour', co2: '-3,480 kg CO₂/day', fuel: '-1,560 L/day' },
    fixedWait: [20, 16, 14, 12, 12, 15, 26, 48, 60, 52, 40, 42, 46, 42, 36, 34, 42, 54, 64, 48, 36, 30, 24, 21],
    adaptiveWait: [10, 8, 7, 6, 6, 8, 13, 24, 30, 26, 20, 21, 23, 21, 18, 17, 21, 27, 32, 24, 18, 15, 12, 11],
    corridors: [
      { path: [[23.0298, 72.5074], [23.0360, 72.5620], [23.0450, 72.5200]], color: '#2563EB', dash: '6, 8' }
    ],
    junctions: [
      { id: 'ahm-iskcon', name: 'SG Highway Iskcon Cross Road', coords: [23.0298, 72.5074], status: 'High Speed AI Wave', badgeClass: 'green', wait: '10.2s', throughput: '192 veh/h', cams: '5 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'medium', W: 'low' } },
      { id: 'ahm-ashram', name: 'Income Tax Junction (Ashram Rd)', coords: [23.0360, 72.5620], status: 'Moderate Riverfront', badgeClass: 'yellow', wait: '22.1s', throughput: '126 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'medium', S: 'medium', E: 'medium', W: 'low' } },
      { id: 'ahm-pakwan', name: 'Pakwan Cross Road (SG Highway)', coords: [23.0450, 72.5200], status: 'Optimal Coordinated', badgeClass: 'green', wait: '11.4s', throughput: '168 veh/h', cams: '4 Live Cams', mode: 'RL Adaptive', density: { N: 'low', S: 'low', E: 'low', W: 'low' } },
      { id: 'ahm-geeta', name: 'Geeta Mandir Central Signal', coords: [23.0125, 72.5890], status: 'Dense Market Queue', badgeClass: 'red', wait: '40.5s', throughput: '80 veh/h', cams: '3 Live Cams', mode: 'Legacy Baseline', density: { N: 'high', S: 'high', E: 'high', W: 'medium' } }
    ]
  }
};

let chart24hInstance = null;
let currentCityKey = 'delhi';

function initChart() {
  const el = document.getElementById('chart-24h');
  if (!el) return;

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const city = TIER1_CITIES[currentCityKey] || TIER1_CITIES.delhi;

  chart24hInstance = new Chart(el, {
    type: 'line',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Fixed-Time (Baseline)',
          data: [...city.fixedWait],
          borderColor: '#64748B',
          backgroundColor: 'rgba(100, 116, 139, 0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#64748B',
          borderWidth: 2,
          borderDash: [5, 5],
        },
        {
          label: 'SIGNAL-IQ Adaptive',
          data: [...city.adaptiveWait],
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#2563EB',
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#475569', font: { family: 'Inter', size: 12, weight: '500' }, boxWidth: 12 },
        },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor: '#FFFFFF',
          bodyColor: '#CBD5E1',
          borderColor: '#D9E2EC',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: '#64748B', font: { size: 10, family: 'JetBrains Mono' } },
          grid: { color: 'rgba(226, 232, 240, 0.8)' },
        },
        y: {
          title: { display: true, text: 'Average Wait (seconds)', color: '#475569', font: { family: 'Inter', size: 11, weight: '600' } },
          ticks: { color: '#64748B', font: { size: 10, family: 'JetBrains Mono' } },
          grid: { color: 'rgba(226, 232, 240, 0.8)' },
        },
      },
    },
  });
}

// ═══════════════════════════════════════════
// 7. REAL-LIFE GIS INTERSECTION MAP (Leaflet)
// ═══════════════════════════════════════════
let gisMapInstance = null;
let gisMarkerLayers = [];
let gisCorridorLayers = [];

function initRealLifeMap() {
  const mapEl = document.getElementById('real-life-map');
  if (!mapEl || typeof L === 'undefined') return;

  const city = TIER1_CITIES[currentCityKey];

  gisMapInstance = L.map('real-life-map', {
    center: city.center,
    zoom: city.zoom,
    zoomControl: false,
    attributionControl: false
  });

  // Layer 1: CartoDB Positron
  const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(gisMapInstance);

  // Layer 2: Satellite Tiles
  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18
  });

  // Layer Toggles
  const btnStreet = document.getElementById('btn-map-street');
  const btnSat = document.getElementById('btn-map-sat');

  if (btnStreet && btnSat) {
    btnStreet.addEventListener('click', () => {
      btnStreet.classList.add('active');
      btnSat.classList.remove('active');
      gisMapInstance.removeLayer(satelliteLayer);
      gisMapInstance.addLayer(streetLayer);
    });

    btnSat.addEventListener('click', () => {
      btnSat.classList.add('active');
      btnStreet.classList.remove('active');
      gisMapInstance.removeLayer(streetLayer);
      gisMapInstance.addLayer(satelliteLayer);
    });
  }

  // Render initial city
  renderCityGis(currentCityKey);

  // City Selector Event Listener
  const citySelect = document.getElementById('city-select');
  if (citySelect) {
    citySelect.addEventListener('change', (e) => {
      currentCityKey = e.target.value;
      switchCity(currentCityKey);
    });
  }
}

function renderCityGis(cityKey) {
  const city = TIER1_CITIES[cityKey];
  if (!city || !gisMapInstance) return;

  // Clear previous layers
  gisMarkerLayers.forEach(layer => gisMapInstance.removeLayer(layer));
  gisMarkerLayers = [];
  gisCorridorLayers.forEach(layer => gisMapInstance.removeLayer(layer));
  gisCorridorLayers = [];

  // Draw Corridors
  if (city.corridors) {
    city.corridors.forEach(c => {
      const poly = L.polyline(c.path, {
        color: c.color,
        weight: 4,
        opacity: 0.8,
        dashArray: c.dash
      }).addTo(gisMapInstance);
      gisCorridorLayers.push(poly);
    });
  }

  // Draw Markers
  city.junctions.forEach((j, idx) => {
    const iconHtml = `<div class="gis-pin-marker ${j.badgeClass}"><i class="fa-solid fa-traffic-light"></i></div>`;
    const customIcon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker(j.coords, { icon: customIcon }).addTo(gisMapInstance);

    const popupHtml = `
      <div class="popup-header">${j.name}</div>
      <span class="popup-badge ${j.badgeClass}">● ${j.status}</span>
      <div class="popup-stat">⏱ Avg Delay: <strong>${j.wait}</strong></div>
      <div class="popup-stat">🚗 Flow Rate: <strong>${j.throughput}</strong></div>
      <div class="popup-stat">📹 Cameras: <strong>${j.cams}</strong></div>
      <button class="popup-btn" onclick="selectGisJunction('${j.id}')">⚡ Focus in Live Simulator</button>
    `;

    marker.bindPopup(popupHtml);

    marker.on('click', () => {
      selectGisJunction(j.id);
    });

    gisMarkerLayers.push(marker);

    if (idx === 0) {
      setTimeout(() => marker.openPopup(), 600);
      selectGisJunction(j.id);
    }
  });
}

function switchCity(cityKey) {
  const city = TIER1_CITIES[cityKey];
  if (!city) return;

  // Fly to new city
  if (gisMapInstance) {
    gisMapInstance.flyTo(city.center, city.zoom, { duration: 1.5 });
    renderCityGis(cityKey);
  }

  // Update 24h Chart
  if (chart24hInstance) {
    chart24hInstance.data.datasets[0].data = [...city.fixedWait];
    chart24hInstance.data.datasets[1].data = [...city.adaptiveWait];
    chart24hInstance.update();
  }

  // Update KPI cards
  const kpiCards = $$('.kpi-card');
  if (kpiCards.length >= 4) {
    const val0 = kpiCards[0].querySelector('.kpi-val');
    const tr0 = kpiCards[0].querySelector('.kpi-trend');
    if (val0) { val0.dataset.target = city.kpi.wait; val0.textContent = city.kpi.wait + '%'; }
    if (tr0) tr0.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> ${city.kpi.delay}`;

    const val1 = kpiCards[1].querySelector('.kpi-val');
    const tr1 = kpiCards[1].querySelector('.kpi-trend');
    if (val1) { val1.dataset.target = city.kpi.throughput; val1.textContent = city.kpi.throughput + '%'; }
    if (tr1) tr1.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> ${city.kpi.veh}`;

    const val2 = kpiCards[2].querySelector('.kpi-val');
    const tr2 = kpiCards[2].querySelector('.kpi-trend');
    if (val2) { val2.dataset.target = city.kpi.wait - 14; val2.textContent = (city.kpi.wait - 14) + '%'; }
    if (tr2) tr2.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> ${city.kpi.co2}`;

    const val3 = kpiCards[3].querySelector('.kpi-val');
    const tr3 = kpiCards[3].querySelector('.kpi-trend');
    if (val3) { val3.dataset.target = Math.round(city.kpi.wait * 0.45); val3.textContent = Math.round(city.kpi.wait * 0.45) + '%'; }
    if (tr3) tr3.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> ${city.kpi.fuel}`;
  }
}

// Global handler for selecting GIS junction
window.selectGisJunction = function(id) {
  let item = null;
  for (const cityKey in TIER1_CITIES) {
    const found = TIER1_CITIES[cityKey].junctions.find(j => j.id === id);
    if (found) { item = found; break; }
  }
  if (!item) return;

  const elName = document.getElementById('inspector-name');
  const elStatus = document.getElementById('inspector-status');
  const elWait = document.getElementById('inspector-wait');
  const elFlow = document.getElementById('inspector-flow');
  const elCam = document.getElementById('inspector-cam');
  const elMode = document.getElementById('inspector-mode');

  if (elName) elName.textContent = item.name;
  if (elStatus) elStatus.innerHTML = `<span class="popup-badge ${item.badgeClass}">● ${item.status}</span>`;
  if (elWait) elWait.textContent = item.wait;
  if (elFlow) elFlow.textContent = item.throughput;
  if (elCam) elCam.textContent = item.cams;
  if (elMode) elMode.textContent = item.mode;

  // Synchronize Dual Canvas Simulator density with real junction flow
  if (simFixed && simAdaptive && item.density) {
    simFixed.density = { ...item.density };
    simAdaptive.density = { ...item.density };
    $$('.density-group select').forEach(sel => {
      const dir = sel.dataset.dir;
      if (dir && item.density[dir]) sel.value = item.density[dir];
    });
  }
};

// ═══════════════════════════════════════════
// 8. LIVE INFERENCE BENCHMARK TEST
// ═══════════════════════════════════════════
function initInferenceBenchmark() {
  const btn = document.getElementById('btn-test-inference');
  const log = document.getElementById('inference-result-log');
  if (!btn || !log) return;

  btn.addEventListener('click', () => {
    log.textContent = 'Analyzing frame with YOLOv8n...';
    btn.disabled = true;

    setTimeout(() => {
      const cars = Math.floor(Math.random() * 6) + 4;
      const buses = Math.floor(Math.random() * 2) + 1;
      const latency = (1.2 + Math.random() * 0.5).toFixed(1);
      const satY = (0.35 + Math.random() * 0.25).toFixed(3);
      const greenNS = Math.round(30 + Math.random() * 15);
      const greenEW = Math.round(15 + Math.random() * 10);

      log.innerHTML = `✓ Detected: <strong>${cars} Cars, ${buses} Buses</strong> | TPU Latency: <strong>${latency}ms</strong> | Webster: <strong>NS=${greenNS}s, EW=${greenEW}s</strong> (Y=${satY})`;
      btn.disabled = false;
    }, 450);
  });
}

// ═══════════════════════════════════════════
// 9. SCROLL-REVEAL SECTIONS
// ═══════════════════════════════════════════
function initScrollReveal() {
  const sections = $$('.section');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  sections.forEach(s => obs.observe(s));
}

// ═══════════════════════════════════════════
// 10. ENTERPRISE MULTI-TAB ROUTER
// ═══════════════════════════════════════════
const VALID_TABS = ['home', 'simulator', 'ai-engine', 'dashboard', 'corridors', 'architecture'];
const TAB_ALIASES = { 'tech-stack': 'architecture', 'roadmap': 'architecture', 'impact': 'home' };
// Keyboard shortcuts: key → tab
const KEY_SHORTCUTS = {
  '1': 'home',
  '2': 'simulator',
  '3': 'ai-engine',
  '4': 'dashboard',
  '5': 'architecture',
  'h': 'home',
  's': 'simulator',
  'a': 'ai-engine',
  'g': 'dashboard',
  'r': 'architecture'
};

function initTabRouter() {

  function activateTab(rawTabId) {
    let tabId = (rawTabId || 'home').replace(/^#/, '').trim().toLowerCase();
    if (TAB_ALIASES[tabId]) tabId = TAB_ALIASES[tabId];
    if (!VALID_TABS.includes(tabId)) tabId = 'home';

    // ── 1. Switch panel visibility ──
    document.querySelectorAll('.tab-panel').forEach(p => {
      const isTarget = p.id === `tab-${tabId}`;
      p.style.display = isTarget ? 'block' : 'none';
      p.classList.toggle('active', isTarget);
    });

    // ── 2. Update all nav button active states ──
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const btnTab = (btn.dataset.tab || '').toLowerCase();
      btn.classList.toggle('active', btnTab === tabId);
      if (btn.hasAttribute('aria-selected')) btn.setAttribute('aria-selected', btnTab === tabId);
    });

    // ── 3. Resize canvases/maps after panel is visible ──
    if (tabId === 'simulator') {
      requestAnimationFrame(() => {
        if (typeof simFixed !== 'undefined' && simFixed) simFixed.resize();
        if (typeof simAdaptive !== 'undefined' && simAdaptive) simAdaptive.resize();
      });
    }
    if (tabId === 'dashboard') {
      setTimeout(() => {
        if (typeof chart24hInstance !== 'undefined' && chart24hInstance) {
          try { chart24hInstance.resize(); } catch(e) {}
        }
        if (typeof gisMapInstance !== 'undefined' && gisMapInstance) {
          try { gisMapInstance.invalidateSize(true); } catch(e) {}
        }
      }, 80);
    }

    // ── 4. Scroll to top ──
    window.scrollTo({ top: 0, behavior: 'instant' });

    // ── 5. Update URL hash without scroll ──
    const newHash = `#${tabId}`;
    if (window.location.hash !== newHash) {
      history.pushState({ tab: tabId }, '', newHash);
    }

    // ── 6. Close mobile menu if open ──
    const overlay = document.querySelector('.overlay');
    const mm = document.querySelector('.mobile-menu');
    if (overlay) overlay.hidden = true;
    if (mm) mm.hidden = true;
  }

  // ── Direct binding on each nav-tab-btn (most reliable) ──
  document.querySelectorAll('.nav-tab-btn, .mm-link').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const tabId = this.dataset.tab;
      if (tabId) activateTab(tabId);
    });
  });

  // ── Delegated click for [data-tab] elements (module cards, CTAs, breadcrumbs) ──
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-tab]');
    if (!trigger) return;
    // Skip nav-tab-btn and mm-link (already bound above)
    if (trigger.classList.contains('nav-tab-btn') || trigger.classList.contains('mm-link')) return;
    const tabId = trigger.dataset.tab;
    if (tabId && (VALID_TABS.includes(tabId) || TAB_ALIASES[tabId])) {
      e.preventDefault();
      activateTab(tabId);
    }
  });

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', e => {
    // Skip if user is typing in an input
    const tag = (e.target || e.srcElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    // Skip if modifier keys are held
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key.toLowerCase();
    if (KEY_SHORTCUTS[key]) {
      activateTab(KEY_SHORTCUTS[key]);
    }
  });

  // ── Handle initial URL hash on page load ──
  const initial = window.location.hash ? window.location.hash.substring(1) : 'home';
  activateTab(initial);

  // ── Handle browser back/forward ──
  window.addEventListener('popstate', () => {
    const current = window.location.hash ? window.location.hash.substring(1) : 'home';
    activateTab(current);
  });

  // Expose globally for external calls
  window.signaliqGoTo = activateTab;
}

// ═══════════════════════════════════════════
// 11. WEBSOCKET BACKEND INTEGRATION
// ═══════════════════════════════════════════
function initWebSocketBackend() {
  const wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  try {
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => {
      console.log('⚡ Connected to SIGNAL-IQ Backend Telemetry Feed');
    };
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'TELEMETRY_UPDATE' && msg.optimization) {
          const conf = document.getElementById('ai-conf');
          if (conf && msg.optimization.confidenceScore) {
            conf.textContent = msg.optimization.confidenceScore + '%';
          }
        }
      } catch (err) {}
    };
  } catch (e) {
    console.log('Offline/standalone simulation mode active');
  }
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initCounters();
  initKpiCounters();
  initMobileMenu();
  initSimulators();
  initChart();
  initRealLifeMap();
  initInferenceBenchmark();
  initScrollReveal();
  initTabRouter();
  initWebSocketBackend();
});


