import { forwardFromYaw } from "./player.js";

const IDLE_MS = 10_000;

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {HTMLElement} opts.container
 * @param {number} opts.sizeCells - 20
 * @param {number} opts.mapSize - canvas pixels
 * @param {[number, number]} opts.start
 * @param {[number, number]} opts.exit
 */
export function createMinimap(opts) {
  const { canvas, container, mapSize = 200 } = opts;

  let sizeCells = opts.sizeCells;
  let start = /** @type {[number, number]} */ (opts.start.slice());
  let exit = /** @type {[number, number]} */ (opts.exit.slice());

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D context unavailable");
  }

  let visible = true;
  let lastInputTime = 0;
  let mazeCells = /** @type {import("./maze.js").CellWalls[][]} */ (null);
  const pad = 8;
  let cellPx = (mapSize - pad * 2) / sizeCells;

  function recomputeCellPx() {
    cellPx = (mapSize - pad * 2) / sizeCells;
  }
  recomputeCellPx();

  /**
   * @param {object} o
   * @param {number} [o.sizeCells]
   * @param {[number, number]} [o.start]
   * @param {[number, number]} [o.exit]
   */
  function configure(o) {
    if (o.sizeCells != null) {
      sizeCells = o.sizeCells;
      recomputeCellPx();
    }
    if (o.start) start = /** @type {[number, number]} */ (o.start.slice());
    if (o.exit) exit = /** @type {[number, number]} */ (o.exit.slice());
  }

  function setVisible(v) {
    visible = v;
    container.classList.toggle("visible", v);
    container.classList.toggle("hidden", !v);
  }

  function show() {
    setVisible(true);
  }

  function hide() {
    setVisible(false);
  }

  function onUserMove() {
    lastInputTime = performance.now();
    hide();
  }

  function onTick(now) {
    if (now - lastInputTime >= IDLE_MS) {
      show();
    }
  }

  function initShow() {
    lastInputTime = performance.now();
    show();
  }

  /**
   * @param {import("./maze.js").CellWalls[][]} cells
   */
  function setMaze(cells) {
    mazeCells = cells;
  }

  function draw(
    playerX,
    playerZ,
    yaw,
  ) {
    if (!mazeCells || !ctx) return;
    const w = mapSize;
    const h = mapSize;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(0, 0, w, h);

    const sc = sizeCells;
    for (let j = 0; j < sc; j++) {
      for (let i = 0; i < sc; i++) {
        const c = mazeCells[j][i];
        const x0 = pad + i * cellPx;
        const y0 = pad + j * cellPx;
        if (c.n) {
          ctx.strokeStyle = "#5c4030";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0 + cellPx, y0);
          ctx.stroke();
        }
        if (c.w) {
          ctx.strokeStyle = "#5c4030";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0, y0 + cellPx);
          ctx.stroke();
        }
      }
    }
    for (let i = 0; i < sc; i++) {
      const c = mazeCells[sc - 1][i];
      if (c.s) {
        const y0 = pad + sc * cellPx;
        const x0 = pad + i * cellPx;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + cellPx, y0);
        ctx.stroke();
      }
    }
    for (let j = 0; j < sc; j++) {
      const c = mazeCells[j][sc - 1];
      if (c.e) {
        const x0 = pad + sc * cellPx;
        const y0 = pad + j * cellPx;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0, y0 + cellPx);
        ctx.stroke();
      }
    }

    const sx0 = pad + start[0] * cellPx;
    const sy0 = pad + start[1] * cellPx;
    ctx.fillStyle = "rgba(60, 180, 90, 0.45)";
    ctx.fillRect(sx0, sy0, cellPx, cellPx);

    const ex0 = pad + exit[0] * cellPx;
    const ey0 = pad + exit[1] * cellPx;
    ctx.fillStyle = "rgba(190, 245, 200, 0.72)";
    ctx.fillRect(ex0, ey0, cellPx, cellPx);

    const px = pad + (playerX / 1) * cellPx;
    const pz = pad + (playerZ / 1) * cellPx;
    const fwd = forwardFromYaw(yaw);
    const arrowLen = cellPx * 0.4;
    ctx.fillStyle = "#e8c040";
    ctx.beginPath();
    ctx.arc(px, pz, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff8e0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, pz);
    // Map: x to right, z down: yaw forward (sin, -cos) -> screen: right is +i, down is +j matches +z
    ctx.lineTo(px + fwd.x * arrowLen, pz + fwd.z * arrowLen);
    ctx.stroke();
  }

  return {
    initShow,
    onUserMove,
    onTick,
    setMaze,
    configure,
    draw,
    get visible() {
      return visible;
    },
  };
}
