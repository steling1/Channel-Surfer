# CHANNEL // SURF

An original, dependency-free retro arcade game with eight constantly changing genres. Run `npm start` and open http://localhost:5173.

Use arrows or WASD to move, Space for action, and Escape to pause. Mobile players have touch controls. Each channel switch briefly introduces the controls. Choose starting difficulty, speed acceleration, switch duration, and included genres on the splash screen. Select one genre for practice.

Modes: space shooter, endless runner, breakout, snake, racing, flappy flight, asteroids, and frogger. Score and lives continue between channels; speed increases through the run. Shooter, runner, Breakout, racing, flight, and Asteroids use survival timers, with no score quota. Snake and Frogger require untimed objectives to switch (on Arcade: 5 pickups or 3 crossings). Complete those targets without taking a hit: losing a life resets target progress, while overall score remains. Targets scale with difficulty, switch cadence, and later rounds. Idle objective play earns no survival points. Each Frogger crossing accelerates traffic. Survival rounds start with threats already in play, and runner jumps require individual presses. Scores are saved locally in the browser. Sound is synthesized with Web Audio, and all artwork is drawn in Canvas. Google Fonts are optional; system fonts are used offline.

`npm run check` checks syntax. `npm test` exercises all eight game engines, scoring, movement, collisions, pause, switching, acceleration, invulnerability, game over, and restart. Open `/?debug=1` for the developer-only `window.arcadeDebug` test controls.

The game runs directly from `index.html`, `arcade.css`, and `arcade.js`. No build step or runtime dependencies are required. `arcade-server.cjs` provides the local development server.

## High scores

Enter a player name before starting. Completed runs save automatically. The table shows the top 20 scores, with time, channels, difficulty, enabled genre count, speed ramp, and switch cadence. Shared and local tables retain their top 100 runs.

- On PHP hosting, `scores.php` saves the shared table on the server so everyone on that website sees the same leaderboard.
- Without PHP, the game falls back to a local table in browser storage. Scores and personal best survive closing and reopening the browser. Clearing site data, changing browsers, or ending a private browsing session removes or separates those local scores.
- Every run saves locally before attempting a shared submission. If the server is unavailable, the page says so and offers a retry for the latest run.

## PHP hosting

Upload `index.html`, `arcade.css`, `arcade.js`, `leaderboard.js`, and `scores.php` together to a PHP 8.1+ host. The PHP process must be able to create and write `score-data.php` in the game directory. The file is created automatically and starts with a PHP guard to prevent direct web access. It is excluded from Git: preserve it when deploying updates and include it in server backups. Alternatively, set `CHANNEL_SURF_SCORE_FILE` to a writable file path outside the public web directory.

For local PHP development, run `npm run start:php` and open http://localhost:5174. `npm start` runs a static Node server and exercises the browser-only fallback. The PHP development server is for local use; use your web host's PHP runtime for the public website.

`npm test` runs the gameplay checks plus shared-score API checks when PHP is installed, including persistence across server restarts, duplicate submissions, invalid input, and inaccessible storage. Submitted scores come from the browser and are not independently verified gameplay results.
