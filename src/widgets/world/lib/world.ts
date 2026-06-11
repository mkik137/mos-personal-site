// @ts-nocheck
// ─────────────────────────────────────────────
//  world.ts — 오케스트레이터 (루프 · 이벤트 · 이동)
//  씬 빌더는 각 서브모듈에 위임
// ─────────────────────────────────────────────
import * as THREE from 'three';
import { animateLimbs } from '@/entities/character';
import { WALK_R } from './constants';
import { buildIsland }  from './island';
import { buildDecor }   from './decor';
import { buildPlayer }  from './player';
import { buildPOIs }    from './poi';
import { buildClouds }  from './clouds';
import { buildNature }  from './nature';

// ── 모듈 수준 렌더링 상태 ──
let renderer, scene, camera, composer;
let player, playerModel, npc, npcModel;
let clock;
let cloudGroup;

// ── 공유 컬렉션 (서브모듈로 ctx 객체로 전달) ──
const obstacles = []; // {x,z,r}
const pois      = []; // {id, x, z, r, el, prompt, panel, object, type}
const spinners  = []; // {mesh, speed}
const floaters  = []; // {mesh, baseY, amp, phase, speed}
const pulsers   = []; // {mat, base, phase, lo?, hi?}

// ── 입력 / 물리 ──
const input = { f: 0, b: 0, l: 0, r: 0, shift: 0 };
const vel   = new THREE.Vector3();
const WALK_SPEED = 8;
const RUN_SPEED  = 16;
let jumpY = 0, jumpVel = 0, grounded = true;
const GRAVITY = -28, JUMP_V = 9.2;

// ── 카메라 / UI ──
const camState  = { yaw: 0.6, pitch: 0.62, dist: 8 };
let activePoi = null;
let frozen = false;
let inspect = false;
let started = false;

const tmp  = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
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
  scene.fog = new THREE.Fog(0xbfe6f5, 80, 175);

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

  // ── 조명 ──
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0xbfcf9a, 0.95));
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
  sun.position.set(18, 34, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 170;
  const s = 70;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top  =  s; sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
  scene.add(sun);

  // ── 씬 빌드 (각 서브모듈) ──
  const ctx = { scene, obstacles, pulsers, floaters, spinners, pois };

  await buildIsland(ctx);
  buildDecor(ctx);
  await buildNature(ctx);

  const pResult  = await buildPlayer(ctx);
  player      = pResult.player;
  playerModel = pResult.playerModel;

  const poiResult = await buildPOIs(ctx);
  npc      = poiResult.npc;
  npcModel = poiResult.npcModel;

  cloudGroup = buildClouds(ctx);

  // ── 루프 시작 ──
  clock = new THREE.Clock();
  bindEvents();
  resize();
  renderer.setAnimationLoop(loop);

  requestAnimationFrame(() => {
    document.getElementById('loader')?.classList.add('hide');
  });

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
    c.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.5, 0.92));
    c.setSize(window.innerWidth, window.innerHeight);
    composer = c;
  } catch (e) {
    composer = null;
  }
}

function makeSkyTexture() {
  const w = 16, h = 256;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0,  '#7ec8ef');
  g.addColorStop(0.42, '#aee0f5');
  g.addColorStop(0.74, '#d6f0fb');
  g.addColorStop(1.0,  '#fdf4e2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─────────────────────────────────────────────
//  EVENTS
// ─────────────────────────────────────────────
function bindEvents() {
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    setKey(e.code, true);
    if (e.code === 'KeyE' || e.code === 'Enter') tryInteract();
    if (e.code === 'Space') { e.preventDefault(); tryJump(); }
    if (e.code === 'Escape') closePanel();
  });
  window.addEventListener('keyup', (e) => setKey(e.code, false));

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
    camState.yaw   -= dx * 0.005;
    camState.pitch  = THREE.MathUtils.clamp(camState.pitch + dy * 0.004, 0.18, 1.05);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    camState.dist = THREE.MathUtils.clamp(camState.dist + Math.sign(e.deltaY) * 1.0, 8, 22);
  }, { passive: true });

  const prompt = document.getElementById('prompt');
  if (prompt) prompt.addEventListener('click', tryInteract);
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closePanel));
  document.querySelector('#overlay .scrim').addEventListener('click', closePanel);
  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.addEventListener('click', startWorld);

  if (matchMedia('(pointer: coarse)').matches) {
    document.body.classList.add('touch');
    setupJoystick();
    const jb = document.getElementById('jump-btn');
    if (jb) jb.addEventListener('pointerdown', (e) => { e.preventDefault(); tryJump(); });
  }
}

