// @ts-nocheck
// Ported from assets/world.js — vendor-style 3D code, type-checking disabled.
// ─────────────────────────────────────────────
//  world.js — WASD 탐험 월드
//  떠다니는 파스텔 섬 · 캐릭터 이동 · NPC/건물 상호작용
//  david-hckh 무드: 밝고 깔끔, 부드러운 모션
// ─────────────────────────────────────────────
import * as THREE from 'three';

const COL = {
  // bright village
  grassTop: 0x9fd17a,
  grassSide: 0xcaa86a,
  soil: 0x9c7b4f,
  path: 0xe9dcb8,
  trunk: 0x8a5a3b,
  accent: 0xff5b35,   // player / 소개
  blue: 0x2f6bff,     // studio
  green: 0x2bb673,    // guestbook
  studioWall: 0xf3ede1,
  studioRoof: 0xff5b35,
  kioskWall: 0xfff5e8,
  kioskRoof: 0x2f6bff,
  skin: 0xf3c39a,
  // arcade neon (for machine screens, marquees, signs)
  cyan: 0x21f0ff,
  magenta: 0xff2bd6,
  purple: 0x9a5cff,
  lime: 0x5dff9e,
  amber: 0xffb13c,
  hotpink: 0xff4d8d,
  cabinet: 0x2a2740,
  cabinet2: 0x39243f,
};

const ISLAND_R = 30;
const WALK_R = 26;

let renderer, scene, camera, composer;
let player, playerModel, npc, npcModel;
let clock;
const obstacles = []; // {x,z,r}
const pois = [];      // {id, x, z, r, el, prompt, panel, object, type}
let cloudGroup;
const spinners = [];  // {mesh, speed}
const floaters = [];  // {mesh, baseY, amp, phase, speed}
const pulsers = [];   // {mat, base, amp, phase}

// retro 8x8 pixel sprites for arcade screens
const SPRITES = {
  invader: ['00100100','00111100','01111110','11011011','11111111','01011010','10000001','01000010'],
  heart:   ['01100110','11111111','11111111','11111111','01111110','00111100','00011000','00000000'],
  smiley:  ['00111100','01000010','10100101','10000001','10100101','10011001','01000010','00111100'],
  star:    ['00011000','00011000','11111111','01111110','00111100','00111100','00100100','01000010'],
  ghost:   ['00111100','01111110','11011011','11111111','11111111','11111111','10101010','00000000'],
};

const input = { f: 0, b: 0, l: 0, r: 0 };
const vel = new THREE.Vector3();
// jump physics
let jumpY = 0, jumpVel = 0, grounded = true;
const GRAVITY = -28, JUMP_V = 9.2;
const camState = { yaw: 0.6, pitch: 0.62, dist: 14 };
let activePoi = null;
let frozen = false;       // true while a panel is open
let inspect = false;      // true while debug face-cam holds the camera
let started = false;

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

async function init() {
  const canvas = document.getElementById('scene-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene = new THREE.Scene();
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog(0xbfe6f5, 50, 110);

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

  // ── lights (bright daylight village) ─────
  const hemi = new THREE.HemisphereLight(0xeaf6ff, 0xbfcf9a, 0.95);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
  sun.position.set(18, 34, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  const s = 46;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 4;
  scene.add(sun);

  buildIsland();
  buildDecor();
  buildPlayer();
  buildPOIs();
  buildClouds();

  // start rendering immediately (direct render); bloom upgrades in async
  clock = new THREE.Clock();
  bindEvents();
  resize();
  renderer.setAnimationLoop(loop);

  requestAnimationFrame(() => {
    const ld = document.getElementById('loader');
    if (ld) ld.classList.add('hide');
  });

  // ── bloom: load in the background so a slow/failed CDN never blocks the world ─
  loadBloom();
}

async function loadBloom() {
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }] = await Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    ]);
    const c = new EffectComposer(renderer);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6, 0.5, 0.92
    ));
    c.setSize(window.innerWidth, window.innerHeight);
    composer = c;
  } catch (e) {
    composer = null; // keep direct render
  }
}

// vertical sky gradient as the scene background (so bloom/composer never shows black)
function makeSkyTexture() {
  const w = 16, h = 256;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, '#7ec8ef');  // zenith blue
  g.addColorStop(0.42, '#aee0f5'); // mid sky
  g.addColorStop(0.74, '#d6f0fb'); // pale horizon
  g.addColorStop(1.0, '#fdf4e2');  // warm haze at bottom
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// neon grid texture for the ground plate
function makeGridTexture() {
  const sz = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = sz;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#13111f';
  ctx.fillRect(0, 0, sz, sz);
  const n = 8, step = sz / n;
  ctx.strokeStyle = 'rgba(33,240,255,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const p = i * step; ctx.moveTo(p, 0); ctx.lineTo(p, sz); ctx.moveTo(0, p); ctx.lineTo(sz, p); }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─────────────────────────────────────────────
//  ISLAND — bright village
// ─────────────────────────────────────────────
function buildIsland() {
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_R, ISLAND_R, 1.4, 64),
    new THREE.MeshStandardMaterial({ color: COL.grassTop, roughness: 0.95 })
  );
  top.position.y = -0.7;
  top.receiveShadow = true;
  scene.add(top);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_R - 0.4, ISLAND_R * 0.32, 12, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: COL.grassSide, roughness: 1, side: THREE.DoubleSide })
  );
  soil.position.y = -7.2;
  scene.add(soil);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(ISLAND_R * 0.32, 9, 64),
    new THREE.MeshStandardMaterial({ color: COL.soil, roughness: 1 })
  );
  tip.position.y = -17.4;
  tip.rotation.x = Math.PI;
  scene.add(tip);

  // central plaza disc
  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(6.4, 6.4, 0.2, 48),
    new THREE.MeshStandardMaterial({ color: COL.path, roughness: 0.9 })
  );
  plaza.position.y = 0.06;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // stone paths toward each POI
  const targets = [
    [0, -13],    // npc (north)
    [-14, 11],   // studio (sw)
    [14, 10.6],  // kiosk (se)
  ];
  targets.forEach(([tx, tz]) => layStones(tx, tz));
}

function layStones(tx, tz) {
  const start = new THREE.Vector2(0, 0);
  const end = new THREE.Vector2(tx, tz);
  const len = start.distanceTo(end);
  const n = Math.max(3, Math.round(len / 2.4));
  const mat = new THREE.MeshStandardMaterial({ color: COL.path, roughness: 0.9 });
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const x = start.x + (end.x - start.x) * t;
    const z = start.y + (end.y - start.y) * t;
    const r = 0.9 + Math.random() * 0.35;
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.16, 7), mat);
    stone.position.set(x + (Math.random() - 0.5) * 0.6, 0.08, z + (Math.random() - 0.5) * 0.6);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    scene.add(stone);
  }
}

