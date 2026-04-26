const GAME_KEY = "threeMaze_game_v1";

/** @typedef {{ name: string, timeMs: number, at: number }} LeaderEntry */

/**
 * @param {number} size
 */
function lbKey(size) {
  return `threeMaze_lb_${size}`;
}

/**
 * @returns {null | {
 *   name: string,
 *   size: number,
 *   seed: number,
 *   playerX: number,
 *   playerZ: number,
 *   yaw: number,
 *   runStartMs: number,
 *   completed: boolean,
 *   lastTimeMs?: number,
 * }}
 */
function loadGameState() {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (
      typeof o?.name !== "string" ||
      typeof o?.size !== "number" ||
      typeof o?.seed !== "number" ||
      typeof o?.playerX !== "number" ||
      typeof o?.playerZ !== "number" ||
      typeof o?.yaw !== "number" ||
      typeof o?.runStartMs !== "number" ||
      typeof o?.completed !== "boolean"
    ) {
      return null;
    }
    return o;
  } catch {
    return null;
  }
}

/**
 * @param {object} s
 * @param {string} s.name
 * @param {number} s.size
 * @param {number} s.seed
 * @param {number} s.playerX
 * @param {number} s.playerZ
 * @param {number} s.yaw
 * @param {number} s.runStartMs
 * @param {boolean} s.completed
 * @param {number} [s.lastTimeMs]
 */
function saveGameState(s) {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

function clearGameState() {
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {number} size
 * @returns {LeaderEntry[]}
 */
function getLeaderboard(size) {
  try {
    const raw = localStorage.getItem(lbKey(size));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (e) =>
          e &&
          typeof e.name === "string" &&
          typeof e.timeMs === "number" &&
          typeof e.at === "number",
      )
      .sort((a, b) => a.timeMs - b.timeMs)
      .slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * @param {number} size
 * @param {{ name: string, timeMs: number }} entry
 * @returns {LeaderEntry[]}
 */
function addLeaderboardEntry(size, entry) {
  const name = entry.name.trim().slice(0, 32) || "Anonymous";
  const timeMs = Math.max(0, entry.timeMs | 0);
  const at = Date.now();
  const list = getLeaderboard(size);
  list.push({ name, timeMs, at });
  list.sort((a, b) => a.timeMs - b.timeMs);
  const top = list.slice(0, 10);
  try {
    localStorage.setItem(lbKey(size), JSON.stringify(top));
  } catch {
    /* ignore */
  }
  return top;
}