function setKey(code, down) {
  const v = down ? 1 : 0;
  if (code === 'KeyW'      || code === 'ArrowUp')    input.f = v;
  if (code === 'KeyS'      || code === 'ArrowDown')  input.b = v;
  if (code === 'KeyA'      || code === 'ArrowLeft')  input.l = v;
  if (code === 'KeyD'      || code === 'ArrowRight') input.r = v;
  if (code === 'ShiftLeft' || code === 'ShiftRight') input.shift = v;
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
    const max = 38, d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx / max, ny = dy / max;
    input.r = Math.max(0, nx);  input.l = Math.max(0, -nx);
    input.b = Math.max(0, ny);  input.f = Math.max(0, -ny);
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
  const body = poi.panel?.querySelector('.panel-body');
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
function hidePrompt() { document.getElementById('prompt').classList.remove('show'); }
function startWorld() {
  started = true;
  document.getElementById('intro')?.classList.add('hide');
}

// ─────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.elapsedTime;

  if (started && !frozen) updateMovement(dt);
  if (playerModel?.userData?.update) playerModel.userData.update(dt);
  if (!inspect) updateCamera(dt, t);
  updatePOIs(t);
  updateAmbient(t);
  updateLabels();

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

function updateMovement(dt) {
  const yaw     = camState.yaw;
  const forward = tmp.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right   = tmp2.set(Math.cos(yaw), 0, -Math.sin(yaw));
  const dir     = new THREE.Vector3();
  dir.addScaledVector(forward, input.f - input.b);
  dir.addScaledVector(right,   input.r - input.l);

  const moving = dir.lengthSq() > 0.0001;
  if (moving) {
    dir.normalize();
    const speed = input.shift ? RUN_SPEED : WALK_SPEED;
    vel.lerp(dir.multiplyScalar(speed), 0.18);
  } else {
    vel.multiplyScalar(0.8);
  }

  player.position.addScaledVector(vel, dt);

  // 충돌 처리
  for (const o of obstacles) {
    const dx = player.position.x - o.x, dz = player.position.z - o.z;
    const dist = Math.hypot(dx, dz), min = o.r + 0.6;
    if (dist < min && dist > 0.0001) {
      const push = min - dist;
      player.position.x += (dx / dist) * push;
      player.position.z += (dz / dist) * push;
    }
  }

  // 섬 경계
  const rr = Math.hypot(player.position.x, player.position.z);
  if (rr > WALK_R) {
    player.position.x *= WALK_R / rr;
    player.position.z *= WALK_R / rr;
  }

  if (moving) playerModel.rotation.y = lerpAngle(playerModel.rotation.y, Math.atan2(vel.x, vel.z), 0.2);

  // 점프 물리
  jumpVel += GRAVITY * dt;
  jumpY   += jumpVel * dt;
  if (jumpY <= 0) { jumpY = 0; jumpVel = 0; grounded = true; }

  const blob = player.userData.blob;
  if (blob) {
    const k = Math.max(0.35, 1 - jumpY * 0.16);
    blob.scale.setScalar(k);
    blob.material.opacity = 0.18 * k;
  }

  const sp = vel.length();
  let bob = 0;
  if (sp > 0.3 && grounded) {
    const freq = input.shift ? 16 : 12;
    const amp  = input.shift ? 0.08 : 0.06;
    bob = Math.sin(clock.elapsedTime * freq) * amp * Math.min(sp / RUN_SPEED, 1);
    playerModel.rotation.z = Math.sin(clock.elapsedTime * freq) * 0.03 * Math.min(sp / RUN_SPEED, 1);
  } else {
    playerModel.rotation.z *= 0.8;
  }
  // 절차적 squash/stretch 는 절차적 캐릭터 전용 — 스킨드 FBX 에는 적용하지 않음
  // (점프 높이는 아래 position.y, 다리 모션은 애니메이션 클립이 담당).
  if (!playerModel.userData.animated) {
    const stretch = grounded ? 1 : THREE.MathUtils.clamp(1 + jumpVel * 0.012, 0.9, 1.12);
    playerModel.scale.y += (stretch - playerModel.scale.y) * 0.3;
    playerModel.scale.x += (1 / Math.sqrt(playerModel.scale.y) - playerModel.scale.x) * 0.3;
    playerModel.scale.z  = playerModel.scale.x;
  }
  playerModel.position.y = jumpY + bob;

  if (playerModel.userData.animated) {
    playerModel.userData.setMotion(sp, grounded, RUN_SPEED);
  } else {
    animateLimbs(playerModel, sp, !grounded, jumpVel, clock.elapsedTime);
  }
}

function updateCamera(dt, t) {
  const { yaw, pitch, dist } = camState;
  const target  = tmp.copy(player.position).add(tmp2.set(0, 1.6, 0));
  const desired = tmp2.set(
    target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
    target.y + Math.sin(pitch) * dist,
    target.z + Math.cos(yaw) * Math.cos(pitch) * dist,
  );
  if (!started) desired.y += Math.sin(t * 0.6) * 0.4;
  camera.position.lerp(desired, started ? 0.12 : 0.04);
  camera.lookAt(target);
}

function updatePOIs(t) {
  if (npc) {
    const dx = player.position.x - npc.position.x;
    const dz = player.position.z - npc.position.z;
    npcModel.rotation.y = lerpAngle(npcModel.rotation.y, Math.atan2(dx, dz), 0.06);
    npcModel.position.y = Math.sin(t * 2) * 0.04;
    animateLimbs(npcModel, 0, false, 0, t, 1.7);
  }
  let nearest = null, best = Infinity;
  for (const p of pois) {
    const d = Math.hypot(player.position.x - p.x, player.position.z - p.z);
    p._dist = d;
    if (d < p.r && d < best) { best = d; nearest = p; }
  }
  if (nearest !== activePoi) {
    activePoi = nearest;
    if (started) { if (activePoi) showPrompt(activePoi.prompt); else hidePrompt(); }
  }
}

function updateAmbient(t) {
  for (const s of spinners) s.mesh.rotation.y += s.speed * 0.02;
  for (const f of floaters) f.mesh.position.y = f.baseY + Math.sin(t * f.speed + f.phase) * f.amp;
  for (const p of pulsers) {
    const lo = p.lo ?? 0.6, hi = p.hi ?? 1.0;
    const k = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * 2.4 + p.phase));
    p.mat.color.setHex(p.base);
    p.mat.color.multiplyScalar(k);
  }
  if (cloudGroup) {
    cloudGroup.children.forEach((c) => {
      c.userData.angle += c.userData.speed * 0.02;
      c.position.x = Math.cos(c.userData.angle) * c.userData.rad;
      c.position.z = Math.sin(c.userData.angle) * c.userData.rad;
    });
  }
  pois.forEach((p) => {
    if (p.object?.userData?.env) p.object.userData.env.position.y = 4.6 + Math.sin(t * 1.6) * 0.18;
  });
}

