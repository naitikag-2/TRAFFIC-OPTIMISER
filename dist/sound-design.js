(function () {
  'use strict';
  let ctx = null;
  let enabled = false;
  window.__signaliq_soundEnabled = false;
  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function playTone(freq, duration, type = 'sine', gainPeak = 0.18, delay = 0) {
    if (!enabled) return;
    const ac = getCtx();
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
  const sounds = {
    phaseChange: () => {
      playTone(440, 0.08, 'sine', 0.14);
    },
    kpiComplete: () => {
      playTone(523, 0.12, 'sine', 0.12, 0.0);
      playTone(659, 0.12, 'sine', 0.12, 0.12);
      playTone(784, 0.18, 'sine', 0.12, 0.24);
    },
    incident: () => {
      const ac = getCtx();
      if (!enabled) return;
      const t0 = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, t0);
      osc.frequency.linearRampToValueAtTime(300, t0 + 0.2);
      gain.gain.setValueAtTime(0.09, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.25);
    }
  };
  window.signaliqSound = sounds;
  function toggleSound() {
    enabled = !enabled;
    window.__signaliq_soundEnabled = enabled;
    const btn = document.getElementById('btn-sound-toggle');
    if (!btn) return;
    if (enabled) {
      btn.classList.add('active');
      btn.innerHTML = '<i class="fa-solid fa-volume-high"></i><span>Sound On</span>';
      sounds.kpiComplete();
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i><span>Sound Off</span>';
    }
  }
  function hookKpiCounters() {
    const kpiVals = document.querySelectorAll('.kpi-val');
    if (!kpiVals.length) return;
    let fired = false;
    const mo = new MutationObserver(() => {
      if (fired) return;
      kpiVals.forEach(el => {
        const target = el.dataset.target;
        if (target && el.textContent.includes(target)) {
          fired = true;
          sounds.kpiComplete();
        }
      });
    });
    kpiVals.forEach(el => mo.observe(el, { characterData: true, childList: true, subtree: true }));
  }
  function hookSimulatorPhase() {
    let lastPhaseFixed = -1;
    let lastPhaseAdaptive = -1;
    setInterval(() => {
      if (!enabled) return;
      if (window.simFixed && window.simFixed.phase !== lastPhaseFixed) {
        lastPhaseFixed = window.simFixed.phase;
        sounds.phaseChange();
      }
      if (window.simAdaptive && window.simAdaptive.phase !== lastPhaseAdaptive) {
        lastPhaseAdaptive = window.simAdaptive.phase;
      }
    }, 200);
  }
  function init() {
    const btn = document.getElementById('btn-sound-toggle');
    if (btn) btn.addEventListener('click', e => { e.stopPropagation(); toggleSound(); });
    hookKpiCounters();
    hookSimulatorPhase();
    console.log('[SIGNAL-IQ] sound-design.js loaded (default: muted)');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
})();