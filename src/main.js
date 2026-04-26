/* global THREE — from three.min.js */

const cellW = 1;
const wallT = 0.1 * cellW;
const wallH = 1.35;
const halfPlayer = 0.11;
const turnSpeed = 1.7;
const moveSpeed = 2.1;
const eyeH = 0.62;
const PERSIST_INTERVAL_MS = 400;
const EXIT_RADIUS = 0.48;

const startModal = document.getElementById("start-modal");
const playerNameInput = document.getElementById("player-name");
const mazeSizeSelect = document.getElementById("maze-size");
const startForm = document.getElementById("start-form");
const btnStart = document.getElementById("btn-start");
const startHint = document.getElementById("start-hint");
const appEl = document.getElementById("app");
const container = document.getElementById("canvas-container");
const minimapEl = document.getElementById("minimap-wrap");
const canvas = document.getElementById("minimap");
const gameHud = document.getElementById("game-hud");
const hudName = document.getElementById("hud-name");
const hudSize = document.getElementById("hud-size");
const hudTimer = document.getElementById("hud-timer");
const btnTop10 = document.getElementById("btn-top10");
const btnRespawn = document.getElementById("btn-respawn");
const btnRebuild = document.getElementById("btn-rebuild");
const lbModal = document.getElementById("lb-modal");
const lbContent = document.getElementById("lb-content");
const lbClose = document.getElementById("lb-close");
const winModal = document.getElementById("win-modal");
const winYourTime = document.getElementById("win-your-time");
const winTop10List = document.getElementById("win-top10-list");
const winClose = document.getElementById("win-close");

if (
  !startModal ||
  !playerNameInput ||
  !mazeSizeSelect ||
  !startForm ||
  !btnStart ||
  !appEl ||
  !container ||
  !minimapEl ||
  !canvas ||
  !gameHud ||
  !hudName ||
  !hudSize ||
  !hudTimer ||
  !btnTop10 ||
  !btnRespawn ||
  !btnRebuild ||
  !lbModal ||
  !lbContent ||
  !lbClose ||
  !winModal ||
  !winYourTime ||
  !winTop10List ||
  !winClose
) {
  throw new Error("DOM nodes missing");
}

let playerName = "";
let gameSize = 20;
let mazeSeed = 0;
/** @type {{ n: boolean, e: boolean, s: boolean, w: boolean }[][] | null} */
let cells = null;
let colliders = /** @type {{ minX: number, maxX: number, minZ: number, maxZ: number }[]} */ ([]);
let worldMax = 20;
let playerX = 0.5;
let playerZ = 0.5;
let yaw = 0;
let runStartMs = 0;
let gameCompleted = false;
/** Recorded once on win; used for HUD + save so time does not grow after finish */
let finishedTimeMs = 0;
let lastPersistAt = 0;

/** @type {[number, number]} */
let START = [0, 0];
/** @type {[number, number]} */
let EXIT = [19, 19];

let exitPos = { x: 19.5, z: 19.5 };
let startPos = { x: 0.5, z: 0.5 };

/** @type {THREE.Scene | null} */
let scene = null;
/** @type {THREE.PerspectiveCamera | null} */
let camera = null;
/** @type {THREE.WebGLRenderer | null} */
let renderer = null;
/** @type {THREE.Mesh | null} */
let wallMesh = null;
/** @type {THREE.Mesh | null} */
let floorM = null;
/** @type {THREE.Mesh | null} */
let exitTileM = null;
const woodTex = createWoodTexture({ size: 256 });
const wallMat = createWoodMaterial(woodTex);
if (wallMat.map) {
  wallMat.map.repeat.set(0.22, 0.5);
  wallMat.map.needsUpdate = true;
}
const floorTex = createFloorTexture();
const floorMat = createFloorMaterial(floorTex);

/** @type {ReturnType<typeof createMinimap> | null} */
let minimap = null;

const _lookXZ = new THREE.Vector3();
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

