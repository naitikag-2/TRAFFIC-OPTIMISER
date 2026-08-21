(() => {
  'use strict';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('visible'));
    return;
  }
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('[animations.js] GSAP or ScrollTrigger not loaded — skipping scroll animations.');
    document.querySelectorAll('.section').forEach(s => s.classList.add('visible'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  const EASE = 'power2.out';
  const EASE_EXPO = 'expo.out';
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
  const headline = document.querySelector('.headline');
  if (headline) {
    setTimeout(() => headline.classList.add('glow-active'), 1200);
  }
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
    gsap.from('#simulator .sim-controls-card', {
      opacity: 0, y: 14, duration: 0.5, ease: EASE,
      scrollTrigger: { trigger: '.sim-controls-card', start: 'top 90%', toggleActions: 'play none none none' }
    });
  }
  const aiSection = document.querySelector('#ai-engine');
  if (aiSection) {
    gsap.from('#ai-engine .section-tag, #ai-engine .section-title, #ai-engine .section-sub', {
      opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: EASE,
      scrollTrigger: { trigger: '#ai-engine', start: 'top 80%', toggleActions: 'play none none none' }
    });
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
    gsap.from('#ai-engine .engine-tags span', {
      opacity: 0, y: 10, scale: 0.9, duration: 0.4, stagger: 0.06, ease: EASE,
      scrollTrigger: { trigger: '.engine-tags', start: 'top 90%', toggleActions: 'play none none none' }
    });
  }
  const dashSection = document.querySelector('#dashboard');
  if (dashSection) {
    gsap.from('#dashboard .section-tag, #dashboard .section-title, #dashboard .section-sub', {
      opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: EASE,
      scrollTrigger: { trigger: '#dashboard', start: 'top 80%', toggleActions: 'play none none none' }
    });
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
    gsap.from('.chart-card', {
      opacity: 0, x: -30, duration: 0.7, ease: EASE,
      scrollTrigger: { trigger: '.dash-grid', start: 'top 85%', toggleActions: 'play none none none' }
    });
    gsap.from('.map-card', {
      opacity: 0, x: 30, duration: 0.7, ease: EASE,
      scrollTrigger: { trigger: '.dash-grid', start: 'top 85%', toggleActions: 'play none none none' }
    });
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
  const techSection = document.querySelector('#tech-stack');
  if (techSection) {
    gsap.from('#tech-stack .section-tag, #tech-stack .section-title, #tech-stack .section-sub', {
      opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: EASE,
      scrollTrigger: { trigger: '#tech-stack', start: 'top 80%', toggleActions: 'play none none none' }
    });
    const archNodes = document.querySelectorAll('.arch-node');
    const archFlow = document.querySelector('.arch-flow');
    if (archFlow && archNodes.length > 0) {
      const activeLine = document.createElement('div');
      activeLine.className = 'arch-flow-line-active';
      archFlow.appendChild(activeLine);
      archNodes.forEach(node => {
        const title = node.querySelector('.node-title');
        const small = node.querySelector('small');
        const iconContainer = node.querySelector('.arch-icon');
        if (iconContainer) {
          iconContainer.style.position = 'relative';
          const glow = document.createElement('div');
          glow.className = 'arch-icon-glow';
          iconContainer.appendChild(glow);
        }
        gsap.set(node, { opacity: 0, y: 40, scale: 0.96 });
        if (small) gsap.set(small, { opacity: 0 });
      });
      ScrollTrigger.create({
        trigger: archFlow,
        start: 'top 60%',
        end: 'bottom 60%',
        scrub: 0.3,
        animation: gsap.to(activeLine, {
          scaleY: 1,
          ease: 'none'
        })
      });
      archNodes.forEach((node, i) => {
        const icon = node.querySelector('.arch-icon');
        const glow = node.querySelector('.arch-icon-glow');
        const subtitle = node.querySelector('small');
        ScrollTrigger.create({
          trigger: node,
          start: 'top 75%',
          id: `archNode-${i}`,
          once: true,
          onEnter: () => {
            gsap.to(node, {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              ease: 'power2.out',
              delay: i === 0 ? 0 : 0.15
            });
            if (icon && glow) {
              const tl = gsap.timeline({ delay: i === 0 ? 0.2 : 0.35 });
              tl.to(icon, { scale: 1.15, duration: 0.2, ease: 'power1.out' })
                .to(glow, { opacity: 0.6, duration: 0.2, ease: 'power1.out' }, '<')
                .to(icon, { scale: 1, duration: 0.3, ease: 'power2.out' })
                .to(glow, { opacity: 0, duration: 0.3, ease: 'power2.out' }, '<');
            }
            if (subtitle) {
              gsap.to(subtitle, {
                opacity: 1,
                duration: 0.5,
                delay: i === 0 ? 0.4 : 0.55,
                ease: 'power2.out'
              });
            }
          }
        });
        ScrollTrigger.create({
          trigger: node,
          start: 'top 55%',
          end: 'bottom 45%',
          toggleClass: { targets: node, className: 'is-active-stage' }
        });
      });
    }
    gsap.from('.arch-feedback', {
      opacity: 0, y: 12, duration: 0.5, ease: EASE,
      scrollTrigger: { trigger: '.arch-feedback', start: 'top 90%', toggleActions: 'play none none none' }
    });
    gsap.from('.tech-tags span', {
      opacity: 0, y: 12, scale: 0.92, duration: 0.35, stagger: 0.05, ease: EASE,
      scrollTrigger: { trigger: '.tech-tags', start: 'top 90%', toggleActions: 'play none none none' }
    });
  }
  const roadmap = document.querySelector('#roadmap');
  if (roadmap) {
    gsap.from('#roadmap .section-tag, #roadmap .section-title', {
      opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: EASE,
      scrollTrigger: { trigger: '#roadmap', start: 'top 80%', toggleActions: 'play none none none' }
    });
    const tlLine = document.querySelector('.timeline::before');
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
  document.querySelectorAll('.section').forEach(section => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 88%',
      once: true,
      onEnter: () => section.classList.add('visible')
    });
  });
  const footer = document.querySelector('.site-footer');
  if (footer) {
    gsap.from(footer, {
      opacity: 0, y: 20, duration: 0.6, ease: EASE,
      scrollTrigger: { trigger: footer, start: 'top 95%', toggleActions: 'play none none none' }
    });
  }
  console.log('✨ SIGNAL-IQ scroll animations initialized (GSAP + ScrollTrigger)');
})();