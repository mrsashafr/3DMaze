/**
 * Procedural wood-like color texture (no external images).
 * @param {object} [opts]
 * @param {number} [opts.size] - canvas size
 */
function createWoodTexture({ size = 256 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  // Base plank tone
  const baseR = 120;
  const baseG = 85;
  const baseB = 55;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Fine grain
      const n = (Math.sin(x * 0.35 + y * 0.12) * 0.5 + 0.5) * 18;
      // Ring-ish waves
      const w = (Math.sin(y * 0.08 + Math.sin(x * 0.02) * 3) * 0.5 + 0.5) * 25;
      const v = n + w + (y % 3) * 2;
      const r = Math.min(255, Math.max(0, baseR - v * 0.3 + (x % 4)));
      const g = Math.min(255, Math.max(0, baseG - v * 0.4));
      const b = Math.min(255, Math.max(0, baseB - v * 0.45));
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Dark grain lines
  ctx.strokeStyle = "rgba(40, 25, 12, 0.35)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const y = (i / 24) * size + (Math.random() * 2 - 1) * 3;
    ctx.beginPath();
    for (let x = 0; x < size; x += 4) {
      const j = y + Math.sin(x * 0.05) * 1.2;
      if (x === 0) ctx.moveTo(0, j);
      else ctx.lineTo(x, j);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * @param {THREE.Texture | null} woodTexture
 * @param {{ roughness?: number, metalness?: number }} [opts]
 */
function createWoodMaterial(woodTexture, opts = {}) {
  return new THREE.MeshStandardMaterial({
    map: woodTexture,
    color: 0xffffff,
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.05,
    side: THREE.DoubleSide,
  });
}

/** Floor: slightly different tone, still wood-ish */
function createFloorTexture({ size = 128 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const r0 = 90;
  const g0 = 70;
  const b0 = 48;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (Math.sin(x * 0.1) * 0.5 + 0.5) * 12;
      const r = Math.min(255, r0 - t);
      const g = Math.min(255, g0 - t * 0.9);
      const b = Math.min(255, b0 - t);
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createFloorMaterial(floorTexture) {
  return new THREE.MeshStandardMaterial({
    map: floorTexture,
    color: 0xccccbb,
    roughness: 0.88,
    metalness: 0,
  });
}