function clearKeys() {
  keys.ArrowUp = false;
  keys.ArrowDown = false;
  keys.ArrowLeft = false;
  keys.ArrowRight = false;
}

function onKeyDown(e) {
  if (e.code in keys) {
    e.preventDefault();
    keys[e.code] = true;
  }
}
function onKeyUp(e) {
  if (e.code in keys) {
    e.preventDefault();
    keys[e.code] = false;
  }
}

function initialYawFromStart() {
  if (!cells) return Math.PI;
  const [si, sj] = START;
  const c = cells[sj][si];
  if (!c.s) return Math.PI;
  if (!c.e) return Math.PI / 2;
  return Math.PI;
}

function syncStartExit() {
  const se = getStartExit(gameSize);
  START = se.start;
  EXIT = se.exit;
  startPos = {
    x: (START[0] + 0.5) * cellW,
    z: (START[1] + 0.5) * cellW,
  };
  exitPos = {
    x: (EXIT[0] + 0.5) * cellW,
    z: (EXIT[1] + 0.5) * cellW,
  };
  worldMax = gameSize * cellW;
}

function disposeWallFloor() {
  if (wallMesh && scene) {
    scene.remove(wallMesh);
    wallMesh.traverse((o) => {
      if (o instanceof THREE.Mesh && o.geometry) {
        o.geometry.dispose();
      }
    });
    wallMesh = null;
  }
  if (floorM && scene) {
    scene.remove(floorM);
    floorM.geometry.dispose();
    floorM = null;
  }
  if (exitTileM && scene) {
    scene.remove(exitTileM);
    exitTileM.geometry.dispose();
    const m = exitTileM.material;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m.dispose();
    exitTileM = null;
  }
  colliders = [];
}

function buildWallFloor() {
  if (!scene || !cells) return;
  disposeWallFloor();

  const geoms = [];
  const sz = gameSize;

  function addVerticalWall(i) {
    const w = new THREE.BoxGeometry(wallT, wallH, cellW);
    for (let j = 0; j < sz; j++) {
      let has;
      if (i === 0) has = cells[j][0].w;
      else if (i === sz) has = cells[j][sz - 1].e;
      else has = cells[j][i - 1].e;
      if (!has) continue;
      const g = w.clone();
      g.translate(i * cellW, wallH / 2, (j + 0.5) * cellW);
      geoms.push(g);
      colliders.push({
        minX: i * cellW - wallT / 2,
        maxX: i * cellW + wallT / 2,
        minZ: j * cellW,
        maxZ: (j + 1) * cellW,
      });
    }
  }

  function addHorizontalWall(j) {
    const w = new THREE.BoxGeometry(cellW, wallH, wallT);
    for (let i = 0; i < sz; i++) {
      let has;
      if (j === 0) has = cells[0][i].n;
      else if (j === sz) has = cells[sz - 1][i].s;
      else has = cells[j - 1][i].s;
      if (!has) continue;
      const g = w.clone();
      g.translate((i + 0.5) * cellW, wallH / 2, j * cellW);
      geoms.push(g);
      colliders.push({
        minX: i * cellW,
        maxX: (i + 1) * cellW,
        minZ: j * cellW - wallT / 2,
        maxZ: j * cellW + wallT / 2,
      });
    }
  }

  for (let i = 0; i <= sz; i++) addVerticalWall(i);
  for (let j = 0; j <= sz; j++) addHorizontalWall(j);

  const grp = new THREE.Group();
  for (const g of geoms) {
    const m = new THREE.Mesh(g, wallMat);
    m.castShadow = true;
    m.receiveShadow = true;
    grp.add(m);
  }
  wallMesh = grp;
  scene.add(grp);

  const floorG = new THREE.PlaneGeometry(worldMax, worldMax);
  floorM = new THREE.Mesh(floorG, floorMat);
  floorM.rotation.x = -Math.PI / 2;
  floorM.position.set(worldMax / 2, 0, worldMax / 2);
  floorM.receiveShadow = true;
  scene.add(floorM);

  const exitMat = new THREE.MeshStandardMaterial({
    color: 0xd4f5d8,
    roughness: 0.82,
    metalness: 0,
    emissive: 0x5a9c62,
    emissiveIntensity: 0.12,
  });
  const exitGeom = new THREE.PlaneGeometry(cellW * 0.94, cellW * 0.94);
  exitTileM = new THREE.Mesh(exitGeom, exitMat);
  exitTileM.rotation.x = -Math.PI / 2;
  exitTileM.position.set(
    (EXIT[0] + 0.5) * cellW,
    0.012,
    (EXIT[1] + 0.5) * cellW,
  );
  exitTileM.receiveShadow = true;
  scene.add(exitTileM);

  if (floorMat.map) {
    floorMat.map.repeat.set(sz, sz);
    floorMat.map.needsUpdate = true;
  }

  const fogFar = Math.max(24, sz * 1.35 + 8);
  scene.fog = new THREE.Fog(0x0d0a08, Math.min(8, sz * 0.35), fogFar);
}

