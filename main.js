const eyes = document.querySelectorAll('.eye');
const cursor = document.createElement('div');
cursor.className = 'cursor';
document.body.appendChild(cursor);
const cursorTarget = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const cursorCurrent = { ...cursorTarget };
let cursorRafId = null;
let cursorVisible = true;
const activeEffects = new Set();
const MAX_EFFECTS = 140;
let lastClickTime = 0;
const MIN_CLICK_INTERVAL = 120;

const baseTypes = [
  { name: 'burst', className: 'effect-burst', multiplier: 1, count: 1 },
  { name: 'ripple', className: 'effect-ripple', multiplier: 1.4, count: 1 },
  { name: 'spark', className: 'effect-spark', multiplier: 0.25, count: 10 },
  { name: 'spiral', className: 'effect-spiral', multiplier: 1.2, count: 1 },
  { name: 'pulse', className: 'effect-pulse', multiplier: 1.6, count: 1 },
  { name: 'comet', className: 'effect-comet', multiplier: 0.4, count: 4 },
];

const palettes = [
  ['#ff5f6d', '#ffc371'],
  ['#42e695', '#3bb2b8'],
  ['#f953c6', '#b91d73'],
  ['#30cfd0', '#330867'],
  ['#f6d365', '#fda085'],
  ['#a18cd1', '#fbc2eb'],
  ['#fda085', '#f6d365'],
  ['#5ee7df', '#b490ca'],
  ['#c6ffdd', '#fbd786'],
  ['#f7797d', '#c471ed'],
  ['#f8ffae', '#43c6ac'],
  ['#ff9a9e', '#fad0c4'],
];

const shapes = [
  { name: 'circle', radius: '50%', rotate: 0 },
  { name: 'pill', radius: '50% / 35%', rotate: 0 },
  { name: 'diamond', radius: '15%', rotate: 45 },
  { name: 'square', radius: '12%', rotate: 0 },
];

const effectVariants = [];
baseTypes.forEach((base) => {
  palettes.forEach((palette, paletteIndex) => {
    shapes.forEach((shape, shapeIndex) => {
      const duration = 900 + paletteIndex * 80 + shapeIndex * 45;
      const size = 70 + paletteIndex * 8;
      effectVariants.push({
        key: `${base.name}-${paletteIndex}-${shape.name}`,
        ...base,
        palette,
        shape,
        duration: duration * base.multiplier,
        size: size * base.multiplier,
      });
    });
  });
});

const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function registerEffect(effect) {
  activeEffects.add(effect);
  document.body.appendChild(effect);
  effect.addEventListener(
    'animationend',
    () => {
      effect.remove();
      activeEffects.delete(effect);
    },
    { once: true }
  );
}

