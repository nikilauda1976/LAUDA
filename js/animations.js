/* ═══════════════════════════════════════════════
   GSAP ANIMATIONS
   Uses window.gsap / window.ScrollTrigger loaded via CDN
   ═══════════════════════════════════════════════ */

export function initAnimations() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (!gsap || !ScrollTrigger) {
    console.warn('GSAP not loaded');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ── Hero entrance ── */
  const heroTl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  heroTl
    .to('.hero-eyebrow', { opacity: 1, y: 0, duration: 1.0 }, 0.2)
    .from('.hero-eyebrow', { y: 16 }, 0.2)
    .to('.hero-title', { opacity: 1, duration: 1.4 }, 0.35)
    .from('.hero-title', { y: 60, skewY: 2 }, 0.35)
    .to('.hero-subtitle', { opacity: 1, duration: 1.1 }, 0.55)
    .from('.hero-subtitle', { y: 24 }, 0.55)
    .to('.hero-car-count', { opacity: 1, duration: 1.0 }, 0.75)
    .from('.hero-car-count', { y: 20, scale: 0.92 }, 0.75);

  /* ── Car sections: canvas + card slide in ── */
  document.querySelectorAll('.car-section').forEach(section => {
    const isReverse = section.classList.contains('car-section--reverse');
    const wrap = section.querySelector('.car-canvas-wrap');
    const card = section.querySelector('.glass-card');
    const specs = section.querySelectorAll('.spec-row');
    const model = section.querySelector('.car-model');
    const eyebrow = section.querySelector('.car-brand');

    const fromX_canvas = isReverse ? 80 : -80;
    const fromX_card   = isReverse ? -80 : 80;

    /* Canvas */
    gsap.to(wrap, {
      scrollTrigger: {
        trigger: section,
        start: 'top 82%',
        toggleActions: 'play none none reverse',
      },
      x: 0,
      opacity: 1,
      duration: 1.3,
      ease: 'expo.out',
    });

    /* Ensure initial transform is set correctly (CSS sets it, GSAP must override) */
    gsap.set(wrap, { x: fromX_canvas });

    /* Card */
    gsap.to(card, {
      scrollTrigger: {
        trigger: section,
        start: 'top 78%',
        toggleActions: 'play none none reverse',
      },
      x: 0,
      opacity: 1,
      duration: 1.3,
      ease: 'expo.out',
      delay: 0.1,
    });

    gsap.set(card, { x: fromX_card });

    /* Model name */
    if (model) {
      gsap.from(model, {
        scrollTrigger: {
          trigger: section,
          start: 'top 72%',
          toggleActions: 'play none none reverse',
        },
        y: 30,
        opacity: 0,
        duration: 1.1,
        ease: 'expo.out',
        delay: 0.2,
      });
    }

    /* Spec rows stagger */
    if (specs.length) {
      gsap.to(specs, {
        scrollTrigger: {
          trigger: section,
          start: 'top 68%',
          toggleActions: 'play none none reverse',
        },
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'expo.out',
        stagger: 0.07,
        delay: 0.28,
      });
    }
  });

  /* ── Section shared headers (heritage + palette) ── */
  document.querySelectorAll('.section-eyebrow, .section-heading, .section-subtext').forEach((el, i) => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
      opacity: 1,
      y: 0,
      duration: 1.0,
      ease: 'expo.out',
      delay: i * 0.08,
    });
    gsap.set(el, { y: 20 });
  });

  /* ── Heritage timeline items stagger ── */
  const htEras = document.querySelectorAll('.ht-era');
  if (htEras.length) {
    gsap.to(htEras, {
      scrollTrigger: {
        trigger: '.heritage-timeline',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
      opacity: 1,
      y: 0,
      duration: 0.65,
      ease: 'expo.out',
      stagger: 0.07,
    });
  }

  /* ── Palette group labels ── */
  document.querySelectorAll('.palette-group-label').forEach(el => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
      opacity: 1,
      duration: 0.8,
      ease: 'expo.out',
    });
  });

  /* ── Palette swatches stagger ── */
  document.querySelectorAll('.palette-group').forEach(group => {
    const cards = group.querySelectorAll('.csw-card');
    if (!cards.length) return;
    gsap.to(cards, {
      scrollTrigger: {
        trigger: group,
        start: 'top 82%',
        toggleActions: 'play none none reverse',
      },
      opacity: 1,
      y: 0,
      duration: 0.55,
      ease: 'expo.out',
      stagger: 0.05,
    });
  });

  /* ── Nav active link tracking ── */
  document.querySelectorAll('.car-section, .heritage-section, .palette-section').forEach(section => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onEnter:     () => _setActiveNav(section.id),
      onEnterBack: () => _setActiveNav(section.id),
      onLeave:     () => _clearNav(),
      onLeaveBack: () => _clearNav(),
    });
  });

  /* ── Scroll indicator fade out on scroll ── */
  ScrollTrigger.create({
    trigger: '.hero-section',
    start: 'top top',
    end: '25% top',
    scrub: true,
    onUpdate: self => {
      const el = document.querySelector('.scroll-indicator');
      if (el) el.style.opacity = 1 - self.progress;
    },
  });
}

function _setActiveNav(id) {
  document.querySelectorAll('[data-nav]').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
  });
}

function _clearNav() {
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.remove('active'));
}
