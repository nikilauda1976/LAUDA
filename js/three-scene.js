import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ═══════════════════════════════════════════════
   CAR CONFIGURATIONS
   ═══════════════════════════════════════════════ */
export const CAR_CONFIGS = [
  {
    id: '912',
    color: 0xE8622A,
    emissive: 0x3A1A08,
    type: 'coupe-targa',
  },
  {
    id: '964',
    color: 0x0D1B3E,
    emissive: 0x030810,
    type: 'cabriolet',
  },
  {
    id: '991',
    color: 0x0D1B3E,
    emissive: 0x030810,
    type: 'coupe',
  },
  {
    id: 'x5',
    color: 0x0D1B3E,
    emissive: 0x030810,
    type: 'suv',
  },
];

/* ═══════════════════════════════════════════════
   CAR SCENE CLASS
   ═══════════════════════════════════════════════ */
export class CarScene {
  constructor(config) {
    this.config = config;
    this.active = false;
    this.isDragging = false;
    this.prevX = 0;
    this.prevY = 0;
    this.rotY = Math.PI * 0.15;
    this.rotX = -0.08;
    this.targetRotY = Math.PI * 0.15;
    this.targetRotX = -0.08;
    this.autoRotate = true;
    this.idleTimer = null;
    this.carGroup = null;
    this.rafId = null;
  }

  init() {
    const canvas = document.getElementById(`canvas-${this.config.id}`);
    if (!canvas) return;
    this.canvas = canvas;
    const wrap = canvas.parentElement;

    /* Renderer */
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    /* Scene */
    this.scene = new THREE.Scene();

    /* Environment for metallic reflections */
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(this.renderer), 0.04).texture;
    pmrem.dispose();

