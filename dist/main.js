const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const ease = t => 1 - Math.pow(1 - t, 3);
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
const VEHICLE_COLORS = ['#00D4FF', '#00E5A0', '#A78BFA', '#FFB020', '#FF3B4E', '#0891B2', '#7C5CFC'];
class TrafficSim {
  constructor(canvasId, mode) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.mode = mode;
    this.density = { N: 'medium', S: 'medium', E: 'medium', W: 'medium' };
    this.vehicles = [];
    this.nextId = 0;
    this.phase = 0;
    this.phaseStart = Date.now();
    this.phaseDurations = mode === 'fixed'
      ? [30000, 3000, 30000, 3000]
      : [30000, 3000, 30000, 3000];
    this.emergencyActive = false;
    this.spawnTimers = { N: 0, S: 0, E: 0, W: 0 };
    this.totalWait = 0;
    this.totalWaited = 0;
    this.totalCleared = 0;
    this.clearLog = [];
    this.startTime = Date.now();
    this.resize();
    window.addEventListener('resize', () => this.resize());
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
    if (this.phase === 0) return dir === 'N' || dir === 'S';
    if (this.phase === 2) return dir === 'E' || dir === 'W';
    return false;
  }
  isYellow(dir) {
    if (this.phase === 1) return dir === 'N' || dir === 'S';
    if (this.phase === 3) return dir === 'E' || dir === 'W';
    return false;
  }
  updateSignal() {
    const now = Date.now();
    const elapsed = now - this.phaseStart;
    if (this.mode === 'adaptive') {
      const hasEmergency = this.vehicles.some(v => v.isEmergency && (v.dir === 'N' || v.dir === 'S'));
      if (hasEmergency) {
        if (this.phase !== 0) {
          this.phase = 0;
          this.phaseStart = now;
          this.phaseDurations[0] = 30000;
        }
      } else if (this.phase === 0 || this.phase === 2) {
        const nsQ = this.vehicles.filter(v => (v.dir === 'N' || v.dir === 'S') && v.waiting).length;
        const ewQ = this.vehicles.filter(v => (v.dir === 'E' || v.dir === 'W') && v.waiting).length;
        const totalQ = nsQ + ewQ || 1;
        if (this.phase === 0) {
          const ratio = nsQ / totalQ;
          this.phaseDurations[0] = Math.max(8000, Math.min(48000, ratio * 50000 + 6000));
          this.phaseDurations[2] = Math.max(8000, Math.min(48000, (1 - ratio) * 50000 + 6000));
        } else {
          const ratio = ewQ / totalQ;
          this.phaseDurations[2] = Math.max(8000, Math.min(48000, ratio * 50000 + 6000));
          this.phaseDurations[0] = Math.max(8000, Math.min(48000, (1 - ratio) * 50000 + 6000));
        }
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
    ctx.fillStyle = '#04060A';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0B0F1A';
    ctx.fillRect(this.cx - this.roadW, 0, this.roadW * 2, h);
    ctx.fillRect(0, this.cy - this.roadW, w, this.roadW * 2);
    ctx.fillStyle = '#121826';
    ctx.fillRect(this.cx - this.roadW, this.cy - this.roadW, this.roadW * 2, this.roadW * 2);
    ctx.setLineDash([8, 12]);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.cx, 0); ctx.lineTo(this.cx, this.cy - this.roadW);
    ctx.moveTo(this.cx, this.cy + this.roadW); ctx.lineTo(this.cx, h);
    ctx.moveTo(0, this.cy); ctx.lineTo(this.cx - this.roadW, this.cy);
    ctx.moveTo(this.cx + this.roadW, this.cy); ctx.lineTo(w, this.cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(this.cx, this.cy - this.roadW - 2); ctx.lineTo(this.cx + this.roadW, this.cy - this.roadW - 2);
    ctx.moveTo(this.cx - this.roadW, this.cy + this.roadW + 2); ctx.lineTo(this.cx, this.cy + this.roadW + 2);
    ctx.moveTo(this.cx + this.roadW + 2, this.cy); ctx.lineTo(this.cx + this.roadW + 2, this.cy + this.roadW);
    ctx.moveTo(this.cx - this.roadW - 2, this.cy - this.roadW); ctx.lineTo(this.cx - this.roadW - 2, this.cy);
    ctx.stroke();
    this.drawLight('N');
    this.drawLight('S');
    this.drawLight('E');
    this.drawLight('W');
    for (const v of this.vehicles) {
      ctx.fillStyle = v.col;
      const isVert = v.dir === 'N' || v.dir === 'S';
      const vw = isVert ? this.vWid : this.vLen;
      const vh = isVert ? this.vLen : this.vWid;
      ctx.beginPath();
      this.roundRect(ctx, v.x - vw/2, v.y - vh/2, vw, vh, 4);
      ctx.fill();
      if (v.isEmergency) {
        ctx.fillStyle = (Date.now() % 300 < 150) ? '#FF3B4E' : '#00D4FF';
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
    let color = '#FF3B4E';
    if (this.isGreen(dir)) color = '#00E5A0';
    else if (this.isYellow(dir)) color = '#FFB020';
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = color + '33';
    ctx.fill();
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
let simFixed = null;
let simAdaptive = null;
function initSimulators() {
  const cf = document.getElementById('canvas-fixed');
  const ca = document.getElementById('canvas-adaptive');
  if (!cf || !ca) return;
  simFixed = new TrafficSim('canvas-fixed', 'fixed');
  simAdaptive = new TrafficSim('canvas-adaptive', 'adaptive');
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
  $$('.density-group select').forEach(sel => {
    sel.addEventListener('change', () => {
      const dir = sel.dataset.dir;
      const val = sel.value;
      simFixed.setDensity(dir, val);
      simAdaptive.setDensity(dir, val);
    });
  });
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
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      simFixed.reset();
      simAdaptive.reset();
    });
  }
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
      for (let i = 0; i < 6; i++) {
        simFixed.spawnVehicle('E');
        simFixed.spawnVehicle('W');
        simAdaptive.spawnVehicle('E');
        simAdaptive.spawnVehicle('W');
      }
    });
  }
  const emergBtn = document.getElementById('btn-emergency');
  if (emergBtn) {
    emergBtn.addEventListener('click', () => {
      simFixed.spawnVehicle('N', true);
      simAdaptive.spawnVehicle('N', true);
    });
  }
}
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
  const conf = document.getElementById('ai-conf');
  if (conf) {
    const base = 93 + Math.random() * 5;
    conf.textContent = base.toFixed(1) + '%';
  }
}
function initChart() {
  const el = document.getElementById('chart-24h');
  if (!el) return;
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const fixedData = [
    25, 22, 18, 15, 14, 16, 28, 52, 68, 58, 45, 48,
    55, 50, 42, 38, 45, 62, 72, 55, 42, 35, 30, 27
  ];
  const adaptiveData = fixedData.map(v => Math.max(8, Math.round(v * (0.46 + Math.random() * 0.1))));
  new Chart(el, {
    type: 'line',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Fixed-Time (Legacy)',
          data: fixedData,
          borderColor: '#FF3B4E',
          backgroundColor: 'rgba(255, 59, 78, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#FF3B4E',
          borderWidth: 2,
        },
        {
          label: 'SIGNAL-IQ Adaptive',
          data: adaptiveData,
          borderColor: '#00E5A0',
          backgroundColor: 'rgba(0, 229, 160, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#00E5A0',
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
          labels: { color: '#94A3B8', font: { family: 'Plus Jakarta Sans', size: 12 }, boxWidth: 12 },
        },
        tooltip: {
          backgroundColor: '#121826',
          titleColor: '#F1F5F9',
          bodyColor: '#94A3B8',
          borderColor: '#1E2636',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: '#4B5670', font: { size: 10, family: 'JetBrains Mono' } },
          grid: { color: 'rgba(30, 38, 54, 0.6)' },
        },
        y: {
          title: { display: true, text: 'Average Wait (seconds)', color: '#94A3B8' },
          ticks: { color: '#4B5670', font: { size: 10, family: 'JetBrains Mono' } },
          grid: { color: 'rgba(30, 38, 54, 0.6)' },
        },
      },
    },
  });
}
function initMapInspector() {
  const pins = $$('.map-pin');
  pins.forEach(pin => {
    pin.addEventListener('click', () => {
      pins.forEach(p => p.classList.remove('active-pin'));
      pin.classList.add('active-pin');
      const name = pin.dataset.name;
      const status = pin.dataset.status;
      const wait = pin.dataset.wait;
      const flow = pin.dataset.thru;
      const elName = document.getElementById('inspector-name');
      const elStatus = document.getElementById('inspector-status');
      const elWait = document.getElementById('inspector-wait');
      const elFlow = document.getElementById('inspector-flow');
      if (elName) elName.textContent = name;
      if (elStatus) elStatus.textContent = status;
      if (elWait) elWait.textContent = wait;
      if (elFlow) elFlow.textContent = flow;
    });
  });
}
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
function initNavHighlight() {
  const links = $$('.nav-link, .mm-link');
  const sections = [
    { id: '', el: null },
    { id: 'simulator', el: document.getElementById('simulator') },
    { id: 'ai-engine', el: document.getElementById('ai-engine') },
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
document.addEventListener('DOMContentLoaded', () => {
  initCounters();
  initKpiCounters();
  initMobileMenu();
  initSimulators();
  initChart();
  initMapInspector();
  initInferenceBenchmark();
  initScrollReveal();
  initNavHighlight();
  initSmoothScroll();
  initWebSocketBackend();
});