function ensureThree() {
  if (scene) return;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0a08);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.04,
    200,
  );
  camera.rotation.order = "YXZ";

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const sun = new THREE.DirectionalLight(0xffeecc, 0.8);
  sun.position.set(8, 28, 6);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xaaccff, 0.2);
  fill.position.set(-4, 8, -2);
  scene.add(fill);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") clearKeys();
  });
}

function ensureMinimap() {
  if (minimap) return minimap;
  minimap = createMinimap({
    canvas,
    container: minimapEl,
    sizeCells: gameSize,
    start: [...START],
    exit: [...EXIT],
    mapSize: 200,
  });
  return minimap;
}

function persistState() {
  saveGameState({
    name: playerName,
    size: gameSize,
    seed: mazeSeed,
    playerX,
    playerZ,
    yaw,
    runStartMs,
    completed: gameCompleted,
    lastTimeMs: gameCompleted ? finishedTimeMs : undefined,
  });
}

function maybePersist(now) {
  if (gameCompleted) return;
  if (now - lastPersistAt < PERSIST_INTERVAL_MS) return;
  lastPersistAt = now;
  persistState();
}

function formatDuration(ms) {
  const s = Math.max(0, ms) / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}m ${r.toFixed(2)}s`;
}

function tableHtmlForSize(size) {
  const rows = getLeaderboard(size);
  let body = "";
  if (rows.length === 0) {
    body = `<tr><td colspan="3">No times yet</td></tr>`;
  } else {
    body = rows
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${formatDuration(r.timeMs)}</td></tr>`,
      )
      .join("");
  }
  return `
    <div class="lb-block">
      <h4>${size} × ${size}</h4>
      <table class="leader"><thead><tr><th>#</th><th>Name</th><th>Time</th></tr></thead>
      <tbody>${body}</tbody></table>
    </div>`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openLeaderboardModal() {
  lbContent.innerHTML = ALLOWED_SIZES.map((s) => tableHtmlForSize(s)).join("");
  lbModal.classList.remove("hidden");
}

function closeLeaderboardModal() {
  lbModal.classList.add("hidden");
}