// ─────────────────────────────────────────────
//  DECOR — arcade machines around the village
// ─────────────────────────────────────────────
function faceCenter(x, z) { return Math.atan2(-x, -z); }

function buildDecor() {
  const bodyCols = [COL.accent, COL.blue, COL.green, 0xffc63c, COL.hotpink, 0x6b4cff];
  const screenCols = [COL.cyan, COL.magenta, COL.lime, COL.amber];
  const sprites = ['invader', 'heart', 'smiley', 'star', 'ghost'];

  // upright arcade cabinets ringed around the island
  const cabSpots = [
    [-9, -18], [9, -18], [20, -7], [22, 8],
    [-20, -7], [-22, 8], [-11, 19], [8, 20], [19, 16],
  ];
  cabSpots.forEach(([x, z], i) => {
    if (Math.hypot(x, z) > WALK_R - 2) { x *= 0.9; z *= 0.9; }
    addArcadeCabinet(x, z, faceCenter(x, z), bodyCols[i % bodyCols.length], screenCols[i % screenCols.length], sprites[i % sprites.length], i);
  });

  // claw machines (인형뽑기)
  addClawMachine(-5, 21, faceCenter(-5, 21), COL.hotpink);
  addClawMachine(24, 2, faceCenter(24, 2), COL.cyan);

  // gachapon capsule machines (캡슐 뽑기)
  addGachapon(5, -20, COL.amber);
  addGachapon(-23, -3, COL.green);
  addGachapon(14, -15, COL.magenta);

  // a few floating fair balloons for charm
  const balloonSpots = [[-16, 16], [16, -11], [-2, 25], [25, -6]];
  const bcols = [COL.accent, COL.blue, COL.hotpink, COL.green];
  balloonSpots.forEach(([x, z], i) => addBalloon(x, z, bcols[i % bcols.length], i));
}

// ── Animal-Crossing style face decal, drawn on a transparent canvas ──
function makeFaceTexture(opts = {}) {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, S, S);

  const cx = S / 2;
  const eyeY = 116, eyeDX = 44;
  const browColor = opts.brow || '#2a2018';

  // rosy cheeks (soft radial pink)
  [-1, 1].forEach((s) => {
    const gx = cx + s * 60, gy = 156;
    const grd = ctx.createRadialGradient(gx, gy, 2, gx, gy, 28);
    grd.addColorStop(0, 'rgba(255,135,125,0.62)');
    grd.addColorStop(1, 'rgba(255,135,125,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(gx, gy, 28, 0, Math.PI * 2);
    ctx.fill();
  });

  // eyebrows — short soft strokes above the eyes
  ctx.strokeStyle = browColor;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(cx + s * eyeDX - 15, eyeY - 34);
    ctx.quadraticCurveTo(cx + s * eyeDX, eyeY - 40, cx + s * eyeDX + 15, eyeY - 33);
    ctx.stroke();
  });

  // eyes — glossy dark ovals with a highlight (classic AC look)
  [-1, 1].forEach((s) => {
    const ex = cx + s * eyeDX;
    // soft eye shadow
    ctx.fillStyle = 'rgba(60,40,30,0.12)';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY + 2, 18, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // eyeball
    ctx.fillStyle = '#1f1812';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 13, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    // big catch-light
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex + 4, eyeY - 8, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // tiny lower glint
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(ex - 4, eyeY + 9, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // nose — tiny soft dot
  ctx.fillStyle = 'rgba(206,150,120,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx, 150, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // mouth — small friendly smile
  ctx.strokeStyle = '#7a3b30';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 16, 176);
  ctx.quadraticCurveTo(cx, 190, cx + 16, 176);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// retro screen content (pixel sprite on dark screen)
function makeScreenTexture(sprite, color) {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0a0820';
  ctx.fillRect(0, 0, s, s);
  // scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < s; y += 4) ctx.fillRect(0, y, s, 2);
  // sprite
  const grid = SPRITES[sprite] || SPRITES.invader;
  const px = 12, ox = (s - px * 8) / 2, oy = (s - px * 8) / 2;
  ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
  grid.forEach((row, r) => {
    for (let c = 0; c < 8; c++) if (row[c] === '1') ctx.fillRect(ox + c * px, oy + r * px, px - 1, px - 1);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function addArcadeCabinet(x, z, rot, bodyColor, screenColor, sprite, seed) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55, metalness: 0.1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1b28, roughness: 0.7 });

  // main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.7, 1.05), bodyMat);
  body.position.y = 1.35; body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // recessed front upper (dark) for screen
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 0.14), darkMat);
  bezel.position.set(0, 2.0, 0.5);
  g.add(bezel);

  // glowing screen
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.82),
    new THREE.MeshBasicMaterial({ map: makeScreenTexture(sprite, screenColor) })
  );
  screen.position.set(0, 2.0, 0.58);
  g.add(screen);
  pulsers.push({ mat: screen.material, base: 0xffffff, phase: seed, lo: 0.78, hi: 1.0 });

  // marquee header
  const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.1), bodyMat);
  marquee.position.set(0, 2.85, 0.02);
  marquee.castShadow = true;
  g.add(marquee);
  const marqueeSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.42),
    new THREE.MeshBasicMaterial({ color: screenColor })
  );
  marqueeSign.position.set(0, 2.85, 0.56);
  g.add(marqueeSign);
  marqueeSign.add(makeTextPlane('PLAY', 1.2, 0.34, '#0a0820'));
  pulsers.push({ mat: marqueeSign.material, base: screenColor, phase: seed * 1.3, lo: 0.6, hi: 1.0 });

  // tilted control panel
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.66), darkMat);
  panel.position.set(0, 1.28, 0.66);
  panel.rotation.x = -0.5;
  g.add(panel);

  // joystick
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 8), new THREE.MeshStandardMaterial({ color: 0x222 }));
  stick.position.set(-0.34, 1.42, 0.66); stick.rotation.x = -0.5;
  g.add(stick);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), new THREE.MeshStandardMaterial({ color: COL.accent, roughness: 0.4 }));
  ball.position.set(-0.34, 1.55, 0.62);
  g.add(ball);

  // buttons
  const btnCols = [COL.amber, COL.cyan, COL.hotpink];
  [0.05, 0.25, 0.45].forEach((bx, k) => {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), new THREE.MeshStandardMaterial({ color: btnCols[k], roughness: 0.4, emissive: btnCols[k], emissiveIntensity: 0.25 }));
    btn.position.set(bx, 1.45 - k * 0.0, 0.66); btn.rotation.x = Math.PI / 2 - 0.5;
    g.add(btn);
  });

  // coin door
  const coin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.06), new THREE.MeshStandardMaterial({ color: 0x2a2a38, metalness: 0.6, roughness: 0.4 }));
  coin.position.set(0, 0.7, 0.55);
  g.add(coin);

  // ground neon ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 28), new THREE.MeshBasicMaterial({ color: screenColor }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.05;
  g.add(ring);
  pulsers.push({ mat: ring.material, base: screenColor, phase: seed * 0.6 });

  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
  obstacles.push({ x, z, r: 0.95 });
}

