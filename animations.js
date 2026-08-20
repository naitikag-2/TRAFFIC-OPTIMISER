/* ═══════════════════════════════════════════
   SIGNAL-IQ — animations.js
   GSAP ScrollTrigger animation layer
   Additive — does NOT touch main.js internals
   ═══════════════════════════════════════════ */

(() => {
  'use strict';

  // ── Bail out if user prefers reduced motion ──
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    // Make all sections visible immediately (override the scroll-reveal CSS)
    document.querySelectorAll('.section').forEach(s => s.classList.add('visible'));
    return;
  }

  // ── Wait for GSAP to be available ──
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('[animations.js] GSAP or ScrollTrigger not loaded — skipping scroll animations.');
    document.querySelectorAll('.section').forEach(s => s.classList.add('visible'));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Shared easing
  const EASE = 'power2.out';
  const EASE_EXPO = 'expo.out';

  // ═══════════════════════════════════════════
  // 1. HERO VIEWPORT
  // ═══════════════════════════════════════════

  // 1a. Video parallax — background scrolls slower (depth effect)
  const bgEl = document.querySelector('.bg');
  if (bgEl) {
    gsap.to(bgEl, {
      yPercent: 30,
      scale: 1.08,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero-viewport',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      }
    });
  }

  // 1b. Headline glow pulse class (activate after load animation finishes)
  const headline = document.querySelector('.headline');
  if (headline) {
    setTimeout(() => headline.classList.add('glow-active'), 1200);
  }

  // 1c. Foreground content fades out on scroll for depth
  const pageEl = document.querySelector('.page');
  if (pageEl) {
    gsap.to(pageEl, {
      opacity: 0,
      y: -40,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero-viewport',
        start: '60% top',
        end: 'bottom top',
        scrub: true,
      }
    });
  }

  // ═══════════════════════════════════════════
  // 2. SIMULATOR SECTION
  // ═══════════════════════════════════════════

  // 2a. Section header text reveal
  const simSection = document.querySelector('#simulator');
  if (simSection) {
    gsap.from('#simulator .section-tag', {
      opacity: 0, x: -20, duration: 0.5, ease: EASE,
      scrollTrigger: { trigger: '#simulator', start: 'top 80%', toggleActions: 'play none none none' }
    });
    gsap.from('#simulator .section-title', {
      opacity: 0, y: 20, duration: 0.6, delay: 0.1, ease: EASE,
      scrollTrigger: { trigger: '#simulator', start: 'top 80%', toggleActions: 'play none none none' }
    });
    gsap.from('#simulator .section-sub', {
      opacity: 0, y: 16, duration: 0.6, delay: 0.2, ease: EASE,
      scrollTrigger: { trigger: '#simulator', start: 'top 80%', toggleActions: 'play none none none' }
    });

    // 2b. Canvas panels scale-in (wraps the parent .sim-panel, NOT the canvas itself)
    gsap.from('#simulator .sim-panel', {
      opacity: 0,
      scale: 0.9,
      duration: 0.7,
      stagger: 0.15,
      ease: EASE,
      scrollTrigger: {
        trigger: '.sim-grid',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });

    // 2c. Controls fade in
    gsap.from('#simulator .sim-controls-card', {
      opacity: 0, y: 14, duration: 0.5, ease: EASE,
      scrollTrigger: { trigger: '.sim-controls-card', start: 'top 90%', toggleActions: 'play none none none' }
    });
  }

  // ═══════════════════════════════════════════
  // 3. AI RECOMMENDATION ENGINE
  // ═══════════════════════════════════════════

  const aiSection = document.querySelector('#ai-engine');
  if (aiSection) {
    // 3a. Section header
    gsap.from('#ai-engine .section-tag, #ai-engine .section-title, #ai-engine .section-sub', {
      opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: EASE,
      scrollTrigger: { trigger: '#ai-engine', start: 'top 80%', toggleActions: 'play none none none' }
    });

    // 3b. Engine cards: 3D perspective flip-in
    gsap.from('#ai-engine .engine-card', {
      opacity: 0,
      rotateX: 15,
      y: 30,
      duration: 0.7,
      stagger: 0.12,
      ease: EASE,
      transformPerspective: 800,
      scrollTrigger: {
        trigger: '.engine-grid',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });

    // 3c. Phase progress bars animate width from 0
    ScrollTrigger.create({
      trigger: '.phase-grid',
      start: 'top 85%',
      once: true,
      onEnter: () => {
        document.querySelectorAll('.phase-fill').forEach(bar => {
          const target = bar.style.width || '50%';
          bar.style.width = '0%';
          gsap.to(bar, { width: target, duration: 1.2, ease: EASE_EXPO, delay: 0.3 });
        });
      }
    });

    // 3d. Engine tags stagger
    gsap.from('#ai-engine .engine-tags span', {
      opacity: 0, y: 10, scale: 0.9, duration: 0.4, stagger: 0.06, ease: EASE,
      scrollTrigger: { trigger: '.engine-tags', start: 'top 90%', toggleActions: 'play none none none' }
    });
  }

  // ═══════════════════════════════════════════
  // 4. CITY CONTROL DASHBOARD
  // ═══════════════════════════════════════════

  const dashSection = document.querySelector('#dashboard');
  if (dashSection) {
    // 4a. Section header
    gsap.from('#dashboard .section-tag, #dashboard .section-title, #dashboard .section-sub', {
      opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: EASE,
      scrollTrigger: { trigger: '#dashboard', start: 'top 80%', toggleActions: 'play none none none' }
    });

    // 4b. KPI cards: staggered fade-up
    gsap.from('.kpi-card', {
      opacity: 0,
      y: 30,
      duration: 0.6,
      stagger: 0.12,
      ease: EASE,
      scrollTrigger: {
        trigger: '.kpi-grid',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });

    // 4c. Chart + Map cards fade in
    gsap.from('.chart-card', {
      opacity: 0, x: -30, duration: 0.7, ease: EASE,
      scrollTrigger: { trigger: '.dash-grid', start: 'top 85%', toggleActions: 'play none none none' }
    });
    gsap.from('.map-card', {
      opacity: 0, x: 30, duration: 0.7, ease: EASE,
      scrollTrigger: { trigger: '.dash-grid', start: 'top 85%', toggleActions: 'play none none none' }
    });

    // 4d. Map pins sequential scale-in with ping pulse
    ScrollTrigger.create({
      trigger: '.city-map',
      start: 'top 85%',
      once: true,
      onEnter: () => {
        const pins = document.querySelectorAll('.map-pin');
        pins.forEach((pin, i) => {
          gsap.from(pin, {
            opacity: 0, scale: 0, duration: 0.5, ease: 'back.out(1.4)',
            delay: 0.2 + i * 0.15,
            onComplete: () => pin.classList.add('ping-active')
          });
        });
      }
    });
  }

  // ═══════════════════════════════════════════
  // 5. IMPACT & SCALABILITY
  // ═══════════════════════════════════════════

  const impactSection = document.querySelector('#impact');
  if (impactSection) {
    gsap.from('#impact .section-tag, #impact .section-title', {
      opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: EASE,
      scrollTrigger: { trigger: '#impact', start: 'top 80%', toggleActions: 'play none none none' }
    });

    gsap.from('.impact-card', {
      opacity: 0,
      y: 40,
      duration: 0.6,
      stagger: 0.1,
      ease: EASE,
      scrollTrigger: {
        trigger: '.impact-grid',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  }

  // ═══════════════════════════════════════════
  // 6. TECH STACK / ARCHITECTURE FLOW
  // ═══════════════════════════════════════════

  const techSection = document.querySelector('#tech-stack');
  if (techSection) {
    // 6a. Section header
    gsap.from('#tech-stack .section-tag, #tech-stack .section-title, #tech-stack .section-sub', {
      opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: EASE,
      scrollTrigger: { trigger: '#tech-stack', start: 'top 80%', toggleActions: 'play none none none' }
    });

    // 6b. Architecture nodes: sequential left-to-right reveal
    const archNodes = document.querySelectorAll('.arch-node');
    const archArrows = document.querySelectorAll('.arch-arrow');
    const archItems = [];

    // Interleave nodes and arrows for sequential reveal
    archNodes.forEach((node, i) => {
      archItems.push(node);
      if (archArrows[i]) archItems.push(archArrows[i]);
    });

    gsap.from(archItems, {
      opacity: 0,
      x: -20,
      duration: 0.45,
      stagger: 0.1,
      ease: EASE,
      scrollTrigger: {
        trigger: '.arch-flow',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });

    // 6c. Feedback loop label
    gsap.from('.arch-feedback', {
      opacity: 0, y: 12, duration: 0.5, ease: EASE,
      scrollTrigger: { trigger: '.arch-feedback', start: 'top 90%', toggleActions: 'play none none none' }
    });

    // 6d. Tech tags stagger
    gsap.from('.tech-tags span', {
      opacity: 0, y: 12, scale: 0.92, duration: 0.35, stagger: 0.05, ease: EASE,
      scrollTrigger: { trigger: '.tech-tags', start: 'top 90%', toggleActions: 'play none none none' }
    });
  }

  // ═══════════════════════════════════════════
  // 7. ROADMAP TIMELINE
  // ═══════════════════════════════════════════

  const roadmap = document.querySelector('#roadmap');
  if (roadmap) {
    // 7a. Section header
    gsap.from('#roadmap .section-tag, #roadmap .section-title', {
      opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: EASE,
      scrollTrigger: { trigger: '#roadmap', start: 'top 80%', toggleActions: 'play none none none' }
    });

    // 7b. Timeline vertical line "draw" via scaleY
    const tlLine = document.querySelector('.timeline::before');
    // Since pseudo-elements can't be targeted by GSAP directly,
    // animate the timeline container's clip-path to reveal the line progressively
    gsap.fromTo('.timeline', {
      '--tl-progress': '0%'
    }, {
      '--tl-progress': '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.timeline',
        start: 'top 80%',
        end: 'bottom 60%',
        scrub: 0.8,
      }
    });

    // 7c. Timeline items stagger in
    gsap.from('.tl-item', {
      opacity: 0,
      x: -30,
      duration: 0.6,
      stagger: 0.2,
      ease: EASE,
      scrollTrigger: {
        trigger: '.timeline',
        start: 'top 80%',
        toggleActions: 'play none none none'
      }
    });
  }

  // ═══════════════════════════════════════════
  // 8. GENERIC SECTION VISIBILITY
  //    (replaces the basic IntersectionObserver
  //     in main.js with GSAP-driven reveals)
  // ═══════════════════════════════════════════

  document.querySelectorAll('.section').forEach(section => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 88%',
      once: true,
      onEnter: () => section.classList.add('visible')
    });
  });

  // ═══════════════════════════════════════════
  // 9. FOOTER FADE-IN
  // ═══════════════════════════════════════════

  const footer = document.querySelector('.site-footer');
  if (footer) {
    gsap.from(footer, {
      opacity: 0, y: 20, duration: 0.6, ease: EASE,
      scrollTrigger: { trigger: footer, start: 'top 95%', toggleActions: 'play none none none' }
    });
  }

  console.log('✨ SIGNAL-IQ scroll animations initialized (GSAP + ScrollTrigger)');

})();
