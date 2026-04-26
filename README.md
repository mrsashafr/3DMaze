3D Maze Game

Web-based first-person 3D maze, built with Three.js. At launch you enter your name and pick a maze size (**5×5**, **10×10**, **15×15**, or **20×20**). Your position and run timer are saved in the browser so a **refresh continues the same maze and position** (until you finish or start over).

## Run locally

Browsers block ES modules from `file://`. Serve the project folder:

```bash
python -m http.server 8080
```

Open `http://localhost:8080/`.

## Controls

- **Arrow Up / Down**: move forward / backward along where you are looking.
- **Arrow Left / Right**: turn left / right.

If keys feel stuck after switching windows, click the page or reload. Arrow states clear when the tab loses focus.

## HUD

- **Top 10**: best escape times stored locally for **each maze size** (lower time is better).
- **Respawn**: return to the maze start and **reset the timer** (same layout).
- **Rebuild**: new random maze at the **same size**, start from the beginning with a **new timer**.

When you reach the exit, you see your time and the **top 10 for that size**; your run is added to the leaderboard if it qualifies.

## Persistence

Progress is stored in `localStorage` under a fixed key (same device/browser). Clearing site data removes saves and leaderboards.