function addClawMachine(x, z, rot, accent) {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 });

  // base cabinet
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 1.7), baseMat);
  base.position.y = 0.75; base.castShadow = true; base.receiveShadow = true;
  g.add(base);

  // glass cabin
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.1 });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.7, 1.6), glassMat);
  glass.position.y = 2.4;
  g.add(glass);
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 1.7, 1.6)),
    new THREE.LineBasicMaterial({ color: accent })
  );
  frame.position.y = 2.4; g.add(frame);

  // prizes (colorful plush spheres)
  const pcol = [COL.accent, COL.cyan, COL.amber, COL.hotpink, COL.green, COL.magenta];
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.08, 12, 12), new THREE.MeshStandardMaterial({ color: pcol[i % pcol.length], roughness: 0.6 }));
    p.position.set((Math.random() - 0.5) * 1.1, 1.85 + Math.random() * 0.2, (Math.random() - 0.5) * 1.1);
    p.castShadow = true;
    g.add(p);
  }

  // claw
  const claw = new THREE.Group();
  const clawTop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x888, metalness: 0.8, roughness: 0.3 }));
  clawTop.position.y = 0; claw.add(clawTop);
  [0, 1, 2].forEach((k) => {
    const a = (k / 3) * Math.PI * 2;
    const prong = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 6), new THREE.MeshStandardMaterial({ color: 0xaaa, metalness: 0.8, roughness: 0.3 }));
    prong.position.set(Math.cos(a) * 0.14, -0.28, Math.sin(a) * 0.14);
    prong.rotation.z = Math.cos(a) * 0.5; prong.rotation.x = -Math.sin(a) * 0.5;
    claw.add(prong);
  });
  claw.position.set(0, 2.9, 0);
  g.add(claw);
  floaters.push({ mesh: claw, baseY: 2.9, amp: 0.18, phase: x, speed: 1.4 });

  // top sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 0.2), baseMat);
  sign.position.set(0, 3.5, 0.78); g.add(sign);
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.38), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  signFace.position.set(0, 3.5, 0.89); g.add(signFace);
  signFace.add(makeTextPlane('CATCH!', 1.5, 0.32, '#ff4d8d'));
  pulsers.push({ mat: signFace.material, base: 0xffffff, phase: x, lo: 0.7, hi: 1.0 });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: accent }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  pulsers.push({ mat: ring.material, base: accent, phase: z });

  g.position.set(x, 0, z); g.rotation.y = rot;
  scene.add(g);
  obstacles.push({ x, z, r: 1.2 });
}

function addGachapon(x, z, accent) {
  const g = new THREE.Group();
  // stand
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.4, 16), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 }));
  stand.position.y = 0.7; stand.castShadow = true; g.add(stand);
  // dispenser tray
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x2a2a38 }));
  tray.position.set(0, 1.0, 0.5); g.add(tray);
  // globe
  const globeMat = new THREE.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.25, roughness: 0.1 });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 20), globeMat);
  globe.position.y = 1.95; g.add(globe);
  // capsules inside (spin)
  const caps = new THREE.Group();
  const ccol = [COL.accent, COL.cyan, COL.amber, COL.hotpink, COL.green, COL.magenta];
  for (let i = 0; i < 10; i++) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), new THREE.MeshStandardMaterial({ color: ccol[i % ccol.length], roughness: 0.5 }));
    cap.position.set((Math.random() - 0.5) * 0.7, 1.7 + Math.random() * 0.4, (Math.random() - 0.5) * 0.7);
    caps.add(cap);
  }
  g.add(caps);
  spinners.push({ mesh: caps, speed: 0.4 });
  // knob
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x222 }));
  knob.position.set(0, 1.25, 0.6); knob.rotation.x = Math.PI / 2; g.add(knob);

  g.position.set(x, 0, z);
  scene.add(g);
  obstacles.push({ x, z, r: 0.7 });
}

function addBalloon(x, z, color, seed) {
  const g = new THREE.Group();
  const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
  balloon.scale.y = 1.2;
  g.add(balloon);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 6), new THREE.MeshStandardMaterial({ color }));
  knot.position.y = -0.62; knot.rotation.x = Math.PI; g.add(knot);
  // string
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 3.0, 4), new THREE.MeshStandardMaterial({ color: 0x999 }));
  str.position.y = -2.1; g.add(str);
  g.position.set(x, 3.4, z);
  scene.add(g);
  floaters.push({ mesh: g, baseY: 3.4, amp: 0.3, phase: seed * 2, speed: 0.8 });
}

