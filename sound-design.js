/* ═══════════════════════════════════════════════════════════════
   SIGNAL-IQ — sound-design.js
   Feature 5: Web Audio API Sound Effects (OFF by default)
   All sounds synthesized — no external files.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── State ───────────────────────────────────────────────── */
  let ctx = null;
  let enabled = false;
  window.__signaliq_soundEnabled = false;

  /* ── Create AudioContext lazily on first enable ───────────── */
  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ── Core tone helper ────────────────────────────────────── */
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

  /* ── Named sounds ────────────────────────────────────────── */
  const sounds = {
    // Soft blip on signal phase change
    phaseChange: () => {
      playTone(440, 0.08, 'sine', 0.14);
    },

    // Ascending three-note chime when KPI counter completes
    kpiComplete: () => {
      playTone(523, 0.12, 'sine', 0.12, 0.0);
      playTone(659, 0.12, 'sine', 0.12, 0.12);
      playTone(784, 0.18, 'sine', 0.12, 0.24);
    },

    // Short descending alert for Simulate Incident
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

  /* ── Expose globally so other modules can call ───────────── */
  window.signaliqSound = sounds;

  /* ── Sound toggle button wiring ──────────────────────────── */
  function toggleSound() {
    enabled = !enabled;
    window.__signaliq_soundEnabled = enabled;

    const btn = document.getElementById('btn-sound-toggle');
    if (!btn) return;

    if (enabled) {
      btn.classList.add('active');
      btn.innerHTML = '<i class="fa-solid fa-volume-high"></i><span>Sound On</span>';
      // Play a quick preview chime so user knows it worked
      sounds.kpiComplete();
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i><span>Sound Off</span>';
    }
  }

  /* ── Hook into KPI counter completions ───────────────────── */
  function hookKpiCounters() {
    // Observe when kpi-val elements stop changing
    const kpiVals = document.querySelectorAll('.kpi-val');
    if (!kpiVals.length) return;

    let fired = false;
    const mo = new MutationObserver(() => {
      if (fired) return;
      // check if any have reached their target
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

  /* ── Hook into simulator phase changes ───────────────────── */
  function hookSimulatorPhase() {
    // Poll for phase changes on simFixed/simAdaptive
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
        // only play once if both change simultaneously
      }
    }, 200);
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    // Wire up the sound button created by judge-mode.js
    const btn = document.getElementById('btn-sound-toggle');
    if (btn) btn.addEventListener('click', e => { e.stopPropagation(); toggleSound(); });

    hookKpiCounters();
    hookSimulatorPhase();
    console.log('[SIGNAL-IQ] sound-design.js loaded (default: muted)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // wait a tick for judge-mode.js to inject the button
    setTimeout(init, 100);
  }
})();
