/* ═══════════════════════════════════════════
   SIGNAL-IQ — main.js
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
  $$('.mm-link, .mm-signin', menu).forEach(l => l.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 720) close(); });
}

// ═══════════════════════════════════════════
// 4. INTERSECTION SIMULATOR
// ═══════════════════════════════════════════

const VEHICLE_COLORS = ['#f97316','#3b82f6','#22c55e','#a855f7','#ef4444','#06b6d4','#eab308','#ec4899'];

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

    // Signal state
    this.phase = 0; // 0 = NS green, 1 = yellow, 2 = EW green, 3 = yellow
    this.phaseStart = Date.now();
    this.phaseDurations = mode === 'fixed'
      ? [30000, 3000, 30000, 3000]
      : [30000, 3000, 30000, 3000]; // adaptive will override dynamically

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

    // Start
    this.running = true;
    this.loop();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = rect.width;
    this.h = rect.height;
    this.roadW = this.w * 0.14;
    this.cx = this.w / 2;
    this.cy = this.h / 2;
    this.laneW = this.roadW / 2;
    this.vLen = this.laneW * 0.7;
    this.vWid = this.laneW * 0.5;
    this.stopDist = this.roadW * 0.6;
  }

  getSpawnInterval(level) {
    switch (level) {
      case 'low':    return 2400 + Math.random() * 800;
      case 'medium': return 1000 + Math.random() * 600;
      case 'high':   return 400 + Math.random() * 300;
    }
    return 1200;
  }

  isGreen(dir) {
    if (this.phase === 0) return dir === 'N' || dir === 'S';
    if (this.phase === 2) return dir === 'E' || dir === 'W';
    return false; // yellow phases
  }

  isYellow(dir) {
    if (this.phase === 1) return dir === 'N' || dir === 'S';
    if (this.phase === 3) return dir === 'E' || dir === 'W';
    return false;
  }

  updateSignal() {
    const now = Date.now();
    const elapsed = now - this.phaseStart;

    if (this.mode === 'adaptive' && (this.phase === 0 || this.phase === 2)) {
      // Dynamically adjust current green duration
      const nsQ = this.vehicles.filter(v => (v.dir === 'N' || v.dir === 'S') && v.waiting).length;
      const ewQ = this.vehicles.filter(v => (v.dir === 'E' || v.dir === 'W') && v.waiting).length;
      const totalQ = nsQ + ewQ || 1;

      if (this.phase === 0) {
        const ratio = nsQ / totalQ;
        this.phaseDurations[0] = Math.max(8000, Math.min(45000, ratio * 50000 + 5000));
        this.phaseDurations[2] = Math.max(8000, Math.min(45000, (1 - ratio) * 50000 + 5000));
      } else {
        const ratio = ewQ / totalQ;
        this.phaseDurations[2] = Math.max(8000, Math.min(45000, ratio * 50000 + 5000));
        this.phaseDurations[0] = Math.max(8000, Math.min(45000, (1 - ratio) * 50000 + 5000));
      }
    }

    if (elapsed >= this.phaseDurations[this.phase]) {
      this.phase = (this.phase + 1) % 4;
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

  spawnVehicle(dir) {
    const col = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
    let x, y, vx = 0, vy = 0;
    const speed = 1.2 + Math.random() * 0.6;

    switch (dir) {
      case 'N': // enters from top, goes down
        x = this.cx + this.laneW / 2;
        y = -this.vLen;
        vy = speed;
        break;
      case 'S': // enters from bottom, goes up
        x = this.cx - this.laneW / 2;
        y = this.h + this.vLen;
        vy = -speed;
        break;
      case 'E': // enters from right, goes left
        x = this.w + this.vLen;
        y = this.cy + this.laneW / 2;
        vx = -speed;
        break;
      case 'W': // enters from left, goes right
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

    // Check queuing behind other stopped vehicles
    for (const v of this.vehicles) {
      const mustStop = this.shouldStop(v);

      // Check vehicle ahead in same lane
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
        // Stop
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
        // Move
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

    // Remove off-screen vehicles → count as cleared
    const before = this.vehicles.length;
    this.vehicles = this.vehicles.filter(v => {
      const offScreen = v.x < -60 || v.x > this.w + 60 || v.y < -60 || v.y > this.h + 60;
      // Only count as cleared if it was moving through (past center)
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
    // Clean old clear log entries (>60s)
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
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Roads
    ctx.fillStyle = '#1e2330';
    // Vertical road
    ctx.fillRect(this.cx - this.roadW, 0, this.roadW * 2, h);
    // Horizontal road
    ctx.fillRect(0, this.cy - this.roadW, w, this.roadW * 2);

    // Intersection box
    ctx.fillStyle = '#252b3b';
    ctx.fillRect(this.cx - this.roadW, this.cy - this.roadW, this.roadW * 2, this.roadW * 2);

    // Lane markings (center dashes)
    ctx.setLineDash([8, 12]);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(this.cx, 0);
    ctx.lineTo(this.cx, this.cy - this.roadW);
    ctx.moveTo(this.cx, this.cy + this.roadW);
    ctx.lineTo(this.cx, h);
    ctx.stroke();
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, this.cy);
    ctx.lineTo(this.cx - this.roadW, this.cy);
    ctx.moveTo(this.cx + this.roadW, this.cy);
    ctx.lineTo(w, this.cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stop lines
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    // North stop
    ctx.beginPath();
    ctx.moveTo(this.cx, this.cy - this.roadW - 2);
    ctx.lineTo(this.cx + this.roadW, this.cy - this.roadW - 2);
    ctx.stroke();
    // South stop
    ctx.beginPath();
    ctx.moveTo(this.cx - this.roadW, this.cy + this.roadW + 2);
    ctx.lineTo(this.cx, this.cy + this.roadW + 2);
    ctx.stroke();
    // East stop
    ctx.beginPath();
    ctx.moveTo(this.cx + this.roadW + 2, this.cy);
    ctx.lineTo(this.cx + this.roadW + 2, this.cy + this.roadW);
    ctx.stroke();
    // West stop
    ctx.beginPath();
    ctx.moveTo(this.cx - this.roadW - 2, this.cy - this.roadW);
    ctx.lineTo(this.cx - this.roadW - 2, this.cy);
    ctx.stroke();

    // Traffic lights
    this.drawLight('N');
    this.drawLight('S');
    this.drawLight('E');
    this.drawLight('W');

    // Vehicles
    for (const v of this.vehicles) {
      ctx.fillStyle = v.col;
      const isVert = v.dir === 'N' || v.dir === 'S';
      const vw = isVert ? this.vWid : this.vLen;
      const vh = isVert ? this.vLen : this.vWid;
      ctx.beginPath();
      this.roundRect(ctx, v.x - vw/2, v.y - vh/2, vw, vh, 3);
      ctx.fill();
    }

    // Phase indicator text
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    const phaseNames = ['N-S Green', 'Transition', 'E-W Green', 'Transition'];
    ctx.fillText(phaseNames[this.phase], 8, 16);

    if (this.mode === 'adaptive') {
      ctx.fillStyle = '#22c55e';
      ctx.fillText('AI Adaptive', 8, 28);
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

    let color;
    if (this.isGreen(dir)) color = '#22c55e';
    else if (this.isYellow(dir)) color = '#eab308';
    else color = '#ef4444';

    // Glow
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = color + '33';
    ctx.fill();

    // Light
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

  destroy() {
    this.running = false;
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

    // Update AI engine panel
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

  // Randomize
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

  // Reset
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      simFixed.reset();
      simAdaptive.reset();
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
    // Update bar
    const bar = el.closest('.lane-item')?.querySelector('.lane-bar');
    if (bar) {
      bar.className = 'lane-bar ' + barClass;
    }
  }

  // Phase recommendations
  const nsD = simAdaptive.phaseDurations[0] / 1000;
  const ewD = simAdaptive.phaseDurations[2] / 1000;
  const nsEl = document.getElementById('ai-ns');
  const ewEl = document.getElementById('ai-ew');
  const nsBar = document.getElementById('ai-ns-bar');
  const ewBar = document.getElementById('ai-ew-bar');
  if (nsEl) nsEl.textContent = nsD.toFixed(0) + 's';
  if (ewEl) ewEl.textContent = ewD.toFixed(0) + 's';
  if (nsBar) nsBar.style.width = (nsD / 50 * 100) + '%';
  if (ewBar) ewBar.style.width = (ewD / 50 * 100) + '%';

  // Confidence (fluctuate slightly)
  const conf = document.getElementById('ai-conf');
  if (conf) {
    const base = 93 + Math.random() * 5;
    conf.textContent = base.toFixed(1) + '%';
  }
}

// ═══════════════════════════════════════════
// 6. 24-HOUR CHART
// ═══════════════════════════════════════════
function initChart() {
  const el = document.getElementById('chart-24h');
  if (!el) return;

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  // Simulated fixed-time wait (higher during peaks)
  const fixedData = [
    25, 22, 18, 15, 14, 16, 28, 52, 68, 58, 45, 48,
    55, 50, 42, 38, 45, 62, 72, 55, 42, 35, 30, 27
  ];
  // Adaptive: smoother, lower
  const adaptiveData = fixedData.map(v => Math.max(8, v * (0.45 + Math.random() * 0.15)));

  new Chart(el, {
    type: 'line',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Fixed-Time',
          data: fixedData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: 'SIGNAL-IQ Adaptive',
          data: adaptiveData,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#999', font: { family: 'Inter', size: 12 }, boxWidth: 12 },
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#fff',
          bodyColor: '#ccc',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: '#555', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          title: { display: true, text: 'Avg Wait (s)', color: '#666' },
          ticks: { color: '#555', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
    },
  });
}

// ═══════════════════════════════════════════
// 7. SCROLL-REVEAL SECTIONS
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
// 8. NAV ACTIVE STATE ON SCROLL
// ═══════════════════════════════════════════
function initNavHighlight() {
  const links = $$('.nav-link, .mm-link');
  const sections = [
    { id: '', el: null },
    { id: 'simulator', el: document.getElementById('simulator') },
    { id: 'dashboard', el: document.getElementById('dashboard') },
    { id: 'tech-stack', el: document.getElementById('tech-stack') },
  ];

  window.addEventListener('scroll', () => {
    let current = '';
    for (const s of sections) {
      if (s.el && s.el.getBoundingClientRect().top < window.innerHeight * 0.4) {
        current = s.id;
      }
    }
    links.forEach(l => {
      const href = l.getAttribute('href') || '';
      const id = href.replace('#', '');
      l.classList.toggle('active', id === current || (current === '' && id === ''));
    });
  });
}

// ═══════════════════════════════════════════
// 9. SMOOTH SCROLL FOR ANCHOR LINKS
// ═══════════════════════════════════════════
function initSmoothScroll() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// ═══════════════════════════════════════════
// 10. WEBSOCKET BACKEND INTEGRATION
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
  initScrollReveal();
  initNavHighlight();
  initSmoothScroll();
  initWebSocketBackend();
});