// ─────────────────────────────────────────────
//  CHARACTERS
// ─────────────────────────────────────────────
function makeCharacter(shirt, pants, hairColor = 0x2a2320) {
  const g = new THREE.Group();

  const skinMat  = new THREE.MeshStandardMaterial({ color: COL.skin, roughness: 0.65 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 });
  const shoeMat  = new THREE.MeshStandardMaterial({ color: 0x2c2622, roughness: 0.7 });
  const hairMat  = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });

  // ════════ Animal Crossing chibi proportions ════════
  // big round head, small egg body, stubby mitten arms & short legs

  // ── body (rounded egg torso) ──
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.40, 20, 18), shirtMat);
  torso.position.y = 0.78;
  torso.scale.set(1, 1.18, 0.92);
  torso.castShadow = true;
  g.add(torso);
  // little pelvis/skirt hem in pants color
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.30, 0.22, 18), pantsMat);
  hem.position.y = 0.5;
  hem.castShadow = true;
  g.add(hem);

  // ── BIG head (no neck — sits right on the body) ──
  const HY = 1.52, HR = 0.56;
  const head = new THREE.Mesh(new THREE.SphereGeometry(HR, 28, 24), skinMat);
  head.position.y = HY;
  head.scale.set(1, 0.96, 0.96);
  head.castShadow = true;
  g.add(head);
  const FZ = HR * 0.93; // face plane (front of head)

  // ════════ hair (Animal-Crossing cap with neat bangs) ════════
  // 1) crown cap — a beanie over the top, hairline above the brows
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(HR + 0.03, 30, 22, 0, Math.PI * 2, 0, Math.PI * 0.46),
    hairMat
  );
  hair.position.set(0, HY, -0.02);
  hair.scale.set(1.03, 1.04, 1.02);
  hair.castShadow = true;
  g.add(hair);

  // 2) back of the head — a dome covering the entire rear hemisphere (rim at the vertical
  //    plane through centre, so the face stays clear). Connects seamlessly to the crown.
  const backHair = new THREE.Mesh(
    new THREE.SphereGeometry(HR + 0.022, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.5),
    hairMat
  );
  backHair.position.set(0, HY, 0);
  backHair.scale.set(1.03, 1.04, 1.03);
  backHair.rotation.x = -Math.PI / 2;   // dome points backward → covers back & sides
  backHair.castShadow = true;
  g.add(backHair);

  // 3) bangs — a row of rounded locks along the front hairline (stop ABOVE the brows)
  const HAIRLINE = HY + 0.20;
  [-2, -1, 0, 1, 2].forEach((i) => {
    const a = i * 0.32;
    const lock = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 14), hairMat);
    const rad = HR + 0.01;
    lock.position.set(
      Math.sin(a) * rad * 0.82,
      HAIRLINE - Math.abs(i) * 0.012,
      Math.cos(a) * rad * 0.72
    );
    lock.scale.set(0.92, 0.78, 0.72);
    lock.rotation.y = -a;
    lock.castShadow = true;
    g.add(lock);
  });

  // ── face: flat "painted" decal that hugs the head's curve (Animal-Crossing look) ──
  const faceTex = makeFaceTexture({ brow: '#' + new THREE.Color(hairColor).getHexString() });
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex, transparent: true, roughness: 0.7,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  // a spherical cap (same radius as the head) so the features wrap onto the face
  const faceGeo = new THREE.PlaneGeometry(HR * 1.55, HR * 1.55, 18, 18);
  {
    const pos = faceGeo.attributes.position;
    const r = HR + 0.006;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const z = Math.sqrt(Math.max(0, r * r - x * x - y * y)); // bulge toward +z onto the head
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    faceGeo.computeVertexNormals();
  }
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, HY, 0);
  face.scale.z = 0.96; // match head's slight flattening
  face.renderOrder = 2;
  g.add(face);

  // ears
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), skinMat);
    ear.position.set(side * (HR - 0.02), HY - 0.04, 0.0);
    ear.scale.set(0.5, 1, 0.85);
    g.add(ear);
  });

  // ── arms: stubby with mitten hands (pivot at shoulder) ──
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.36, 1.0, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.22, 6, 10), shirtMat);
    upper.position.y = -0.16;
    upper.castShadow = true;
    pivot.add(upper);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 14), skinMat);
    hand.position.y = -0.34;
    hand.castShadow = true;
    pivot.add(hand);
    pivot.rotation.z = side * 0.14; // splayed out, chibi style
    g.add(pivot);
    return pivot;
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // ── legs: short & stubby with rounded shoes (pivot at hip) ──
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.5, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.16, 6, 10), pantsMat);
    leg.position.y = -0.16;
    leg.castShadow = true;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), shoeMat);
    shoe.position.set(0, -0.32, 0.05);
    shoe.scale.set(0.95, 0.7, 1.25);
    shoe.castShadow = true;
    pivot.add(shoe);
    g.add(pivot);
    return pivot;
  }
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  g.userData = { head, torso, leftArm, rightArm, leftLeg, rightLeg, headY: HY };
  return g;
}

