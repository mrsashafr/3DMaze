/**
 * First-person movement with axis-separated collision against static wall AABBs.
 * @typedef {{ minX: number, maxX: number, minZ: number, maxZ: number }} AABB
 */

/**
 * @param {AABB} a
 * @param {AABB} b
 */
function intersects2D(a, b) {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxZ < b.minZ || a.minZ > b.maxZ);
}

/**
 * @param {number} x
 * @param {number} z
 * @param {number} halfW
 * @param {AABB[]} walls
 */
function collidesAt(x, z, halfW, walls) {
  const p = { minX: x - halfW, maxX: x + halfW, minZ: z - halfW, maxZ: z + halfW };
  for (const w of walls) {
    if (intersects2D(p, w)) return true;
  }
  return false;
}

/**
 * @param {object} p
 * @param {number} p.x
 * @param {number} p.z
 * @param {number} p.halfW
 * @param {AABB[]} p.walls
 * @param {number} p.worldMinX
 * @param {number} p.worldMaxX
 * @param {number} p.worldMinZ
 * @param {number} p.worldMaxZ
 * @param {number} dx
 * @param {number} dz
 */
function tryMove2D(p, dx, dz) {
  const hw = p.halfW;
  const { worldMinX, worldMaxX, worldMinZ, worldMaxZ, walls } = p;
  const clampW = (x, z) => ({
    x: Math.max(worldMinX + hw, Math.min(worldMaxX - hw, x)),
    z: Math.max(worldMinZ + hw, Math.min(worldMaxZ - hw, z)),
  });

  let x = p.x;
  let z = p.z;

  const nx = x + dx;
  if (!collidesAt(nx, z, hw, walls)) {
    x = nx;
  }

  const nz = z + dz;
  if (!collidesAt(x, nz, hw, walls)) {
    z = nz;
  }

  const c = clampW(x, z);
  return c;
}

/** Yaw: rotation around Y; forward in xz = (Math.sin(yaw), -Math.cos(yaw)) (camera at default looks -Z) */
function forwardFromYaw(yaw) {
  return { x: Math.sin(yaw), z: -Math.cos(yaw) };
}
