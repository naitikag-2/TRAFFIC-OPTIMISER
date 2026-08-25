(function () {
  'use strict';
  let judgeModeActive = false;
  let jmTimer = null;
  let jmStep = 0;
  let jmCountdownInterval = null;
  let jmSecondsLeft = 7;
  const JM_TABS    = ['home', 'simulator', 'ai-engine', 'dashboard', 'corridors', 'architecture'];
  const JM_LABELS  = ['Home', 'Simulator', 'AI Engine', 'GIS Command', 'Live Corridors', 'Architecture'];
  const JM_DWELL   = 7000;
  let btnJudge, countdownEl, countdownText, countdownDots;
  function onUserInterrupt() {
    if (!judgeModeActive) return;
    clearTimeout(jmTimer);
    clearInterval(jmCountdownInterval);
    countdownEl.classList.remove('visible');
  }
  function renderDots(step) {
    countdownDots.innerHTML = JM_TABS.map((_, i) =>
      `<div class="jm-dot ${i === step ? 'active' : ''}"></div>`
    ).join('');
  }
  function jmAdvance() {
    if (!judgeModeActive) return;
    jmStep = (jmStep + 1) % JM_TABS.length;
    const tab = JM_TABS[jmStep];
    if (typeof window.signaliqGoTo === 'function') {
      window.signaliqGoTo(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    jmSecondsLeft = Math.round(JM_DWELL / 1000);
    renderDots(jmStep);
    countdownText.textContent = `${JM_LABELS[jmStep]} — next in ${jmSecondsLeft}s`;
    clearInterval(jmCountdownInterval);
    jmCountdownInterval = setInterval(() => {
      jmSecondsLeft--;
      if (jmSecondsLeft <= 0) { clearInterval(jmCountdownInterval); return; }
      countdownText.textContent = `${JM_LABELS[jmStep]} — next in ${jmSecondsLeft}s`;
    }, 1000);
    jmTimer = setTimeout(jmAdvance, JM_DWELL);
  }
  function toggleJudgeMode() {
    judgeModeActive = !judgeModeActive;
    document.body.classList.toggle('judge-mode', judgeModeActive);
    btnJudge.classList.toggle('active', judgeModeActive);
    if (judgeModeActive) {
      jmStep = -1;
      countdownEl.classList.add('visible');
      jmAdvance();
      window.addEventListener('wheel',   onUserInterrupt, { once: true, passive: true });
      window.addEventListener('touchmove', onUserInterrupt, { once: true, passive: true });
      document.addEventListener('click', onUserInterrupt, { once: true });
    } else {
      clearTimeout(jmTimer);
      clearInterval(jmCountdownInterval);
      countdownEl.classList.remove('visible');
      window.removeEventListener('wheel', onUserInterrupt);
      window.removeEventListener('touchmove', onUserInterrupt);
      document.removeEventListener('click', onUserInterrupt);
    }
  }
  function buildFloatingControls() {
    const panel = document.createElement('div');
    panel.id = 'floating-controls';
    btnJudge = document.createElement('button');
    btnJudge.className = 'fc-btn';
    btnJudge.id = 'btn-judge-mode';
    btnJudge.setAttribute('aria-label', 'Toggle Judge Mode');
    btnJudge.innerHTML = '<i class="fa-solid fa-gavel"></i><span>Judge Mode</span>';
    btnJudge.addEventListener('click', e => { e.stopPropagation(); toggleJudgeMode(); });
    const btnSound = document.createElement('button');
    btnSound.className = 'fc-btn';
    btnSound.id = 'btn-sound-toggle';
    btnSound.setAttribute('aria-label', 'Toggle Sound');
    btnSound.innerHTML = '<i class="fa-solid fa-volume-xmark"></i><span>Sound Off</span>';
    const btnWt = document.createElement('button');
    btnWt.className = 'fc-btn';
    btnWt.id = 'btn-walkthrough';
    btnWt.setAttribute('aria-label', 'Start 60-Second Walkthrough');
    btnWt.innerHTML = '<i class="fa-solid fa-play"></i><span>60s Overview</span>';
    btnWt.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof window.signaliqStartWalkthrough === 'function') {
        window.signaliqStartWalkthrough();
      }
    });
    panel.appendChild(btnJudge);
    panel.appendChild(btnSound);
    panel.appendChild(btnWt);
    document.body.appendChild(panel);
  }
  function buildCountdown() {
    countdownEl = document.createElement('div');
    countdownEl.id = 'jm-countdown';
    countdownEl.innerHTML = '<div class="jm-progress"></div><span class="jm-text">Next in 7s</span>';
    document.body.appendChild(countdownEl);
    countdownDots = countdownEl.querySelector('.jm-progress');
    countdownText = countdownEl.querySelector('.jm-text');
  }
  function init() {
    buildCountdown();
    buildFloatingControls();
    console.log('[SIGNAL-IQ] judge-mode.js loaded');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();