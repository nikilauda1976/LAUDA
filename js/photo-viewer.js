/* ═══════════════════════════════════════════════
   PHOTO VIEWER — Drag-to-browse real car photos
   ═══════════════════════════════════════════════ */

export class PhotoViewer {
  constructor(containerId, photos) {
    this.containerId = containerId;
    this.photos = photos;
    this.current = 0;
    this.isDragging = false;
    this.startX = 0;
    this.autoTimer = null;
    this.loaded = new Set();
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    this.container = container;
    this._buildDOM();
    this._bindEvents();
    this._preloadNext();
    this._startAuto();
  }

  _buildDOM() {
    this.container.innerHTML = '';
    this.container.classList.add('photo-viewer-wrap');

    /* Slide stack */
    this.track = document.createElement('div');
    this.track.className = 'pv-track';

    this.slides = this.photos.map((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'pv-slide' + (i === 0 ? ' pv-active' : '');
      /* Lazy-load: only load first image immediately */
      const img = document.createElement('img');
      img.className = 'pv-img';
      img.alt = '';
      img.draggable = false;
      if (i === 0) {
        img.src = src;
        this.loaded.add(0);
      } else {
        img.dataset.src = src;
      }
      slide.appendChild(img);
      this.track.appendChild(slide);
      return slide;
    });

    this.container.appendChild(this.track);

    /* Dark vignette overlay */
    const vignette = document.createElement('div');
    vignette.className = 'pv-vignette';
    this.container.appendChild(vignette);

    /* Counter */
    this.counterEl = document.createElement('div');
    this.counterEl.className = 'pv-counter';
    this._updateCounter();
    this.container.appendChild(this.counterEl);

    /* Progress bar */
    this.progressTrack = document.createElement('div');
    this.progressTrack.className = 'pv-progress-track';
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'pv-progress-bar';
    this.progressTrack.appendChild(this.progressBar);
    this.container.appendChild(this.progressTrack);
    this._updateProgress();

    /* Drag hint */
    this.hintEl = document.createElement('div');
    this.hintEl.className = 'drag-hint';
    this.hintEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 12H3M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4"/>
      </svg>
      <span>Drag to browse</span>`;
    this.container.appendChild(this.hintEl);

    /* Nav arrows */
    ['prev','next'].forEach(dir => {
      const btn = document.createElement('button');
      btn.className = `pv-arrow pv-${dir}`;
      btn.innerHTML = dir === 'prev' ? '‹' : '›';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this._advance(dir === 'next' ? 1 : -1);
        this._resetAuto();
      });
      this.container.appendChild(btn);
    });
  }

  _goTo(index) {
    const prev = this.current;
    this.current = ((index % this.photos.length) + this.photos.length) % this.photos.length;
    if (prev === this.current) return;

    /* Load image if not yet loaded */
    this._loadSlide(this.current);
    this._preloadNext();

    this.slides[prev].classList.remove('pv-active');
    this.slides[this.current].classList.add('pv-active');
    this._updateCounter();
    this._updateProgress();
  }

  _advance(delta) {
    this._goTo(this.current + delta);
  }

  _loadSlide(index) {
    if (this.loaded.has(index)) return;
    const img = this.slides[index].querySelector('img');
    if (img && img.dataset.src) {
      img.src = img.dataset.src;
      delete img.dataset.src;
      this.loaded.add(index);
    }
  }

  _preloadNext() {
    const next = (this.current + 1) % this.photos.length;
    const prev = (this.current - 1 + this.photos.length) % this.photos.length;
    this._loadSlide(next);
    this._loadSlide(prev);
  }

  _updateCounter() {
    if (this.counterEl) {
      this.counterEl.innerHTML =
        `<span class="pv-cur">${String(this.current + 1).padStart(2,'0')}</span>` +
        `<span class="pv-sep"> / </span>` +
        `<span class="pv-tot">${String(this.photos.length).padStart(2,'0')}</span>`;
    }
  }

  _updateProgress() {
    if (this.progressBar) {
      const pct = ((this.current + 1) / this.photos.length) * 100;
      this.progressBar.style.width = pct + '%';
    }
  }

  _startAuto() {
    this.autoTimer = setInterval(() => {
      if (!this.isDragging) this._advance(1);
    }, 3500);
  }

  _resetAuto() {
    clearInterval(this.autoTimer);
    this._startAuto();
  }

  _bindEvents() {
    const el = this.container;
    el.addEventListener('mousedown', e => this._onDown(e.clientX));
    window.addEventListener('mousemove', e => { if (this.isDragging) this._onMove(e.clientX); });
    window.addEventListener('mouseup', e => { if (this.isDragging) this._onUp(e.clientX); });

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      this._onDown(e.touches[0].clientX);
    }, { passive: false });
    window.addEventListener('touchmove', e => {
      if (!this.isDragging) return;
      e.preventDefault();
      this._onMove(e.touches[0].clientX);
    }, { passive: false });
    window.addEventListener('touchend', e => {
      if (this.isDragging) this._onUp(e.changedTouches[0].clientX);
    });
  }

  _onDown(x) {
    this.isDragging = true;
    this.startX = x;
    clearInterval(this.autoTimer);
    this.container.style.cursor = 'grabbing';
    if (this.hintEl) this.hintEl.classList.add('hidden');
  }

  _onMove(x) {
    /* Subtle visual drag feedback on active slide */
    const delta = x - this.startX;
    const slide = this.slides[this.current];
    slide.style.transform = `translateX(${delta * 0.04}px) scale(${1 - Math.abs(delta) * 0.0002})`;
  }

  _onUp(x) {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.container.style.cursor = '';

    /* Reset transform */
    this.slides[this.current].style.transform = '';

    const delta = x - this.startX;
    if (delta < -60) this._advance(1);
    else if (delta > 60) this._advance(-1);

    this._resetAuto();
  }
}

/* Photo sets */
export const PHOTO_SETS = {
  '912': [
    'https://cdn.elferspot.com/wp-content/uploads/2022/09/28/Porsche-912-Targa-Soft-Window-for-sale-orange-France-1-scaled.jpg',
    'https://cdn.elferspot.com/wp-content/uploads/2022/09/28/Porsche-912-Targa-Soft-Window-for-sale-orange-France-2-scaled.jpg',
    'https://cdn.elferspot.com/wp-content/uploads/2022/09/28/Porsche-912-Targa-Soft-Window-for-sale-orange-France-3-scaled.jpg',
    'https://cdn.elferspot.com/wp-content/uploads/2022/09/28/Porsche-912-Targa-Soft-Window-for-sale-orange-France-4-scaled.jpg',
    'https://cdn.elferspot.com/wp-content/uploads/2022/09/28/Porsche-912-Targa-Soft-Window-for-sale-orange-France-5-scaled.jpg',
    'https://cdn.elferspot.com/wp-content/uploads/2022/09/28/Porsche-912-Targa-Soft-Window-for-sale-orange-France-6-scaled.jpg',
    'https://cdn.elferspot.com/wp-content/uploads/2022/09/28/Porsche-912-Targa-Soft-Window-for-sale-orange-France-7-scaled.jpg',
    'https://cdn.elferspot.com/wp-content/uploads/2022/09/28/Porsche-912-Targa-Soft-Window-for-sale-orange-France-8-scaled.jpg',
    'https://cdn.elferspot.com/wp-content/uploads/2022/09/28/Porsche-912-Targa-Soft-Window-for-sale-orange-France-10-scaled.jpg',
    'https://cdn.elferspot.com/wp-content/uploads/2022/09/28/Porsche-912-Targa-Soft-Window-for-sale-orange-France-12-scaled.jpg',
  ],
  '964': [
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0219.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0217.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0222.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0218.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0220.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0279.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0277.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0271.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0276.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0283.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0221.jpeg',
    'https://cdn.elferspot.com/wp-content/uploads/2025/06/06/img_0213.jpeg',
  ],
  'x5': [
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-00.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-01.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-02.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-03.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-05.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-06.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-07.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-08.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-09.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-10.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-11.jpg',
    'https://cdn.bmwblog.com/wp-content/uploads/2023/10/2024-bmw-x5-xdrive40i-tanzanite-blue-12.jpg',
  ],
  '991': [
    'https://cdn.prod.website-files.com/637dd83cd93444d7a965962c/69f38a17dff029f8318aeaac_DSC02081.jpg',
    'https://cdn.prod.website-files.com/637dd83cd93444d7a965962c/69f38a2eaa0d46e730596bd1_DSC02075.jpg',
    'https://cdn.prod.website-files.com/637dd83cd93444d7a965962c/69f38a63bc093d858fe4f4e3_DSC02083.jpg',
    'https://cdn.prod.website-files.com/637dd83cd93444d7a965962c/69f38a38dff029f8318af712_DSC02092.jpg',
    'https://cdn.prod.website-files.com/637dd83cd93444d7a965962c/69f38a80646c7ea941c515ee_DSC02088.jpg',
    'https://cdn.prod.website-files.com/637dd83cd93444d7a965962c/69f38a81c592dfebe2d78c9d_DSC02090.jpg',
    'https://cdn.prod.website-files.com/637dd83cd93444d7a965962c/69f38a803d0ee09aeb125cfb_DSC02091.jpg',
    'https://cdn.prod.website-files.com/637dd83cd93444d7a965962c/69f38a81c592dfebe2d78c99_DSC02097.jpg',
  ],
};