// ── Shiba-Inu face decal (dog eyes + the iconic "mame" brow dots + smile) ──
function makeShibaFaceTexture() {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  const cx = S / 2;
  const eyeY = 104, eyeDX = 50;

  // eyes — friendly dark almond shapes
  [-1, 1].forEach((s) => {
    const ex = cx + s * eyeDX;
    ctx.fillStyle = '#241b14';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 15, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    // catch-light
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex + 5, eyeY - 7, 4.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // the classic Shiba tan "eyebrow" dots above each eye
  [-1, 1].forEach((s) => {
    const ex = cx + s * eyeDX;
    ctx.fillStyle = 'rgba(208,150,86,0.95)';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY - 30, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // rosy cheek blush
  [-1, 1].forEach((s) => {
    const gx = cx + s * 74, gy = 150;
    const grd = ctx.createRadialGradient(gx, gy, 2, gx, gy, 26);
    grd.addColorStop(0, 'rgba(255,150,120,0.5)');
    grd.addColorStop(1, 'rgba(255,150,120,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(gx, gy, 26, 0, Math.PI * 2); ctx.fill();
  });

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ── Player: a Shiba-Inu villager (Animal-Crossing animal style) ──
function makeShiba(shirt = 0xff5b35) {
  const g = new THREE.Group();

  const FUR   = 0xe0a868;  // shiba tan
  const CREAM = 0xfbf0dd;  // white belly / muzzle / paws
  const DARK  = 0x2a2018;  // nose
  const furMat   = new THREE.MeshStandardMaterial({ color: FUR, roughness: 0.85 });
  const creamMat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.8 });
  const noseMat  = new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.4 });

  // ── body (egg torso): tan fur back, cream belly/chest (no clothing) ──
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.40, 22, 18), furMat);
  torso.position.y = 0.80;
  torso.scale.set(1, 1.18, 0.92);
  torso.castShadow = true;
  g.add(torso);
  // cream belly/chest patch on the front
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 16), creamMat);
  belly.position.set(0, 0.80, 0.14);
  belly.scale.set(0.86, 1.12, 0.62);
  belly.castShadow = true;
  g.add(belly);
  // soft cream chest ruff at the top of the chest
  const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), creamMat);
  ruff.position.set(0, 1.06, 0.10);
  ruff.scale.set(1.05, 0.6, 0.72);
  ruff.castShadow = true;
  g.add(ruff);

  // ── BIG head ──
  const HY = 1.54, HR = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(HR, 28, 24), furMat);
  head.position.y = HY;
  head.scale.set(1.02, 0.96, 0.98);
  head.castShadow = true;
  g.add(head);

  // cream face mask (lower front of the face)
  const mask = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.82, 24, 20), creamMat);
  mask.position.set(0, HY - 0.12, 0.12);
  mask.scale.set(0.92, 0.82, 0.85);
  g.add(mask);

  // muzzle (rounded snout) + nose
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.20, 20, 16), creamMat);
  muzzle.position.set(0, HY - 0.16, HR * 0.78);
  muzzle.scale.set(1.15, 0.85, 0.95);
  muzzle.castShadow = true;
  g.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 12), noseMat);
  nose.position.set(0, HY - 0.12, HR * 0.78 + 0.17);
  nose.scale.set(1.2, 0.9, 0.9);
  g.add(nose);
  // little smile line under the nose
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 8, 16, Math.PI), noseMat);
  smile.position.set(0, HY - 0.22, HR * 0.82 + 0.05);
  smile.rotation.z = Math.PI;
  g.add(smile);

  // pointy upright ears (triangular), tan outside + cream inner
  [-1, 1].forEach((s) => {
    const ear = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), furMat);
    outer.castShadow = true;
    ear.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.24, 4), creamMat);
    inner.position.set(0, -0.01, 0.045);
    ear.add(inner);
    ear.position.set(s * 0.30, HY + HR * 0.74, -0.02);
    ear.rotation.set(0.12, Math.PI / 4, s * 0.30);
    g.add(ear);
  });

  // face decal (eyes + brow dots + blush) wrapped on the head curve
  const faceTex = makeShibaFaceTexture();
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex, transparent: true, roughness: 0.7,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const faceGeo = new THREE.PlaneGeometry(HR * 1.5, HR * 1.5, 16, 16);
  {
    const pos = faceGeo.attributes.position;
    const r = HR + 0.006;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const z = Math.sqrt(Math.max(0, r * r - x * x - y * y));
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    faceGeo.computeVertexNormals();
  }
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, HY + 0.06, 0);
  face.scale.z = 0.98;
  face.renderOrder = 2;
  g.add(face);

  // ── arms: stubby with cream paws ──
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.36, 1.0, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.20, 6, 10), furMat);
    upper.position.y = -0.15; upper.castShadow = true;
    pivot.add(upper);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 14), creamMat);
    paw.position.y = -0.33; paw.castShadow = true;
    pivot.add(paw);
    pivot.rotation.z = side * 0.14;
    g.add(pivot);
    return pivot;
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // ── legs: short tan with cream paw feet ──
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.5, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.14, 6, 10), furMat);
    leg.position.y = -0.15; leg.castShadow = true;
    pivot.add(leg);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), creamMat);
    paw.position.set(0, -0.3, 0.05);
    paw.scale.set(0.98, 0.7, 1.2);
    paw.castShadow = true;
    pivot.add(paw);
    g.add(pivot);
    return pivot;
  }
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // ── Shiba tail — starts at the RUMP and hangs down & back ──
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,  0.06,  0.06),   // root, tucked into the rump
    new THREE.Vector3(0,  0.00, -0.06),
    new THREE.Vector3(0, -0.10, -0.13),
    new THREE.Vector3(0, -0.20, -0.18),
    new THREE.Vector3(0, -0.29, -0.20),   // tip hanging down & back
  ]);
  const tailGeo = new THREE.TubeGeometry(tailCurve, 40, 0.13, 14, false);
  // taper the radius along the length (fluffy base → slimmer tip)
  {
    const pos = tailGeo.attributes.position;
    const rings = 41, perRing = 15;
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / perRing);
      const tt = Math.min(ring / (rings - 1), 1);
      const scale = 1 - tt * 0.42;
      const c = tailCurve.getPointAt(tt);
      pos.setX(i, c.x + (pos.getX(i) - c.x) * scale);
      pos.setY(i, c.y + (pos.getY(i) - c.y) * scale);
      pos.setZ(i, c.z + (pos.getZ(i) - c.z) * scale);
    }
    pos.needsUpdate = true;
    tailGeo.computeVertexNormals();
  }
  const tail = new THREE.Group();
  const tailMesh = new THREE.Mesh(tailGeo, furMat);
  tailMesh.castShadow = true;
  tail.add(tailMesh);
  // cream fluffy tip
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 12), creamMat);
  tip.position.copy(tailCurve.getPointAt(1));
  tip.castShadow = true;
  tail.add(tip);
  // anchor at the rump (lower back of the body) so the tail starts there
  tail.position.set(0, 0.66, -0.30);
  g.add(tail);

  g.userData = { head, torso, leftArm, rightArm, leftLeg, rightLeg, headY: HY, tail };
  return g;
}
function animateLimbs(model, speed, airborne, jumpVel, t, idlePhase = 0) {
  const ud = model.userData;
  if (!ud || !ud.leftArm) return;
  const lerp = (a, b, k) => a + (b - a) * k;

  if (airborne) {
    // jump pose: arms up & back, legs tuck slightly
    ud.leftArm.rotation.x  = lerp(ud.leftArm.rotation.x,  -2.1, 0.18);
    ud.rightArm.rotation.x = lerp(ud.rightArm.rotation.x, -2.1, 0.18);
    const legPose = jumpVel > 0 ? 0.55 : -0.2; // tuck up rising, reach down falling
    ud.leftLeg.rotation.x  = lerp(ud.leftLeg.rotation.x,  legPose, 0.18);
    ud.rightLeg.rotation.x = lerp(ud.rightLeg.rotation.x, legPose * 0.6, 0.18);
    return;
  }

  const amt = Math.min(speed / 6, 1);
  if (amt > 0.06) {
    const swing = Math.sin(t * 9) * 0.62 * amt;
    ud.leftLeg.rotation.x  = swing;
    ud.rightLeg.rotation.x = -swing;
    ud.leftArm.rotation.x  = -swing * 0.9;
    ud.rightArm.rotation.x = swing * 0.9;
  } else {
    // idle: settle toward rest with a gentle breathing sway
    const breathe = Math.sin(t * 1.6 + idlePhase) * 0.05;
    ud.leftArm.rotation.x  = lerp(ud.leftArm.rotation.x,  breathe, 0.1);
    ud.rightArm.rotation.x = lerp(ud.rightArm.rotation.x, -breathe, 0.1);
    ud.leftLeg.rotation.x  = lerp(ud.leftLeg.rotation.x,  0, 0.1);
    ud.rightLeg.rotation.x = lerp(ud.rightLeg.rotation.x, 0, 0.1);
  }
}

function buildPlayer() {
  player = new THREE.Object3D();
  player.position.set(0, 0, 3.5);
  scene.add(player);
  playerModel = makeShiba(COL.accent);
  player.add(playerModel);

  // soft contact shadow blob
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 24),
    new THREE.MeshBasicMaterial({ color: 0x2a3530, transparent: true, opacity: 0.2 })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  player.add(blob);
  player.userData.blob = blob;
}

// ─────────────────────────────────────────────
//  POINTS OF INTEREST
// ─────────────────────────────────────────────
function buildPOIs() {
  // 1) NPC 가람 — 소개 (north)
  npc = new THREE.Object3D();
  npc.position.set(0, 0, -13);
  scene.add(npc);
  npcModel = makeCharacter(0x2f6bff, 0x33405e, 0x241c14);
  npc.add(npcModel);
  // signpost beside npc
  addSignpost(1.7, -13, '?');
  registerPoi({
    id: 'about', type: 'npc',
    x: 0, z: -13, r: 3.4,
    object: npc,
    prompt: '가람과 대화하기',
    labelTitle: '가람', labelSub: 'SAY HELLO',
  });

  // 2) STUDIO ARCHIVE — 작업 & 경력 (sw)
  const studio = buildBuilding({
    x: -14, z: 7, w: 6.5, d: 6, h: 4.2,
    wall: COL.studioWall, roof: COL.studioRoof, accent: COL.blue, sign: 'STUDIO',
  });
  obstacles.push({ x: -14, z: 7, r: 4.6 });
  registerPoi({
    id: 'work', type: 'door',
    x: -14, z: 11.2, r: 3.2, // door is on +z face
    object: studio,
    prompt: 'STUDIO 들어가기 — 작업 & 경력',
    labelTitle: 'Studio Archive', labelSub: 'WORK & CAREER',
    labelY: 6.4,
  });

  // 3) 방명록 KIOSK — guestbook (se)
  const kiosk = buildKiosk({ x: 14, z: 7 });
  obstacles.push({ x: 14, z: 7, r: 3.0 });
  registerPoi({
    id: 'guestbook', type: 'door',
    x: 14, z: 10.6, r: 3.0,
    object: kiosk,
    prompt: '방명록 키오스크 — 흔적 남기기',
    labelTitle: '방명록', labelSub: 'GUESTBOOK',
    labelY: 5.0,
  });
}