function openWinModal(timeMs) {
  finishedTimeMs = timeMs;
  const top = addLeaderboardEntry(gameSize, {
    name: playerName,
    timeMs,
  });
  winYourTime.textContent = `Your time: ${formatDuration(timeMs)}`;
  let body = "";
  if (top.length === 0) {
    body = `<tr><td colspan="3">—</td></tr>`;
  } else {
    body = top
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${formatDuration(r.timeMs)}</td></tr>`,
      )
      .join("");
  }
  winTop10List.innerHTML = `<table class="leader"><thead><tr><th>#</th><th>Name</th><th>Time</th></tr></thead><tbody>${body}</tbody></table>`;
  winModal.classList.remove("hidden");
  persistState();
}

function closeWinModal() {
  winModal.classList.add("hidden");
}

function showGameChrome() {
  startModal.classList.add("hidden");
  appEl.classList.remove("hidden");
  gameHud.classList.remove("hidden");
  hudName.textContent = playerName;
  hudSize.textContent = `${gameSize} × ${gameSize}`;
  void container.offsetHeight;
}

function showStartModal(message) {
  appEl.classList.add("hidden");
  gameHud.classList.add("hidden");
  startModal.classList.remove("hidden");
  if (startHint && message) {
    startHint.textContent = message;
    startHint.classList.remove("hidden");
  } else if (startHint) {
    startHint.classList.add("hidden");
  }
}

/**
 * @param {object} opts
 * @param {boolean} [opts.restore]
 */
function beginGame(opts = {}) {
  try {
    beginGameInner(opts);
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    alert(`Could not start the game: ${msg}`);
  }
}

/**
 * @param {object} opts
 * @param {boolean} [opts.restore]
 */
function beginGameInner(opts = {}) {
  const restore = !!opts.restore;
  if (!restore) {
    const rawName = playerNameInput.value.trim().slice(0, 32);
    playerName = rawName || "Player";
    const sz = parseInt(mazeSizeSelect.value, 10);
    if (!ALLOWED_SIZES.includes(sz)) {
      alert("Pick a valid maze size.");
      return;
    }
    gameSize = sz;
    mazeSeed = (Math.random() * 0x7fffffff) | 0;
    syncStartExit();
    ({ cells } = generateMaze(gameSize, mazeSeed));
    if (!hasPath(cells, START, EXIT)) {
      console.error("No path");
    }
    playerX = startPos.x;
    playerZ = startPos.z;
    yaw = initialYawFromStart();
    runStartMs = Date.now();
    gameCompleted = false;
    finishedTimeMs = 0;
  } else {
    const s = opts.state != null ? opts.state : loadGameState();
    if (!s) {
      alert("No saved game to restore.");
      return;
    }
    playerName = s.name;
    gameSize = s.size;
    mazeSeed = s.seed;
    syncStartExit();
    ({ cells } = generateMaze(gameSize, mazeSeed));
    if (!hasPath(cells, START, EXIT)) {
      console.error("No path");
    }
    playerX = s.playerX;
    playerZ = s.playerZ;
    yaw = s.yaw;
    runStartMs = s.runStartMs;
    gameCompleted = false;
    finishedTimeMs = 0;
  }

  ensureThree();
  buildWallFloor();

  minimap = null;
  const mm = ensureMinimap();
  mm.configure({ sizeCells: gameSize, start: [...START], exit: [...EXIT] });
  mm.setMaze(cells);
  mm.initShow();

  showGameChrome();
  lastPersistAt = 0;
  persistState();
}

function respawnPlayer() {
  if (!cells) return;
  closeWinModal();
  syncStartExit();
  playerX = startPos.x;
  playerZ = startPos.z;
  yaw = initialYawFromStart();
  runStartMs = Date.now();
  gameCompleted = false;
  finishedTimeMs = 0;
  minimap?.initShow();
  persistState();
}

function rebuildMaze() {
  if (!cells) return;
  closeWinModal();
  mazeSeed = (Math.random() * 0x7fffffff) | 0;
  ({ cells } = generateMaze(gameSize, mazeSeed));
  if (!hasPath(cells, START, EXIT)) {
    console.error("No path");
  }
  buildWallFloor();
  syncStartExit();
  playerX = startPos.x;
  playerZ = startPos.z;
  yaw = initialYawFromStart();
  runStartMs = Date.now();
  gameCompleted = false;
  finishedTimeMs = 0;
  minimap?.configure({ sizeCells: gameSize, start: [...START], exit: [...EXIT] });
  minimap?.setMaze(cells);
  minimap?.initShow();
  persistState();
}

startForm.addEventListener("submit", (e) => {
  e.preventDefault();
  beginGame({ restore: false });
});

btnTop10.addEventListener("click", () => openLeaderboardModal());
lbClose.addEventListener("click", () => closeLeaderboardModal());
lbModal.addEventListener("click", (e) => {
  if (e.target === lbModal) closeLeaderboardModal();
});

btnRespawn.addEventListener("click", () => respawnPlayer());
btnRebuild.addEventListener("click", () => rebuildMaze());

winClose.addEventListener("click", () => closeWinModal());
winModal.addEventListener("click", (e) => {
  if (e.target === winModal) closeWinModal();
});

let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (!scene || !camera || !renderer || !cells || !minimap) return;

  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (!gameCompleted) {
    hudTimer.textContent = formatDuration(Date.now() - runStartMs);
  } else {
    hudTimer.textContent = formatDuration(finishedTimeMs);
  }

  if (!gameCompleted) {
    let anyNav = false;
    if (keys.ArrowLeft) {
      yaw += turnSpeed * dt;
      anyNav = true;
    }
    if (keys.ArrowRight) {
      yaw -= turnSpeed * dt;
      anyNav = true;
    }

    camera.rotation.set(0, yaw, 0, "YXZ");
    camera.updateMatrixWorld(true);
    camera.getWorldDirection(_lookXZ);
    _lookXZ.y = 0;
    if (_lookXZ.lengthSq() > 1e-10) {
      _lookXZ.normalize();
    } else {
      _lookXZ.set(0, 0, -1);
    }

    let mx = 0;
    let mz = 0;
    const upHeld = keys.ArrowUp;
    const downHeld = keys.ArrowDown;
    if (upHeld && !downHeld) {
      mx += _lookXZ.x;
      mz += _lookXZ.z;
      anyNav = true;
    } else if (downHeld && !upHeld) {
      mx -= _lookXZ.x;
      mz -= _lookXZ.z;
      anyNav = true;
    }
    if (anyNav) {
      const len = Math.hypot(mx, mz) || 1;
      const sp = (moveSpeed * dt) / len;
      const next = tryMove2D(
        {
          x: playerX,
          z: playerZ,
          halfW: halfPlayer,
          walls: colliders,
          worldMinX: 0,
          worldMaxX: worldMax,
          worldMinZ: 0,
          worldMaxZ: worldMax,
        },
        mx * sp,
        mz * sp,
      );
      playerX = next.x;
      playerZ = next.z;
      minimap.onUserMove();
    }

    const dExit = Math.hypot(playerX - exitPos.x, playerZ - exitPos.z);
    if (dExit < EXIT_RADIUS) {
      gameCompleted = true;
      const timeMs = Date.now() - runStartMs;
      openWinModal(timeMs);
    }
  }

  camera.position.set(playerX, eyeH, playerZ);
  camera.rotation.set(0, yaw, 0, "YXZ");

  minimap.onTick(now);
  minimap.draw(playerX, playerZ, yaw);

  renderer.render(scene, camera);
  maybePersist(now);
}

function boot() {
  const saved = loadGameState();
  if (saved && !saved.completed && ALLOWED_SIZES.includes(saved.size)) {
    if (startHint) {
      startHint.textContent = `Restored your run (${saved.name}, ${saved.size}×${saved.size}). Refresh keeps your position.`;
      startHint.classList.remove("hidden");
    }
    playerNameInput.value = saved.name;
    mazeSizeSelect.value = String(saved.size);
    beginGame({ restore: true, state: saved });
  } else {
    if (saved?.completed && startHint) {
      startHint.textContent = "Last run finished. Start a new game below.";
      startHint.classList.remove("hidden");
    }
    startModal.classList.remove("hidden");
  }
  requestAnimationFrame(frame);
}

try {
  boot();
} catch (err) {
  console.error(err);
  const msg = err instanceof Error ? err.message : String(err);
  alert(`Game failed to start: ${msg}`);
}