    /* Camera */
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 1.6, 6.5);
    this.camera.lookAt(0, 0.4, 0);

    /* Lights */
    this._setupLights();

    /* Car geometry */
    this.carGroup = this._buildCar();
    this.scene.add(this.carGroup);

    /* Floor */
    this._addFloor();

    /* Resize */
    this._setupResize(wrap);
    this._resize(wrap);

    /* Events */
    this._bindEvents(wrap);

    /* Render loop */
    this._loop();
  }

  /* ── Lighting ── */
  _setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    const key = new THREE.DirectionalLight(0xfff8f0, 3.0);
    key.position.set(-3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = key.shadow.camera.bottom = -5;
    key.shadow.camera.right = key.shadow.camera.top = 5;
    key.shadow.bias = -0.001;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x8899ff, 1.0);
    fill.position.set(5, 2, -3);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xeef0ff, 1.2);
    rim.position.set(0, 4, -6);
    this.scene.add(rim);

    this.scene.add(new THREE.HemisphereLight(0x334466, 0x000000, 0.4));
  }

  /* ── Floor ── */
  _addFloor() {
    const geo = new THREE.CircleGeometry(6, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x070710,
      metalness: 0.0,
      roughness: 0.95,
      transparent: true,
      opacity: 0.7,
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.y = -0.001;
    this.scene.add(floor);

    /* Subtle floor reflection ring */
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 3.5, 64),
      new THREE.MeshBasicMaterial({
        color: this.config.color,
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    this.scene.add(ring);
  }

  /* ── Build car ── */
  _buildCar() {
    const group = new THREE.Group();
    const { color, emissive, type } = this.config;

    /* Shared materials */
    const paint = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.06,
      metalness: 0.88,
      roughness: 0.12,
      envMapIntensity: 1.5,
    });

    const glass = new THREE.MeshStandardMaterial({
      color: 0x1a2840,
      metalness: 0.05,
      roughness: 0.0,
      transparent: true,
      opacity: 0.50,
      envMapIntensity: 2.0,
    });

    const trim = new THREE.MeshStandardMaterial({
      color: 0x0f0f0f,
      metalness: 0.5,
      roughness: 0.55,
    });

    const wheel = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.3,
      roughness: 0.7,
    });

    const rim = new THREE.MeshStandardMaterial({
      color: 0xd0d0d8,
      metalness: 0.92,
      roughness: 0.08,
      envMapIntensity: 2.0,
    });

    const light = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffee,
      emissiveIntensity: 1.0,
    });

    const redLight = new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: 0xff1100,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    switch (type) {
      case 'coupe-targa': this._buildTarga(group, paint, glass, trim, wheel, rim, light, redLight); break;
      case 'cabriolet':   this._buildCabriolet(group, paint, glass, trim, wheel, rim, light, redLight); break;
      case 'suv':         this._buildSUV(group, paint, glass, trim, wheel, rim, light, redLight); break;
      default:            this._buildCoupe(group, paint, glass, trim, wheel, rim, light, redLight); break;
    }

    return group;
  }

  /* ── Helper: add mesh ── */
  _mesh(geo, mat, pos, rot, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    parent.add(m);
    return m;
  }

  /* ── COUPE body (base for 991) ── */
  _buildCoupe(group, paint, glass, trim, wheel, rim, light, redLight) {
    /* Lower body */
    this._mesh(new THREE.BoxGeometry(1.72, 0.52, 4.0), paint, [0, 0.38, 0], null, group);

    /* Rear haunches (Porsche wide fenders) */
    this._mesh(new THREE.BoxGeometry(0.14, 0.38, 2.2), paint, [ 0.93, 0.32, -0.4], null, group);
    this._mesh(new THREE.BoxGeometry(0.14, 0.38, 2.2), paint, [-0.93, 0.32, -0.4], null, group);

    /* Cabin */
    const cabinGeo = new THREE.BoxGeometry(1.56, 0.48, 2.1);
    this._mesh(cabinGeo, paint, [0, 0.86, -0.05], null, group);

    /* Windshield */
    const wsGeo = new THREE.BoxGeometry(1.46, 0.50, 0.10);
    this._mesh(wsGeo, glass, [0, 0.90, 0.92], [-0.62, 0, 0], group);

    /* Rear window */
    this._mesh(new THREE.BoxGeometry(1.46, 0.42, 0.10), glass, [0, 0.88, -0.92], [0.55, 0, 0], group);

    /* Side windows */
    this._mesh(new THREE.BoxGeometry(0.06, 0.30, 0.72), glass, [ 0.79, 0.94, 0.32], null, group);
    this._mesh(new THREE.BoxGeometry(0.06, 0.30, 0.72), glass, [-0.79, 0.94, 0.32], null, group);

    /* Front bumper / nose */
    this._mesh(new THREE.BoxGeometry(1.74, 0.20, 0.28), trim, [0, 0.20, 2.06], null, group);
    this._mesh(new THREE.BoxGeometry(1.74, 0.14, 0.22), trim, [0, 0.52, 2.10], null, group);

    /* Rear bumper */
    this._mesh(new THREE.BoxGeometry(1.74, 0.22, 0.28), trim, [0, 0.20, -2.06], null, group);

    /* Spoiler lip */
    this._mesh(new THREE.BoxGeometry(1.6, 0.06, 0.18), trim, [0, 0.67, -2.10], null, group);

    /* Side skirts */
    this._mesh(new THREE.BoxGeometry(0.10, 0.12, 3.0), trim, [ 0.88, 0.10, 0], null, group);
    this._mesh(new THREE.BoxGeometry(0.10, 0.12, 3.0), trim, [-0.88, 0.10, 0], null, group);

    this._addWheels(group, wheel, rim, { wR: 0.40, wW: 0.24, fZ: 1.38, rZ: -1.38, tW: 0.97 });
    this._addHeadlights(group, light, redLight, { fZ: 2.06, rZ: -2.06, y: 0.40 });
  }

  /* ── TARGA (912) ── */
  _buildTarga(group, paint, glass, trim, wheel, rim, light, redLight) {
    /* Same base as coupe but smaller (older proportions) */
    /* Lower body */
    this._mesh(new THREE.BoxGeometry(1.60, 0.48, 3.80), paint, [0, 0.34, 0], null, group);

    /* Cabin — shorter roofline */
    this._mesh(new THREE.BoxGeometry(1.44, 0.44, 1.60), paint, [0, 0.78, 0.10], null, group);

    /* Targa bar — bright silver */
    const barMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.06 });
    this._mesh(new THREE.BoxGeometry(1.50, 0.14, 0.22), barMat, [0, 0.82, 0.26], null, group);

    /* Open rear section (no roof after bar) */
    /* Windshield — more upright vintage angle */
    this._mesh(new THREE.BoxGeometry(1.36, 0.46, 0.09), glass, [0, 0.82, 0.82], [-0.50, 0, 0], group);

    /* Rear window — small wrap-around */
    this._mesh(new THREE.BoxGeometry(1.28, 0.28, 0.09), glass, [0, 0.70, -0.72], [0.4, 0, 0], group);

    /* Side windows */
    this._mesh(new THREE.BoxGeometry(0.06, 0.28, 0.52), glass, [ 0.73, 0.78, 0.38], null, group);
    this._mesh(new THREE.BoxGeometry(0.06, 0.28, 0.52), glass, [-0.73, 0.78, 0.38], null, group);

    /* Bumpers — chrome look */
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.98, roughness: 0.05 });
    this._mesh(new THREE.BoxGeometry(1.62, 0.16, 0.20), chromeMat, [0, 0.20, 1.96], null, group);
    this._mesh(new THREE.BoxGeometry(1.62, 0.16, 0.20), chromeMat, [0, 0.20, -1.96], null, group);

    /* Round headlights (vintage) */
    const hLight = new THREE.MeshStandardMaterial({ color: 0xf0f0ff, emissive: 0xffffee, emissiveIntensity: 0.8 });
    const hGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 32);
    hGeo.rotateX(Math.PI / 2);
    [[0.50, 0.40, 1.92], [-0.50, 0.40, 1.92]].forEach(pos => {
      this._mesh(hGeo.clone(), hLight, pos, null, group);
    });

    /* Tail lights */
    const tGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.06, 24);
    tGeo.rotateX(Math.PI / 2);
    const tMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 });
    [[0.50, 0.40, -1.92], [-0.50, 0.40, -1.92]].forEach(pos => {
      this._mesh(tGeo.clone(), tMat, pos, null, group);
    });

    this._addWheels(group, wheel, rim, { wR: 0.36, wW: 0.20, fZ: 1.26, rZ: -1.26, tW: 0.88 });
  }

  /* ── CABRIOLET (964) ── */
  _buildCabriolet(group, paint, glass, trim, wheel, rim, light, redLight) {
    /* Wide-body Turbolook: wider fenders */
    /* Lower body */
    this._mesh(new THREE.BoxGeometry(1.82, 0.54, 4.10), paint, [0, 0.38, 0], null, group);

    /* Wide fenders — protruding sides */
    this._mesh(new THREE.BoxGeometry(0.18, 0.44, 2.4), paint, [ 1.00, 0.30, -0.3], null, group);
    this._mesh(new THREE.BoxGeometry(0.18, 0.44, 2.4), paint, [-1.00, 0.30, -0.3], null, group);
    this._mesh(new THREE.BoxGeometry(0.16, 0.40, 1.8), paint, [ 0.98, 0.30, 1.0], null, group);
    this._mesh(new THREE.BoxGeometry(0.16, 0.40, 1.8), paint, [-0.98, 0.30, 1.0], null, group);

    /* Windshield frame (cabriolet — lower, shorter) */
    this._mesh(new THREE.BoxGeometry(1.56, 0.36, 0.10), glass, [0, 0.80, 0.90], [-0.60, 0, 0], group);

    /* Low windshield header bar */
    this._mesh(new THREE.BoxGeometry(1.60, 0.08, 0.14), paint, [0, 0.96, 0.88], null, group);

    /* Folded soft top (bump at rear) */
    this._mesh(new THREE.BoxGeometry(1.52, 0.22, 0.80), trim, [0, 0.80, -0.55], null, group);

    /* Front bumper + integrated lip (Turbo style) */
    const bigBumpMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.4, roughness: 0.6 });
    this._mesh(new THREE.BoxGeometry(1.86, 0.26, 0.34), bigBumpMat, [0, 0.20, 2.14], null, group);
    this._mesh(new THREE.BoxGeometry(0.80, 0.12, 0.26), bigBumpMat, [0, 0.08, 2.16], null, group); /* chin */

    /* Rear bumper */
    this._mesh(new THREE.BoxGeometry(1.86, 0.26, 0.34), bigBumpMat, [0, 0.20, -2.14], null, group);

    /* Whale tail / rear wing */
    const wingMat = new THREE.MeshStandardMaterial({ color: this.config.color, metalness: 0.7, roughness: 0.2 });
    this._mesh(new THREE.BoxGeometry(1.60, 0.08, 0.40), wingMat, [0, 0.76, -2.05], null, group);
    /* Wing supports */
    this._mesh(new THREE.BoxGeometry(0.06, 0.20, 0.10), wingMat, [ 0.60, 0.66, -2.05], null, group);
    this._mesh(new THREE.BoxGeometry(0.06, 0.20, 0.10), wingMat, [-0.60, 0.66, -2.05], null, group);

    /* Side skirts (wider) */
    this._mesh(new THREE.BoxGeometry(0.12, 0.14, 3.2), trim, [ 0.95, 0.10, 0], null, group);
    this._mesh(new THREE.BoxGeometry(0.12, 0.14, 3.2), trim, [-0.95, 0.10, 0], null, group);

    this._addWheels(group, wheel, rim, { wR: 0.42, wW: 0.26, fZ: 1.42, rZ: -1.44, tW: 1.04 });
    this._addHeadlights(group, light, redLight, { fZ: 2.12, rZ: -2.12, y: 0.42 });
  }

  /* ── SUV (X5) ── */
  _buildSUV(group, paint, glass, trim, wheel, rim, light, redLight) {
    /* Main body slab */
    this._mesh(new THREE.BoxGeometry(2.0, 0.78, 4.80), paint, [0, 0.56, 0], null, group);

    /* Cabin box */
    this._mesh(new THREE.BoxGeometry(1.88, 0.80, 2.90), paint, [0, 1.35, -0.08], null, group);

    /* Windshield */
    this._mesh(new THREE.BoxGeometry(1.76, 0.78, 0.12), glass, [0, 1.22, 1.28], [-0.42, 0, 0], group);

    /* Rear window */
    this._mesh(new THREE.BoxGeometry(1.76, 0.65, 0.12), glass, [0, 1.22, -1.30], [0.25, 0, 0], group);

    /* Side windows (front + rear) */
    this._mesh(new THREE.BoxGeometry(0.08, 0.46, 0.80), glass, [ 0.95, 1.38, 0.55], null, group);
    this._mesh(new THREE.BoxGeometry(0.08, 0.46, 0.80), glass, [-0.95, 1.38, 0.55], null, group);
    this._mesh(new THREE.BoxGeometry(0.08, 0.40, 0.70), glass, [ 0.95, 1.36, -0.50], null, group);
    this._mesh(new THREE.BoxGeometry(0.08, 0.40, 0.70), glass, [-0.95, 1.36, -0.50], null, group);

    /* Front bumper — kidney grille area */
    this._mesh(new THREE.BoxGeometry(2.02, 0.32, 0.36), trim, [0, 0.28, 2.44], null, group);
    /* Kidney grille outlines */
    const grilleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.3 });
    this._mesh(new THREE.BoxGeometry(0.36, 0.46, 0.08), grilleMat, [ 0.22, 0.80, 2.44], null, group);
    this._mesh(new THREE.BoxGeometry(0.36, 0.46, 0.08), grilleMat, [-0.22, 0.80, 2.44], null, group);

    /* Rear bumper */
    this._mesh(new THREE.BoxGeometry(2.02, 0.32, 0.36), trim, [0, 0.28, -2.44], null, group);

    /* Roof rails */
    const railMat = new THREE.MeshStandardMaterial({ color: 0x888890, metalness: 0.85, roughness: 0.15 });
    this._mesh(new THREE.BoxGeometry(0.06, 0.06, 2.60), railMat, [ 0.92, 1.76, 0], null, group);
    this._mesh(new THREE.BoxGeometry(0.06, 0.06, 2.60), railMat, [-0.92, 1.76, 0], null, group);

    /* Side cladding */
    const cladMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, metalness: 0.2, roughness: 0.8 });
    this._mesh(new THREE.BoxGeometry(0.10, 0.22, 4.20), cladMat, [ 1.01, 0.18, 0], null, group);
    this._mesh(new THREE.BoxGeometry(0.10, 0.22, 4.20), cladMat, [-1.01, 0.18, 0], null, group);

    /* BMW badge placeholder (embossed circle) */
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.05 });
    this._mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 32), badgeMat, [0, 0.90, 2.46], [-Math.PI/2, 0, 0], group);

    this._addWheels(group, wheel, rim, { wR: 0.50, wW: 0.30, fZ: 1.68, rZ: -1.68, tW: 1.08 });
    this._addHeadlights(group, light, redLight, { fZ: 2.40, rZ: -2.40, y: 0.68, wide: true });
  }

  /* ── Shared: wheels ── */
  _addWheels(group, wheelMat, rimMat, { wR, wW, fZ, rZ, tW }) {
    const tireGeo = new THREE.CylinderGeometry(wR, wR, wW, 40);
    tireGeo.rotateZ(Math.PI / 2);

    const rimOuterGeo = new THREE.CylinderGeometry(wR * 0.68, wR * 0.68, wW + 0.02, 20);
    rimOuterGeo.rotateZ(Math.PI / 2);

    /* Spoke geometry (flat cross) */
    const spoke1Geo = new THREE.BoxGeometry(wW * 0.6, wR * 1.26, 0.04);
    spoke1Geo.rotateZ(Math.PI / 2);
    const spoke2Geo = new THREE.BoxGeometry(wW * 0.6, 0.04, wR * 1.26);

    [[fZ, tW], [fZ, -tW], [rZ, tW], [rZ, -tW]].forEach(([z, x]) => {
      const tire = new THREE.Mesh(tireGeo.clone(), wheelMat);
      tire.position.set(x, wR, z);
      tire.castShadow = true;
      group.add(tire);

      const rimO = new THREE.Mesh(rimOuterGeo.clone(), rimMat);
      rimO.position.set(x, wR, z);
      group.add(rimO);

      /* Spokes */
      const s1 = new THREE.Mesh(spoke1Geo.clone(), rimMat);
      s1.position.set(x, wR, z);
      group.add(s1);
      const s2 = new THREE.Mesh(spoke2Geo.clone(), rimMat);
      s2.position.set(x, wR, z);
      group.add(s2);

      /* Hub cap */
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(wR * 0.14, wR * 0.14, wW + 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.95, roughness: 0.05 })
      );
      hub.geometry.rotateZ(Math.PI / 2);
      hub.position.set(x, wR, z);
      group.add(hub);
    });
  }

  /* ── Shared: headlights + taillights ── */
  _addHeadlights(group, lightMat, redMat, { fZ, rZ, y, wide }) {
    const w = wide ? 0.30 : 0.22;
    const h = wide ? 0.14 : 0.11;

    const hGeo = new THREE.BoxGeometry(w, h, 0.08);
    const tGeo = new THREE.BoxGeometry(w, h * 0.9, 0.08);

    [[ 0.52, y, fZ], [-0.52, y, fZ]].forEach(pos => {
      this._mesh(hGeo.clone(), lightMat, pos, null, group);
    });
    [[ 0.52, y, rZ], [-0.52, y, rZ]].forEach(pos => {
      this._mesh(tGeo.clone(), redMat, pos, null, group);
    });
  }

  /* ── Resize ── */
  _setupResize(wrap) {
    const ro = new ResizeObserver(() => this._resize(wrap));
    ro.observe(wrap);
  }

  _resize(wrap) {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /* ── Drag events ── */
  _bindEvents(wrap) {
    wrap.addEventListener('mousedown', e => this._onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => { if (this.isDragging) this._onMove(e.clientX, e.clientY); });
    window.addEventListener('mouseup', () => this._onUp());

    wrap.addEventListener('touchstart', e => {
      e.preventDefault();
      this._onDown(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    window.addEventListener('touchmove', e => {
      if (!this.isDragging) return;
      e.preventDefault();
      this._onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    window.addEventListener('touchend', () => this._onUp());
  }

  _onDown(x, y) {
    this.isDragging = true;
    this.prevX = x;
    this.prevY = y;
    this.autoRotate = false;
    clearTimeout(this.idleTimer);
    const hint = document.getElementById(`hint-${this.config.id}`);
    if (hint) hint.classList.add('hidden');
  }

  _onMove(x, y) {
    const dx = x - this.prevX;
    const dy = y - this.prevY;
    this.targetRotY += dx * 0.012;
    this.targetRotX = Math.max(-0.45, Math.min(0.35, this.targetRotX + dy * 0.006));
    this.prevX = x;
    this.prevY = y;
  }

  _onUp() {
    this.isDragging = false;
    this.idleTimer = setTimeout(() => { this.autoRotate = true; }, 3000);
  }

  /* ── Activation (IntersectionObserver) ── */
  setActive(v) {
    this.active = v;
  }

  /* ── Render loop ── */
  _loop() {
    requestAnimationFrame(() => this._loop());
    if (!this.active) return;

    if (this.autoRotate) {
      this.targetRotY += 0.004;
    }

    /* Damped interpolation */
    this.rotY += (this.targetRotY - this.rotY) * 0.07;
    this.rotX += (this.targetRotX - this.rotX) * 0.07;

    if (this.carGroup) {
      this.carGroup.rotation.y = this.rotY;
      this.carGroup.rotation.x = this.rotX;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
