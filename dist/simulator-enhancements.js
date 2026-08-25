(function () {
  'use strict';
  const DENSITY_CYCLE = ['low', 'medium', 'high'];
  function getDirFromClick(canvas, x, y) {
    const cx = canvas.getBoundingClientRect().width / 2;
    const cy = canvas.getBoundingClientRect().height / 2;
    const dx = x - cx;
    const dy = y - cy;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'E' : 'W';
    return dy > 0 ? 'S' : 'N';
  }
  function cycleDensity(dir) {
    const selects = document.querySelectorAll(`.density-group select[data-dir="${dir}"]`);
    selects.forEach(sel => {
      const cur = sel.value;
      const idx = DENSITY_CYCLE.indexOf(cur);
      const next = DENSITY_CYCLE[(idx + 1) % DENSITY_CYCLE.length];
      sel.value = next;
      sel.dispatchEvent(new Event('change'));
    });
    return selects.length > 0 ? selects[0].value : null;
  }
  function showFlash(canvas, dir) {
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const cw = canvas.offsetWidth;
    const ch = canvas.offsetHeight;
    const cx = cw / 2;
    const cy = ch / 2;
    const flash = document.createElement('div');
    flash.className = 'lane-flash';
    switch (dir) {
      case 'N': flash.style.cssText = `top:0;left:0;right:0;height:${cy}px`; break;
      case 'S': flash.style.cssText = `bottom:0;left:0;right:0;height:${cy}px`; break;
      case 'E': flash.style.cssText = `top:0;bottom:0;right:0;width:${cx}px`; break;
      case 'W': flash.style.cssText = `top:0;bottom:0;left:0;width:${cx}px`; break;
    }
    wrap.style.position = 'relative';
    wrap.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove());
  }
  function attachCanvasClicks() {
    ['canvas-fixed', 'canvas-adaptive'].forEach(id => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      canvas.style.cursor = 'pointer';
      canvas.title = 'Click a quadrant to cycle lane density';
      canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const dir = getDirFromClick(canvas, x, y);
        cycleDensity(dir);
        showFlash(canvas, dir);
      });
    });
  }
  let incidentActive = false;
  let incidentTimer = null;
  let incidentDir = null;
  let incidentOrigVal = {};
  const INCIDENT_DURATION = 12000;
  function triggerIncident() {
    if (incidentActive) clearIncident();
    const dirs = ['N', 'S', 'E', 'W'];
    incidentDir = dirs[Math.floor(Math.random() * dirs.length)];
    const selects = document.querySelectorAll(`.density-group select[data-dir="${incidentDir}"]`);
    selects.forEach(sel => { incidentOrigVal[sel] = sel.value; });
    selects.forEach(sel => {
      sel.value = 'high';
      sel.dispatchEvent(new Event('change'));
      sel.disabled = true;
    });
    incidentActive = true;
    const statusEl = document.getElementById('incident-status');
    if (statusEl) {
      statusEl.textContent = `⚠ Incident on ${incidentDir} approach — SIGNAL-IQ re-routing priority (${INCIDENT_DURATION/1000}s)`;
      statusEl.classList.add('active');
    }
    if (window.signaliqSound) window.signaliqSound.incident();
    const btn = document.getElementById('btn-incident');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Clear Incident'; }
    incidentTimer = setTimeout(clearIncident, INCIDENT_DURATION);
  }
  function clearIncident() {
    incidentActive = false;
    clearTimeout(incidentTimer);
    const selects = document.querySelectorAll(`.density-group select[data-dir="${incidentDir}"]`);
    selects.forEach(sel => {
      sel.disabled = false;
      sel.value = incidentOrigVal[sel] || 'medium';
      sel.dispatchEvent(new Event('change'));
    });
    const statusEl = document.getElementById('incident-status');
    if (statusEl) statusEl.classList.remove('active');
    const btn = document.getElementById('btn-incident');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Simulate Incident'; }
  }
  function injectIncidentButton() {
    const actionsRow = document.querySelector('.scenario-actions');
    if (!actionsRow) return;
    const btn = document.createElement('button');
    btn.className = 'btn-scenario incident';
    btn.id = 'btn-incident';
    btn.title = 'Block a random lane and watch SIGNAL-IQ adapt vs Fixed timing fail';
    btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Simulate Incident';
    btn.addEventListener('click', () => {
      if (incidentActive) clearIncident(); else triggerIncident();
    });
    actionsRow.appendChild(btn);
    const statusEl = document.createElement('div');
    statusEl.className = 'incident-status';
    statusEl.id = 'incident-status';
    statusEl.innerHTML = '⚠ Incident active — observing adaptive re-routing...';
    actionsRow.parentElement.appendChild(statusEl);
  }
  let compareActive = false;
  let dragStartX = 0;
  let handlePct = 50;
  function buildCompareWrapper() {
    const simGrid = document.querySelector('.sim-grid');
    if (!simGrid) return;
    const compareBtn = document.createElement('button');
    compareBtn.className = 'btn-action compare';
    compareBtn.id = 'btn-compare-mode';
    compareBtn.innerHTML = '<i class="fa-solid fa-left-right"></i> Compare Mode';
    compareBtn.addEventListener('click', toggleCompareMode);
    simGrid.parentElement.insertBefore(compareBtn, simGrid);
    const wrap = document.createElement('div');
    wrap.id = 'compare-mode-wrap';
    const adaptiveBase = document.createElement('div');
    adaptiveBase.id = 'compare-adaptive-bg';
    adaptiveBase.className = 'compare-adaptive-bg';
    const adaptiveLabel = document.createElement('div');
    adaptiveLabel.className = 'compare-label adaptive-label';
    adaptiveLabel.textContent = 'SIGNAL-IQ';
    const fixedClip = document.createElement('div');
    fixedClip.id = 'compare-fixed-clip';
    const fixedLabel = document.createElement('div');
    fixedLabel.className = 'compare-label fixed-label';
    fixedLabel.textContent = 'Fixed Time';
    const handle = document.createElement('div');
    handle.id = 'compare-handle';
    wrap.appendChild(adaptiveBase);
    wrap.appendChild(adaptiveLabel);
    wrap.appendChild(fixedClip);
    wrap.appendChild(fixedLabel);
    wrap.appendChild(handle);
    simGrid.parentElement.insertBefore(wrap, simGrid);
    handle.addEventListener('mousedown', startDrag);
    wrap.addEventListener('touchstart', startDrag, { passive: true });
    window.__compareWrap = wrap;
    window.__compareFixedClip = fixedClip;
    window.__compareHandle = handle;
    window.__compareAdaptiveBg = adaptiveBase;
  }
  function toggleCompareMode() {
    compareActive = !compareActive;
    const btn = document.getElementById('btn-compare-mode');
    const wrap = document.getElementById('compare-mode-wrap');
    const simGrid = document.querySelector('.sim-grid');
    if (!wrap || !simGrid) return;
    if (compareActive) {
      btn.classList.add('active');
      btn.innerHTML = '<i class="fa-solid fa-table-columns"></i> Side-by-Side';
      const fixedCanvas  = document.getElementById('canvas-fixed');
      const adaptCanvas  = document.getElementById('canvas-adaptive');
      const fixedPanel   = document.querySelector('.fixed-panel');
      const adaptPanel   = document.querySelector('.adaptive-panel');
      if (fixedCanvas && adaptCanvas) {
        const fixedClip = document.getElementById('compare-fixed-clip');
        const adaptiveBg = document.getElementById('compare-adaptive-bg');
        if (fixedPanel && adaptPanel) {
          adaptiveBg.innerHTML = '';
          adaptiveBg.appendChild(adaptCanvas.cloneNode(true));
          fixedClip.innerHTML = '';
          fixedClip.appendChild(fixedCanvas.cloneNode(true));
        }
        wrap.style.height = (adaptCanvas.offsetHeight || 380) + 'px';
      }
      wrap.classList.add('active');
      simGrid.style.display = 'none';
      updateHandle(handlePct);
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fa-solid fa-left-right"></i> Compare Mode';
      wrap.classList.remove('active');
      simGrid.style.display = '';
    }
  }
  function updateHandle(pct) {
    handlePct = Math.max(5, Math.min(95, pct));
    const wrap = document.getElementById('compare-mode-wrap');
    const clip = document.getElementById('compare-fixed-clip');
    const handle = document.getElementById('compare-handle');
    if (!wrap || !clip || !handle) return;
    const w = wrap.offsetWidth;
    clip.style.width = (handlePct) + '%';
    handle.style.left = (handlePct) + '%';
  }
  function startDrag(e) {
    e.preventDefault();
    const wrap = document.getElementById('compare-mode-wrap');
    dragStartX = (e.touches ? e.touches[0].clientX : e.clientX);
    function onMove(ev) {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const rect = wrap.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      updateHandle(pct);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onUp);
  }
  function injectKbdHint() {
    const simControlsCard = document.querySelector('.sim-controls-card');
    if (!simControlsCard) return;
    const kbdDismissed = sessionStorage.getItem('signaliq_kbd_dismissed');
    if (kbdDismissed) return;
    const hint = document.createElement('div');
    hint.id = 'kbd-hint';
    hint.innerHTML = `
      <div class="kbd-keys">
        <span class="kbd-key"><kbd>1</kbd> Low density</span>
        <span class="kbd-key"><kbd>2</kbd> Medium density</span>
        <span class="kbd-key"><kbd>3</kbd> High density</span>
        <span class="kbd-key"><kbd>R</kbd> Randomize</span>
        <span class="kbd-key"><kbd>Esc</kbd> Reset</span>
        <span class="kbd-key"><kbd>Click lane</kbd> Cycle density</span>
      </div>
      <button id="kbd-dismiss" title="Dismiss keyboard shortcuts" aria-label="Dismiss">×</button>
    `;
    simControlsCard.appendChild(hint);
    document.getElementById('kbd-dismiss').addEventListener('click', () => {
      hint.remove();
      sessionStorage.setItem('signaliq_kbd_dismissed', '1');
    });
  }
  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      const simTab = document.getElementById('tab-simulator');
      if (!simTab || simTab.style.display === 'none') return;
      if (document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
      const dirs = ['N','S','E','W'];
      if (e.key === '1') {
        dirs.forEach(d => {
          document.querySelectorAll(`.density-group select[data-dir="${d}"]`).forEach(s => {
            s.value = 'low'; s.dispatchEvent(new Event('change'));
          });
        });
      } else if (e.key === '2') {
        dirs.forEach(d => {
          document.querySelectorAll(`.density-group select[data-dir="${d}"]`).forEach(s => {
            s.value = 'medium'; s.dispatchEvent(new Event('change'));
          });
        });
      } else if (e.key === '3') {
        dirs.forEach(d => {
          document.querySelectorAll(`.density-group select[data-dir="${d}"]`).forEach(s => {
            s.value = 'high'; s.dispatchEvent(new Event('change'));
          });
        });
      } else if (e.key === 'r' || e.key === 'R') {
        const randBtn = document.getElementById('randomize-btn');
        if (randBtn) randBtn.click();
      } else if (e.key === 'Escape') {
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.click();
        if (incidentActive) clearIncident();
      }
    });
  }
  function init() {
    attachCanvasClicks();
    injectIncidentButton();
    buildCompareWrapper();
    injectKbdHint();
    bindKeyboardShortcuts();
    console.log('[SIGNAL-IQ] simulator-enhancements.js loaded');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();