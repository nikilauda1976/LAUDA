import { PhotoViewer, PHOTO_SETS } from './photo-viewer.js';
import { initAnimations } from './animations.js';

/* ── Boot photo viewers ── */
Object.entries(PHOTO_SETS).forEach(([id, photos]) => {
  const viewer = new PhotoViewer(`viewer-${id}`, photos);
  viewer.init();
});

/* ── GSAP animations ── */
initAnimations();

/* ── Smooth nav scroll with offset for fixed nav ── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
    const top = target.getBoundingClientRect().top + window.scrollY - navH;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