function registerPoi(p) {
  p.el = document.querySelector(`.poi-label[data-poi="${p.id}"]`);
  p.panel = document.querySelector(`#panel-${p.id}`);
  pois.push(p);
}

function addSignpost(x, z, ch) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8),
    new THREE.MeshStandardMaterial({ color: COL.trunk, roughness: 0.9 })
  );
  post.position.y = 0.9; post.castShadow = true; g.add(post);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.65, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
  );
  board.position.y = 1.75; board.castShadow = true; g.add(board);
  board.add(makeTextPlane(ch, 0.55, 0.45, '#ff5b35'));
  g.position.set(x, 0, z);
  scene.add(g);
}

function buildBuilding({ x, z, w, d, h, wall, roof, accent, sign }) {
  const g = new THREE.Group();

  // bright body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: wall, roughness: 0.82 })
  );
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // pitched roof
  const roofMesh = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.86, 2.4, 4),
    new THREE.MeshStandardMaterial({ color: roof, roughness: 0.7, flatShading: true })
  );
  roofMesh.position.y = h + 1.2;
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.castShadow = true;
  g.add(roofMesh);

  // door
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2.4, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x33271c, roughness: 0.6 })
  );
  door.position.set(0, 1.2, d / 2 + 0.02);
  g.add(door);
  // glowing door arch (blooms)
  const arch = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.45),
    new THREE.MeshBasicMaterial({ color: accent })
  );
  arch.position.set(0, 2.55, d / 2 + 0.03);
  g.add(arch);
  pulsers.push({ mat: arch.material, base: accent, phase: x, lo: 0.6, hi: 1.0 });

  // windows (emissive, glow softly)
  const winMat = new THREE.MeshStandardMaterial({ color: 0x8fd0e6, roughness: 0.2, metalness: 0.1, emissive: 0x6fc0e0, emissiveIntensity: 0.5 });
  [-1, 1].forEach((sx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.12), winMat);
    win.position.set(sx * 1.9, 2.3, d / 2 + 0.02);
    g.add(win);
  });

  // arcade-style glowing marquee sign above door
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.74, 0.85, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1b1f27, roughness: 0.6 })
  );
  board.position.set(0, h + 0.05, d / 2 + 0.12);
  g.add(board);
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.68, 0.62),
    new THREE.MeshBasicMaterial({ color: accent })
  );
  signFace.position.set(0, h + 0.05, d / 2 + 0.21);
  g.add(signFace);
  signFace.add(makeTextPlane(sign, w * 0.6, 0.5, '#ffffff'));
  pulsers.push({ mat: signFace.material, base: accent, phase: z, lo: 0.65, hi: 1.0 });

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

function buildKiosk({ x, z }) {
  const g = new THREE.Group();
  const accent = COL.green;

  // counter base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.0, 2.6),
    new THREE.MeshStandardMaterial({ color: COL.kioskWall, roughness: 0.82 })
  );
  base.position.y = 1.0; base.castShadow = true; base.receiveShadow = true;
  g.add(base);

  // counter top
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.25, 3.0),
    new THREE.MeshStandardMaterial({ color: 0xe8d9bf, roughness: 0.8 })
  );
  top.position.y = 2.05; top.castShadow = true; g.add(top);

  // glowing screen on the front
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.1),
    new THREE.MeshBasicMaterial({ color: accent })
  );
  screen.position.set(0, 1.15, 1.32);
  g.add(screen);
  screen.add(makeTextPlane('✉ WRITE', 1.8, 0.5, '#ffffff'));
  pulsers.push({ mat: screen.material, base: accent, phase: x, lo: 0.6, hi: 1.0 });

  // canopy roof
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(3.0, 1.5, 4),
    new THREE.MeshStandardMaterial({ color: COL.kioskRoof, roughness: 0.6, flatShading: true })
  );
  canopy.position.y = 3.5; canopy.rotation.y = Math.PI / 4; canopy.castShadow = true;
  g.add(canopy);

  // posts
  [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8c6a6 })
    );
    post.position.set(px, 1.4, pz); post.castShadow = true; g.add(post);
  });

  // sign board
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.6, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1b1f27 })
  );
  board.position.set(0, 2.55, 1.45);
  g.add(board);
  board.add(makeTextPlane('GUESTBOOK', 2.2, 0.5, '#ffffff', 0.06));

  // floating glowing envelope above
  const env = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.5, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, emissive: accent, emissiveIntensity: 0.4 })
  );
  env.position.set(0, 4.6, 0);
  g.add(env);
  g.userData.env = env;
  spinners.push({ mesh: env, speed: 0.8 });

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// canvas text → plane (for signs)
function makeTextPlane(text, w, h, color = '#ffffff', padScale = 0.05) {
  const cw = 512, ch = Math.round(512 * (h / w));
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(ch * 0.6)}px Poppins, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cw / 2, ch / 2 + ch * 0.04);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  plane.position.z = 0.08;
  return plane;
}

// ─────────────────────────────────────────────
//  CLOUDS — bright fluffy sky
// ─────────────────────────────────────────────
function buildClouds() {
  cloudGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xeef6ff, emissiveIntensity: 0.25, flatShading: true });
  // a ring of fluffy clouds surrounding the island at varied heights & distances
  const N = 16;
  for (let i = 0; i < N; i++) {
    const c = new THREE.Group();
    const n = 4 + ((Math.random() * 4) | 0);
    for (let j = 0; j < n; j++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + Math.random() * 1.8, 0), mat);
      puff.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 3.2);
      puff.scale.y = 0.7;
      c.add(puff);
    }
    const a = (i / N) * Math.PI * 2 + Math.random() * 0.3;
    const rad = 26 + Math.random() * 30;
    c.position.set(Math.cos(a) * rad, 9 + Math.random() * 18, Math.sin(a) * rad);
    c.scale.setScalar(0.9 + Math.random() * 1.1);
    c.userData.angle = a;
    c.userData.rad = rad;
    c.userData.speed = 0.012 + Math.random() * 0.022;
    cloudGroup.add(c);
  }
  scene.add(cloudGroup);
}

