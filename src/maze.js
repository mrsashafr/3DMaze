const ALLOWED_SIZES = [5, 10, 15, 20];

const DIR_N = 0;
const DIR_E = 1;
const DIR_S = 2;
const DIR_W = 3;

const DI = [0, 1, 0, -1];
const DJ = [-1, 0, 1, 0];

/**
 * @typedef {{ n: boolean, e: boolean, s: boolean, w: boolean }} CellWalls
 */

/**
 * @param {number} size
 * @returns {{ start: [number, number], exit: [number, number] }}
 */
function getStartExit(size) {
  return {
    start: [0, 0],
    exit: [size - 1, size - 1],
  };
}

/**
 * Depth-first maze. Start top-left, exit bottom-right; perfect maze ⇒ path exists.
 * @param {number} size - grid dimension (e.g. 5, 10, 15, 20)
 * @param {number} [seed] - for reproducibility
 * @returns {{ cells: CellWalls[][], w: number, h: number }}
 */
function generateMaze(size, seed = null) {
  const w = size;
  const h = size;
  const rng = seed != null ? mulberry32(seed) : () => Math.random();

  /** @type {CellWalls[][]} */
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ n: true, e: true, s: true, w: true })),
  );

  const visited = Array.from({ length: h }, () => Array(w).fill(false));
  const stack = /** @type {[number, number][]} */ ([[0, 0]]);
  visited[0][0] = true;

  while (stack.length) {
    const [ci, cj] = stack[stack.length - 1];
    const options = [];
    for (let d = 0; d < 4; d++) {
      const ni = ci + DI[d];
      const nj = cj + DJ[d];
      if (ni < 0 || ni >= w || nj < 0 || nj >= h) continue;
      if (visited[nj][ni]) continue;
      options.push(d);
    }
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const d = options[Math.floor(rng() * options.length)] | 0;
    const ni = ci + DI[d];
    const nj = cj + DJ[d];
    if (d === DIR_N) {
      cells[cj][ci].n = false;
      cells[nj][ni].s = false;
    } else if (d === DIR_E) {
      cells[cj][ci].e = false;
      cells[nj][ni].w = false;
    } else if (d === DIR_S) {
      cells[cj][ci].s = false;
      cells[nj][ni].n = false;
    } else {
      cells[cj][ci].w = false;
      cells[nj][ni].e = false;
    }
    visited[nj][ni] = true;
    stack.push([ni, nj]);
  }

  return { cells, w, h };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {CellWalls[][]} cells
 * @param {[number, number]} from
 * @param {[number, number]} to
 */
function hasPath(cells, from, to) {
  const w = cells[0].length;
  const h = cells.length;
  const q = [from];
  const seen = new Set([`${from[0]},${from[1]}`]);
  const goal = `${to[0]},${to[1]}`;

  while (q.length) {
    const [i, j] = /** @type {[number, number]} */ (q.shift());
    const key = `${i},${j}`;
    if (key === goal) return true;
    const c = cells[j][i];
    if (!c.n && j > 0) {
      const k = `${i},${j - 1}`;
      if (!seen.has(k)) {
        seen.add(k);
        q.push([i, j - 1]);
      }
    }
    if (!c.e && i < w - 1) {
      const k = `${i + 1},${j}`;
      if (!seen.has(k)) {
        seen.add(k);
        q.push([i + 1, j]);
      }
    }
    if (!c.s && j < h - 1) {
      const k = `${i},${j + 1}`;
      if (!seen.has(k)) {
        seen.add(k);
        q.push([i, j + 1]);
      }
    }
    if (!c.w && i > 0) {
      const k = `${i - 1},${j}`;
      if (!seen.has(k)) {
        seen.add(k);
        q.push([i - 1, j]);
      }
    }
  }
  return false;
}
