/* ═══════════════════════════════════════════════════════════════
   SIGNAL-IQ — walkthrough.js
   Feature 3: 60-Second Guided Walkthrough Overlay
   Isolated: remove/disable independently.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const STOPS = [
    {
      tab: 'home',
      label: 'Stop 1 of 4 — Platform Overview',
      text: 'SIGNAL-IQ replaces fixed traffic timers with real-time AI optimization — reducing intersection wait time by up to 42%.'
    },
    {
      tab: 'simulator',
      label: 'Stop 2 of 4 — Live Simulation',
      text: 'Watch SIGNAL-IQ adapt in real time vs the fixed 30s cycle struggling under load. Click "Simulate Incident" to see the biggest difference.'
    },
    {
      tab: 'dashboard',
      label: 'Stop 3 of 4 — City-Wide Impact',
      text: '42% less wait time, 28% lower emissions — measured across our test scenarios on Tier-1 Indian metropolitan junctions.'
    },
    {
      tab: 'architecture',
      label: 'Stop 4 of 4 — System Architecture',
      text: 'From camera feed to physical signal hardware command in under 120ms — sub-second end-to-end pipeline via Edge TPU.'
    }
  ];

  const DWELL = 15000; // ms per stop
  let currentStop = 0;
  let wtTimer = null;
  let wtFillTimer = null;
  let active = false;

  /* ── DOM refs ─────────────────────────────────────────────── */
  let overlay, box, textLabel, textBody, dotsWrap, fillBar, btnPrev, btnNext, btnExit;

  /* ── Render stop ─────────────────────────────────────────── */
  function goTo(idx) {
    if (idx < 0) idx = STOPS.length - 1;
    if (idx >= STOPS.length) idx = 0;
    currentStop = idx;

    const stop = STOPS[idx];

    // navigate tab
    if (typeof window.signaliqGoTo === 'function') window.signaliqGoTo(stop.tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // update text
    textLabel.textContent = stop.label;
    textBody.textContent  = stop.text;

    // update dots
    Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === idx));

    // reset & animate fill bar
    fillBar.style.transition = 'none';
    fillBar.style.width = '0%';
    clearTimeout(wtTimer);
    clearTimeout(wtFillTimer);

    // trigger reflow for transition restart
    void fillBar.offsetWidth;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
      fillBar.style.transition = `width ${DWELL}ms linear`;
      fillBar.style.width = '100%';
    }

    // auto-advance
    wtTimer = setTimeout(() => {
      if (idx === STOPS.length - 1) { exitWalkthrough(); return; }
      goTo(idx + 1);
    }, DWELL);
  }

  /* ── Exit ─────────────────────────────────────────────────── */
  function exitWalkthrough() {
    active = false;
    clearTimeout(wtTimer);
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', onKeyDown);
    // reset walkthrough button
    const btn = document.getElementById('btn-walkthrough');
    if (btn) btn.classList.remove('active');
  }

  /* ── Start ────────────────────────────────────────────────── */
  function startWalkthrough() {
    if (active) { exitWalkthrough(); return; }
    active = true;
    const btn = document.getElementById('btn-walkthrough');
    if (btn) btn.classList.add('active');

    currentStop = 0;
    overlay.classList.add('visible');
    document.addEventListener('keydown', onKeyDown);
    goTo(0);
  }

  /* ── Key handler ─────────────────────────────────────────── */
  function onKeyDown(e) {
    if (!active) return;
    if (e.key === 'Escape') exitWalkthrough();
    if (e.key === 'ArrowRight') { goTo(currentStop + 1); }
    if (e.key === 'ArrowLeft')  { goTo(currentStop - 1); }
  }

  /* ── Build overlay DOM ────────────────────────────────────── */
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'wt-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', '60-Second Walkthrough');

    box = document.createElement('div');
    box.id = 'wt-box';

    // progress bar
    const timerBar = document.createElement('div');
    timerBar.className = 'wt-timer-bar';
    fillBar = document.createElement('div');
    fillBar.className = 'wt-timer-fill';
    timerBar.appendChild(fillBar);

    // label + text
    textLabel = document.createElement('div');
    textLabel.className = 'wt-label';

    textBody = document.createElement('div');
    textBody.className = 'wt-text';

    // controls row
    const controls = document.createElement('div');
    controls.className = 'wt-controls';

    // dots
    dotsWrap = document.createElement('div');
    dotsWrap.className = 'wt-dots';
    STOPS.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'wt-dot';
      d.setAttribute('aria-label', `Stop ${i + 1}`);
      d.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(d);
    });

    // nav
    const nav = document.createElement('div');
    nav.className = 'wt-nav';

    btnExit = document.createElement('button');
    btnExit.className = 'wt-btn exit';
    btnExit.innerHTML = '<i class="fa-solid fa-xmark"></i> Exit';
    btnExit.addEventListener('click', exitWalkthrough);

    btnPrev = document.createElement('button');
    btnPrev.className = 'wt-btn';
    btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i> Prev';
    btnPrev.addEventListener('click', () => goTo(currentStop - 1));

    btnNext = document.createElement('button');
    btnNext.className = 'wt-btn primary';
    btnNext.innerHTML = 'Next <i class="fa-solid fa-chevron-right"></i>';
    btnNext.addEventListener('click', () => goTo(currentStop + 1));

    nav.appendChild(btnExit);
    nav.appendChild(btnPrev);
    nav.appendChild(btnNext);

    controls.appendChild(dotsWrap);
    controls.appendChild(nav);

    box.appendChild(timerBar);
    box.appendChild(textLabel);
    box.appendChild(textBody);
    box.appendChild(controls);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // click outside box to exit
    overlay.addEventListener('click', e => { if (e.target === overlay) exitWalkthrough(); });
  }

  /* ── Expose globally ─────────────────────────────────────── */
  window.signaliqStartWalkthrough = startWalkthrough;
  window.signaliqExitWalkthrough  = exitWalkthrough;

  function init() {
    buildOverlay();
    console.log('[SIGNAL-IQ] walkthrough.js loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