// ─────────────────────────────────────────────
//  EVENTS
// ─────────────────────────────────────────────
function bindEvents() {
  window.addEventListener('resize', resize);

  // keyboard
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    setKey(e.code, true);
    if (e.code === 'KeyE' || e.code === 'Enter') tryInteract();
    if (e.code === 'Space') { e.preventDefault(); tryJump(); }
    if (e.code === 'Escape') closePanel();
  });
  window.addEventListener('keyup', (e) => setKey(e.code, false));

  // mouse drag to orbit
  let dragging = false, lastX = 0, lastY = 0;
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    if (frozen) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    camState.yaw -= dx * 0.005;
    camState.pitch = THREE.MathUtils.clamp(camState.pitch + dy * 0.004, 0.18, 1.05);
  });
  canvas.addEventListener('pointerup', (e) => { dragging = false; });
  // wheel zoom
  canvas.addEventListener('wheel', (e) => {
    camState.dist = THREE.MathUtils.clamp(camState.dist + Math.sign(e.deltaY) * 1.0, 8, 22);
  }, { passive: true });

  // prompt button click = interact
  const prompt = document.getElementById('prompt');
  if (prompt) prompt.addEventListener('click', tryInteract);

  // panel close buttons
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closePanel));
  document.querySelector('#overlay .scrim').addEventListener('click', closePanel);

  // intro start
  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.addEventListener('click', startWorld);

  // touch detection + joystick
  if (matchMedia('(pointer: coarse)').matches) {
    document.body.classList.add('touch');
    setupJoystick();
    const jb = document.getElementById('jump-btn');
    if (jb) jb.addEventListener('pointerdown', (e) => { e.preventDefault(); tryJump(); });
  }
}

function setKey(code, down) {
  const v = down ? 1 : 0;
  if (code === 'KeyW' || code === 'ArrowUp') input.f = v;
  if (code === 'KeyS' || code === 'ArrowDown') input.b = v;
  if (code === 'KeyA' || code === 'ArrowLeft') input.l = v;
  if (code === 'KeyD' || code === 'ArrowRight') input.r = v;
}

function setupJoystick() {
  const joy = document.getElementById('joy');
  const nub = joy.querySelector('.nub');
  let active = false, cx = 0, cy = 0;
  joy.addEventListener('pointerdown', (e) => {
    active = true;
    const r = joy.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    joy.setPointerCapture(e.pointerId);
    move(e);
  });
  joy.addEventListener('pointermove', (e) => { if (active) move(e); });
  joy.addEventListener('pointerup', () => {
    active = false; input.f = input.b = input.l = input.r = 0;
    nub.style.transform = 'translate(-50%,-50%)';
  });
  function move(e) {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = 38;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx / max, ny = dy / max;
    input.r = Math.max(0, nx); input.l = Math.max(0, -nx);
    input.b = Math.max(0, ny); input.f = Math.max(0, -ny);
  }
}

// ─────────────────────────────────────────────
//  INTERACTION
// ─────────────────────────────────────────────
function tryInteract() {
  if (frozen || !started) return;
  if (activePoi) openPanel(activePoi);
}

function tryJump() {
  if (frozen || !started) return;
  if (grounded) { jumpVel = JUMP_V; grounded = false; }
}

function openPanel(poi) {
  const overlay = document.getElementById('overlay');
  document.querySelectorAll('.panel').forEach((p) => (p.style.display = 'none'));
  if (poi.panel) poi.panel.style.display = 'flex';
  overlay.classList.add('open');
  frozen = true;
  input.f = input.b = input.l = input.r = 0;
  hidePrompt();
  if (poi.id === 'guestbook' && window.__initGuestbook) window.__initGuestbook();
  const body = poi.panel ? poi.panel.querySelector('.panel-body') : null;
  if (body) body.scrollTop = 0;
}

function closePanel() {
  const overlay = document.getElementById('overlay');
  if (!overlay.classList.contains('open')) return;
  overlay.classList.remove('open');
  setTimeout(() => { frozen = false; }, 120);
}

function showPrompt(text) {
  const p = document.getElementById('prompt');
  p.querySelector('.ptxt').textContent = text;
  p.classList.add('show');
}
function hidePrompt() {
  document.getElementById('prompt').classList.remove('show');
}

function startWorld() {
  started = true;
  const intro = document.getElementById('intro');
  if (intro) intro.classList.add('hide');
}

// ─────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (started && !frozen) updateMovement(dt);
  if (!inspect) updateCamera(dt, t);
  updatePOIs(t);
  updateAmbient(t);
  updateLabels();

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

function updateMovement(dt) {
  // camera-relative basis
  const yaw = camState.yaw;
  const forward = tmp.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = tmp2.set(Math.cos(yaw), 0, -Math.sin(yaw));

  const ix = input.r - input.l;
  const iz = input.f - input.b;

  const dir = new THREE.Vector3();
  dir.addScaledVector(forward, iz);
  dir.addScaledVector(right, ix);

  const moving = dir.lengthSq() > 0.0001;
  if (moving) {
    dir.normalize();
    const speed = 7.2;
    vel.lerp(dir.multiplyScalar(speed), 0.18);
  } else {
    vel.multiplyScalar(0.8);
  }

  player.position.addScaledVector(vel, dt);

  // obstacle collision (push out)
  for (const o of obstacles) {
    const dx = player.position.x - o.x;
    const dz = player.position.z - o.z;
    const dist = Math.hypot(dx, dz);
    const min = o.r + 0.6;
    if (dist < min && dist > 0.0001) {
      const push = (min - dist);
      player.position.x += (dx / dist) * push;
      player.position.z += (dz / dist) * push;
    }
  }

  // island boundary
  const rr = Math.hypot(player.position.x, player.position.z);
  if (rr > WALK_R) {
    player.position.x *= WALK_R / rr;
    player.position.z *= WALK_R / rr;
  }

  // face movement direction
  if (moving) {
    const targetRot = Math.atan2(vel.x, vel.z);
    playerModel.rotation.y = lerpAngle(playerModel.rotation.y, targetRot, 0.2);
  }

  // jump physics (gravity integration)
  jumpVel += GRAVITY * dt;
  jumpY += jumpVel * dt;
  if (jumpY <= 0) { jumpY = 0; jumpVel = 0; grounded = true; }

  // contact shadow shrinks & fades as player rises
  const blob = player.userData.blob;
  if (blob) {
    const k = Math.max(0.35, 1 - jumpY * 0.16);
    blob.scale.setScalar(k);
    blob.material.opacity = 0.18 * k;
  }

  // walking bob (suppressed mid-air) + jump offset
  const sp = vel.length();
  let bob = 0;
  if (sp > 0.3 && grounded) {
    bob = Math.sin(clock.elapsedTime * 12) * 0.06 * Math.min(sp / 7, 1);
    playerModel.rotation.z = Math.sin(clock.elapsedTime * 12) * 0.03 * Math.min(sp / 7, 1);
  } else {
    playerModel.rotation.z *= 0.8;
  }
  // squash & stretch: stretch going up, squash near apex/landing
  const stretch = grounded ? 1 : THREE.MathUtils.clamp(1 + jumpVel * 0.012, 0.9, 1.12);
  playerModel.scale.y += (stretch - playerModel.scale.y) * 0.3;
  playerModel.scale.x += (1 / Math.sqrt(playerModel.scale.y) - playerModel.scale.x) * 0.3;
  playerModel.scale.z = playerModel.scale.x;
  playerModel.position.y = jumpY + bob;

  // articulated arms & legs
  animateLimbs(playerModel, sp, !grounded, jumpVel, clock.elapsedTime);
}