function getEyeCenters() {
  return Array.from(eyes).map((eye) => {
    const rect = eye.getBoundingClientRect();
    return {
      eye,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  });
}

function updateEyes(event) {
  eyes.forEach((eye) => {
    const pupil = eye.querySelector('.pupil');
    const rect = eye.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const angle = Math.atan2(dy, dx);
    const distance = Math.min(rect.width * 0.25, Math.hypot(dx, dy) * 0.2);
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;

    pupil.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  });
}

function syncCursor(event) {
  cursorTarget.x = event.clientX;
  cursorTarget.y = event.clientY;

  if (!cursorVisible) {
    cursorVisible = true;
    cursor.style.opacity = '1';
  }

  if (!cursorRafId) {
    cursorRafId = requestAnimationFrame(cursorLoop);
  }
}

function cursorLoop() {
  const dx = cursorTarget.x - cursorCurrent.x;
  const dy = cursorTarget.y - cursorCurrent.y;
  const distance = Math.hypot(dx, dy);
  const stiffness = 0.4;

  if (distance < 0.5) {
    cursorCurrent.x = cursorTarget.x;
    cursorCurrent.y = cursorTarget.y;
    cursorRafId = null;
  } else {
    cursorCurrent.x += dx * stiffness;
    cursorCurrent.y += dy * stiffness;
    cursorRafId = requestAnimationFrame(cursorLoop);
  }

  cursor.style.left = `${cursorCurrent.x}px`;
  cursor.style.top = `${cursorCurrent.y}px`;
}

function cleanupOldEffects() {
  if (activeEffects.size <= MAX_EFFECTS) return;
  const excess = activeEffects.size - MAX_EFFECTS;
  const iterator = activeEffects.values();
  for (let i = 0; i < excess; i++) {
    const el = iterator.next().value;
    if (el) {
      el.remove();
      activeEffects.delete(el);
    }
  }
}

function spawnVariantEffects(event) {
  const variant = pick(effectVariants);
  const total = variant.count ?? 1;

  for (let i = 0; i < total; i++) {
    const effect = document.createElement('div');
    effect.className = `effect ${variant.className}`;
    effect.style.left = `${event.clientX}px`;
    effect.style.top = `${event.clientY}px`;
    effect.style.translate = '-50% -50%';

    const duration = rand(variant.duration * 0.8, variant.duration * 1.2);
    const size = rand(variant.size * 0.8, variant.size * 1.2);

    effect.style.setProperty('--color-main', variant.palette[0]);
    effect.style.setProperty('--color-secondary', variant.palette[1 % variant.palette.length]);
    effect.style.setProperty('--duration', `${duration}ms`);
    effect.style.setProperty('--size', `${size}px`);
    effect.style.setProperty('--shape-radius', variant.shape.radius);

    if (variant.className === 'effect-spark' || variant.className === 'effect-comet') {
      const angle = rand(0, Math.PI * 2);
      const distance = rand(60, 200);
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance * -1;
      effect.style.setProperty('--spark-x', `${offsetX}px`);
      effect.style.setProperty('--spark-y', `${offsetY}px`);
      effect.style.setProperty('--comet-x', `${offsetX}px`);
      effect.style.setProperty('--comet-y', `${offsetY}px`);
    }

    if (variant.shape.rotate) {
      effect.style.rotate = `${variant.shape.rotate}deg`;
    }

    registerEffect(effect);
  }
}

function shootEyeBeams(pointer) {
  const centers = getEyeCenters();
  const palette = pick(palettes);

  centers.forEach((center, index) => {
    const beam = document.createElement('div');
    beam.className = 'effect effect-laser';
    beam.style.left = `${center.x}px`;
    beam.style.top = `${center.y}px`;
    const dx = pointer.x - center.x;
    const dy = pointer.y - center.y;
    const length = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    beam.style.rotate = `${angle}deg`;
    beam.style.setProperty('--beam-length', `${length}px`);
    beam.style.setProperty('--duration', `${rand(420, 680)}ms`);
    beam.style.setProperty('--color-main', palette[index % palette.length]);
    registerEffect(beam);

    const burst = document.createElement('div');
    burst.className = 'effect effect-gaze-burst';
    burst.style.left = `${center.x}px`;
    burst.style.top = `${center.y}px`;
    burst.style.translate = '-50% -50%';
    burst.style.setProperty('--color-main', palette[(index + 1) % palette.length]);
    burst.style.setProperty('--duration', `${rand(500, 900)}ms`);
    registerEffect(burst);
  });
}

function drawPointerEcho(pointer) {
  const echo = document.createElement('div');
  echo.className = 'effect effect-pointer-echo';
  echo.style.left = `${pointer.x}px`;
  echo.style.top = `${pointer.y}px`;
  echo.style.translate = '-50% -50%';
  echo.style.setProperty('--duration', `${rand(600, 1100)}ms`);
  registerEffect(echo);
}

function fireBulletBurst(pointer) {
  const centers = getEyeCenters();
  centers.forEach((center) => {
    for (let i = 0; i < 3; i++) {
      const bullet = document.createElement('div');
      bullet.className = 'effect effect-bullet';
      bullet.style.left = `${center.x}px`;
      bullet.style.top = `${center.y}px`;
      const dx = pointer.x - center.x;
      const dy = pointer.y - center.y;
      const jitter = rand(-0.15, 0.15);
      const multiplier = 1 + rand(0.05, 0.3);
      bullet.style.setProperty('--travel-x', `${dx * multiplier + jitter * 80}px`);
      bullet.style.setProperty('--travel-y', `${dy * multiplier + jitter * 80}px`);
      bullet.style.setProperty('--duration', `${rand(320, 520)}ms`);
      bullet.style.setProperty('--bullet-angle', `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`);
      registerEffect(bullet);
    }
  });
}

function launchMissiles(pointer) {
  const missiles = Math.floor(rand(2, 4));
  for (let i = 0; i < missiles; i++) {
    const radius = rand(220, 420);
    const angle = rand(Math.PI * -0.25, Math.PI * 1.25);
    const startX = pointer.x + Math.cos(angle) * radius;
    const startY = pointer.y + Math.sin(angle) * radius;
    const missile = document.createElement('div');
    missile.className = 'effect effect-missile';
    missile.style.left = `${pointer.x}px`;
    missile.style.top = `${pointer.y}px`;
    missile.style.translate = '-50% -50%';
    missile.style.setProperty('--from-x', `${startX - pointer.x}px`);
    missile.style.setProperty('--from-y', `${startY - pointer.y}px`);
    missile.style.setProperty('--duration', `${rand(900, 1400)}ms`);
    missile.style.rotate = `${(Math.atan2(pointer.y - startY, pointer.x - startX) * 180) / Math.PI}deg`;
    registerEffect(missile);
  }
}

function spawnInkTrail(pointer) {
  const blobs = 14;
  for (let i = 0; i < blobs; i++) {
    const blob = document.createElement('div');
    blob.className = 'effect effect-ink-trail';
    const angle = rand(-Math.PI, Math.PI);
    const radius = rand(6, 120);
    blob.style.left = `${pointer.x - Math.cos(angle) * radius}px`;
    blob.style.top = `${pointer.y - Math.sin(angle) * radius}px`;
    blob.style.translate = '-50% -50%';
    blob.style.setProperty('--duration', `${rand(400, 900)}ms`);
    blob.style.setProperty('--blob-scale', rand(0.6, 1.4).toFixed(2));
    blob.style.setProperty('--blob-rotate', `${rand(-25, 25)}deg`);
    registerEffect(blob);
  }
}

function dropTears() {
  const centers = getEyeCenters();
  centers.forEach((center) => {
    const tear = document.createElement('div');
    tear.className = 'effect effect-tear';
    tear.style.left = `${center.x}px`;
    tear.style.top = `${center.y}px`;
    tear.style.translate = '-50% -50%';
    tear.style.setProperty('--drop-distance', `${rand(140, 240)}px`);
    tear.style.setProperty('--duration', `${rand(900, 1200)}ms`);
    registerEffect(tear);
  });
}

function chainLightning(pointer) {
  const centers = getEyeCenters();
  centers.forEach((center) => {
    const bolt = document.createElement('div');
    bolt.className = 'effect effect-lightning';
    bolt.style.left = `${center.x}px`;
    bolt.style.top = `${center.y}px`;
    const dx = pointer.x - center.x;
    const dy = pointer.y - center.y;
    const length = Math.hypot(dx, dy);
    bolt.style.rotate = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;
    bolt.style.setProperty('--beam-length', `${length}px`);
    bolt.style.setProperty('--duration', `${rand(260, 420)}ms`);
    registerEffect(bolt);
  });
}

function bubbleBurst(pointer) {
  const bubbles = 8;
  for (let i = 0; i < bubbles; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'effect effect-bubble';
    bubble.style.left = `${pointer.x}px`;
    bubble.style.top = `${pointer.y}px`;
    bubble.style.translate = '-50% -50%';
    const angle = rand(Math.PI * -0.3, Math.PI * 0.3);
    const distance = rand(80, 200);
    bubble.style.setProperty('--bubble-x', `${Math.cos(angle) * distance}px`);
    bubble.style.setProperty('--bubble-y', `${-Math.abs(Math.sin(angle) * distance) - rand(40, 120)}px`);
    bubble.style.setProperty('--duration', `${rand(1200, 2000)}ms`);
    bubble.style.setProperty('--bubble-size', `${rand(40, 90)}px`);
    registerEffect(bubble);
  }
}

function portalSummon(pointer) {
  const portal = document.createElement('div');
  portal.className = 'effect effect-portal';
  portal.style.left = `${pointer.x}px`;
  portal.style.top = `${pointer.y}px`;
  portal.style.translate = '-50% -50%';
  portal.style.setProperty('--duration', `${rand(900, 1500)}ms`);
  registerEffect(portal);

  const stars = 4;
  for (let i = 0; i < stars; i++) {
    const star = document.createElement('div');
    star.className = 'effect effect-mini-star';
    star.style.left = `${pointer.x}px`;
    star.style.top = `${pointer.y}px`;
    star.style.translate = '-50% -50%';
    const angle = rand(0, Math.PI * 2);
    const distance = rand(80, 200);
    star.style.setProperty('--star-x', `${Math.cos(angle) * distance}px`);
    star.style.setProperty('--star-y', `${Math.sin(angle) * distance}px`);
    star.style.setProperty('--duration', `${rand(800, 1400)}ms`);
    registerEffect(star);
  }
}

function audioPulse(pointer) {
  const rings = 3;
  for (let i = 0; i < rings; i++) {
    const ring = document.createElement('div');
    ring.className = 'effect effect-audio-ring';
    ring.style.left = `${pointer.x}px`;
    ring.style.top = `${pointer.y}px`;
    ring.style.translate = '-50% -50%';
    ring.style.setProperty('--duration', `${600 + i * 200}ms`);
    ring.style.setProperty('--ring-delay', `${i * 60}ms`);
    registerEffect(ring);
  }
}

function droneOrbit(pointer) {
  const drone = document.createElement('div');
  drone.className = 'effect effect-drone';
  drone.style.left = `${pointer.x}px`;
  drone.style.top = `${pointer.y}px`;
  drone.style.translate = '-50% -50%';
  drone.style.setProperty('--orbit-radius', `${rand(60, 140)}px`);
  drone.style.setProperty('--dash-x', `${rand(-40, 40)}px`);
  drone.style.setProperty('--dash-y', `${rand(-40, 40)}px`);
  drone.style.setProperty('--duration', `${rand(1200, 1700)}ms`);
  registerEffect(drone);
}

function coinMagnet(pointer) {
  const coins = 6;
  for (let i = 0; i < coins; i++) {
    const coin = document.createElement('div');
    coin.className = 'effect effect-coin';
    coin.style.left = `${pointer.x}px`;
    coin.style.top = `${pointer.y}px`;
    coin.style.translate = '-50% -50%';
    const startAngle = rand(0, Math.PI * 2);
    const startRadius = rand(120, 260);
    coin.style.setProperty('--coin-from-x', `${Math.cos(startAngle) * startRadius}px`);
    coin.style.setProperty('--coin-from-y', `${Math.sin(startAngle) * startRadius}px`);
    coin.style.setProperty('--duration', `${rand(700, 1100)}ms`);
    registerEffect(coin);
  }
}

function pixelDisperse(pointer) {
  const pixels = 24;
  for (let i = 0; i < pixels; i++) {
    const pixel = document.createElement('div');
    pixel.className = 'effect effect-pixel';
    pixel.style.left = `${pointer.x}px`;
    pixel.style.top = `${pointer.y}px`;
    pixel.style.translate = '-50% -50%';
    const angle = rand(0, Math.PI * 2);
    const distance = rand(20, 140);
    pixel.style.setProperty('--pixel-x', `${Math.cos(angle) * distance}px`);
    pixel.style.setProperty('--pixel-y', `${Math.sin(angle) * distance}px`);
    pixel.style.setProperty('--duration', `${rand(500, 900)}ms`);
    registerEffect(pixel);
  }
}

const specialAttacks = [
  shootEyeBeams,
  fireBulletBurst,
  launchMissiles,
  spawnInkTrail,
  dropTears,
  chainLightning,
  bubbleBurst,
  portalSummon,
  audioPulse,
  droneOrbit,
  coinMagnet,
  pixelDisperse,
];

function spawnEffect(event) {
  if (event.button !== 0) return;
  const now = performance.now();
  if (now - lastClickTime < MIN_CLICK_INTERVAL) return;
  lastClickTime = now;

  const pointer = { x: event.clientX, y: event.clientY };
  spawnVariantEffects(event);
  const attack = pick(specialAttacks);
  attack(pointer);
  drawPointerEcho(pointer);
  cleanupOldEffects();
}

let pendingPointer = null;
let rafId = null;

function handlePointerFrame() {
  if (!pendingPointer) return;
  updateEyes(pendingPointer);
  pendingPointer = null;
  rafId = null;
}

window.addEventListener('pointermove', (event) => {
  pendingPointer = {
    clientX: event.clientX,
    clientY: event.clientY,
  };
  if (!rafId) {
    rafId = requestAnimationFrame(handlePointerFrame);
  }
  syncCursor(event);
});

window.addEventListener('click', spawnEffect);

window.addEventListener(
  'mousedown',
  (event) => {
    if (event.button === 0) {
      event.preventDefault();
    }
  },
  { passive: false }
);

window.addEventListener('resize', () => {
  cursor.style.display = window.innerWidth < 600 ? 'none' : 'block';
  if (window.innerWidth < 600) {
    cursorVisible = false;
    cursor.style.opacity = '0';
  }
});

window.addEventListener('pointerleave', () => {
  cursorVisible = false;
  cursor.style.opacity = '0';
});

window.addEventListener('pointerenter', (event) => {
  cursorVisible = true;
  cursor.style.opacity = '1';
  cursorTarget.x = event.clientX;
  cursorTarget.y = event.clientY;
  if (!cursorRafId) {
    cursorRafId = requestAnimationFrame(cursorLoop);
  }
});