function updateLabels() {
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  for (const p of pois) {
    if (!p.el) continue;
    tmp.set(p.x, p.labelY || 3.2, p.z);
    tmp.project(camera);
    if (tmp.z > 1) { p.el.style.opacity = '0'; continue; }
    p.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    const near = p._dist !== undefined && p._dist < p.r;
    p.el.style.opacity = near ? '1' : '0.82';
    p.el.querySelector('.chip').style.borderColor = near ? `var(--poi-${p.id})` : 'var(--line)';
  }
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff >  Math.PI) diff -= Math.PI * 2;
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

// ─────────────────────────────────────────────
//  DEBUG API
// ─────────────────────────────────────────────
window.__world = {
  closePanel, startWorld,
  getState: () => ({
    started, frozen,
    sceneChildren: scene.children.length,
    player: player ? [+player.position.x.toFixed(2), +player.position.z.toFixed(2)] : null,
    cam: [+camera.position.x.toFixed(1), +camera.position.y.toFixed(1), +camera.position.z.toFixed(1)],
    activePoi: activePoi?.id ?? null,
    running: !!input.shift,
    jumpY: +jumpY.toFixed(3), grounded,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
  }),
  setInput:  (k, v)  => { if (k in input) input[k] = v; },
  jump:      ()      => tryJump(),
  teleport:  (x, z)  => { player.position.set(x, 0, z); },
  openPoi:   (id)    => { const p = pois.find((q) => q.id === id); if (p) openPanel(p); },
  faceCam: (dist = 1.5) => {
    const hp = player.position;
    camera.position.set(hp.x, 1.55 + (dist - 1.5) * 0.35, hp.z + dist);
    camera.lookAt(hp.x, 1.4, hp.z);
    playerModel.rotation.y = 0;
    inspect = true; frozen = true;
  },
  unFaceCam: ()      => { inspect = false; },
  renderOnce:()      => { if (composer) composer.render(); else renderer.render(scene, camera); },
  shibaInfo: ()      => ({ children: playerModel.children.length, hasTail: !!playerModel.userData.tail, hasArms: !!playerModel.userData.leftArm }),
  modelRef:  ()      => playerModel,
  obstacles: ()      => obstacles.map((o) => ({ x: +o.x.toFixed(1), z: +o.z.toFixed(1), r: o.r })),
  topView:   (h = 80) => { inspect = true; frozen = true; camera.position.set(0, h, 0.01); camera.lookAt(0, 0, 0); },
  lookAtPoint: (x, z, dist = 14, h = 7) => { inspect = true; frozen = true; const k = Math.hypot(x, z) || 1; camera.position.set(x + (x / k) * dist, h, z + (z / k) * dist); camera.lookAt(x, 3, z); },
  spinModel: (rad)   => { playerModel.rotation.y = rad; },
  npcCam: (dist = 3.2) => {
    inspect = true; frozen = true;
    npcModel.rotation.y = 0;
    camera.position.set(npc.position.x, 1.7, npc.position.z + dist);
    camera.lookAt(npc.position.x, 1.5, npc.position.z);
  },
};

// ─────────────────────────────────────────────
//  ENTRY POINT
// ─────────────────────────────────────────────
let __booted = false;
export function initWorld(): void {
  if (typeof window === 'undefined' || __booted) return;
  __booted = true;
  init();
}