function updateCamera(dt, t) {
  const yaw = camState.yaw, pitch = camState.pitch, dist = camState.dist;
  const target = tmp.copy(player.position).add(tmp2.set(0, 1.6, 0));

  const ox = Math.sin(yaw) * Math.cos(pitch) * dist;
  const oz = Math.cos(yaw) * Math.cos(pitch) * dist;
  const oy = Math.sin(pitch) * dist;

  const desired = tmp2.set(target.x + ox, target.y + oy, target.z + oz);
  // gentle idle breathing when not started
  if (!started) desired.y += Math.sin(t * 0.6) * 0.4;

  camera.position.lerp(desired, started ? 0.12 : 0.04);
  camera.lookAt(target);
}

function updatePOIs(t) {
  // npc faces player & idle bob
  if (npc) {
    const dx = player.position.x - npc.position.x;
    const dz = player.position.z - npc.position.z;
    const face = Math.atan2(dx, dz);
    npcModel.rotation.y = lerpAngle(npcModel.rotation.y, face, 0.06);
    npcModel.position.y = Math.sin(t * 2) * 0.04;
    animateLimbs(npcModel, 0, false, 0, t, 1.7);
  }

  // nearest poi within radius
  let nearest = null, best = Infinity;
  for (const p of pois) {
    const d = Math.hypot(player.position.x - p.x, player.position.z - p.z);
    p._dist = d;
    if (d < p.r && d < best) { best = d; nearest = p; }
  }
  if (nearest !== activePoi) {
    activePoi = nearest;
    if (started) {
      if (activePoi) showPrompt(activePoi.prompt);
      else hidePrompt();
    }
  }
}

function updateAmbient(t) {
  // spinning props (gachapon capsules, kiosk envelope)
  for (const s of spinners) {
    s.mesh.rotation.y += s.speed * 0.02;
  }
  // floating props (claw bob, balloons)
  for (const f of floaters) {
    f.mesh.position.y = f.baseY + Math.sin(t * f.speed + f.phase) * f.amp;
  }
  // arcade neon pulse (screens, marquees, rings)
  for (const p of pulsers) {
    const lo = p.lo !== undefined ? p.lo : 0.6;
    const hi = p.hi !== undefined ? p.hi : 1.0;
    const k = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * 2.4 + p.phase));
    p.mat.color.setHex(p.base);
    p.mat.color.multiplyScalar(k);
  }
  // cloud drift
  if (cloudGroup) {
    cloudGroup.children.forEach((c) => {
      c.userData.angle += c.userData.speed * 0.02;
      c.position.x = Math.cos(c.userData.angle) * c.userData.rad;
      c.position.z = Math.sin(c.userData.angle) * c.userData.rad;
    });
  }
  // floating envelope above kiosk
  pois.forEach((p) => {
    if (p.object && p.object.userData && p.object.userData.env) {
      const env = p.object.userData.env;
      env.position.y = 4.6 + Math.sin(t * 1.6) * 0.18;
    }
  });
}

// project POI world positions → screen, update floating labels
function updateLabels() {
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  for (const p of pois) {
    if (!p.el) continue;
    tmp.set(p.x, p.labelY || 3.2, p.z);
    tmp.project(camera);
    const behind = tmp.z > 1;
    if (behind) { p.el.style.opacity = '0'; continue; }
    const sx = (tmp.x * 0.5 + 0.5) * w;
    const sy = (-tmp.y * 0.5 + 0.5) * h;
    p.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
    // fade near vs far; chip border uses the POI's own color
    const near = p._dist !== undefined && p._dist < p.r;
    p.el.style.opacity = near ? '1' : '0.82';
    const chip = p.el.querySelector('.chip');
    chip.style.borderColor = near ? `var(--poi-${p.id})` : 'var(--line)';
  }
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  if (composer) composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// expose for guestbook + close (optional)
window.__world = {
  closePanel,
  startWorld,
  getState: () => ({
    started, frozen,
    sceneChildren: scene.children.length,
    player: player ? [+player.position.x.toFixed(2), +player.position.z.toFixed(2)] : null,
    cam: [+camera.position.x.toFixed(1), +camera.position.y.toFixed(1), +camera.position.z.toFixed(1)],
    activePoi: activePoi ? activePoi.id : null,
    jumpY: +jumpY.toFixed(3), grounded,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
  }),
  setInput: (k, v) => { if (k in input) input[k] = v; },
  jump: () => tryJump(),
  teleport: (x, z) => { player.position.set(x, 0, z); },
  openPoi: (id) => { const p = pois.find((q) => q.id === id); if (p) openPanel(p); },
  faceCam: (dist) => {
    frozen = true;
    const d = dist || 1.5;
    const hp = player.position;
    camera.position.set(hp.x, 1.55 + (d - 1.5) * 0.35, hp.z + d);
    camera.lookAt(hp.x, 1.4, hp.z);
    playerModel.rotation.y = 0;
    inspect = true; frozen = true;
  },
  unFaceCam: () => { inspect = false; },
  renderOnce: () => { if (composer) composer.render(); else renderer.render(scene, camera); },
  shibaInfo: () => {
    const ud = playerModel.userData;
    return { children: playerModel.children.length, hasTail: !!ud.tail, hasArms: !!ud.leftArm };
  },
  spinModel: (rad) => { playerModel.rotation.y = rad; },
  npcCam: (dist) => {
    inspect = true; frozen = true;
    const d = dist || 3.2;
    npcModel.rotation.y = 0; // face decal (+z) toward the camera
    const np = npc.position;
    camera.position.set(np.x, 1.7, np.z + d);
    camera.lookAt(np.x, 1.5, np.z);
  },
};


// ── React entry point (replaces the old top-level init() auto-run) ──
let __booted = false;
export function initWorld(): void {
  if (typeof window === 'undefined' || __booted) return;
  __booted = true;
  init();
}
