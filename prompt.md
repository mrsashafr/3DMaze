We are creating WEB based First person view 3D maze escape game to be played in browser.

1) Start and menu flow
- Show a splash screen first with the exact text: "THIS IS TETRIS!". 
- Remove the splash screen on click or after 5 sec.
- On click, open the main menu screen.
- Main menu must include:
  - A drop-down list of maze sizes:
    - 5 x 5
    - 10 x 10
    - 15 x 15
    - 20 x 20
  - A "Top 10" button that opens the scoreboard.
  - mandatory field to enter user name before game starts

2) Scoreboard
- Show top 10 records for all 4 maze sizes in a tabbed view.
- Each record row must include: USER, TIME, DATE.
- Use the index.html file to store the results.

3) Maze generation and rules
- Generate the maze programmatically.
- Start point must be top-left cell.
- Exit must be bottom-right cell.
- Exit must be highlighted with a bright green light.
- Always guarantee at least one valid path from start to exit.
- Wall thickness must be 0.1 of block width.

4) Controls and gameplay
- Arrow Up: move forward
- Arrow Down: move backward
- Arrow Right: turn right
- Arrow Left: turn left

5) Minimap behavior
- Show top-down minimap at the beginning.
- If player is idle for 10 seconds, show minimap again.
- Hide minimap immediately when the player moves.

6) Theme
- Apply a Chainsaw Man: Shikaku-hen - Человек-бензопила visual theme to the maze and UI.

Implementation notes:
- Keep code modular and readable.
- Validate yourself after each step.