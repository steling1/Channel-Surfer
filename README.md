# CHANNEL // SURF

An original, dependency-free retro arcade game with eight constantly changing genres. Run `npm start` and open http://localhost:5173.

Use arrows or WASD to move, Space for action, and Escape to pause. Mobile players have touch controls. Each channel switch briefly introduces the controls. Choose starting difficulty, speed acceleration, switch duration, and included genres on the splash screen. Select one genre for practice.

Modes: space shooter, endless runner, breakout, snake, racing, flappy flight, asteroids, and frogger. Score and lives continue between channels; speed increases through the run. Shooter, runner, Breakout, racing, flight, and Asteroids use survival timers, with no score quota. Snake and Frogger require untimed objectives to switch (on Arcade: 5 pickups or 3 crossings). Complete those targets without taking a hit: losing a life resets target progress, while overall score remains. Targets scale with difficulty, switch cadence, and later rounds. Idle objective play earns no survival points. Each Frogger crossing accelerates traffic. Survival rounds start with threats already in play, and runner jumps require individual presses. Scores are saved locally in the browser. Sound is synthesized with Web Audio, and all artwork is drawn in Canvas. Google Fonts are optional; system fonts are used offline.

`npm run check` checks syntax. `npm test` exercises all eight game engines, scoring, movement, collisions, pause, switching, acceleration, invulnerability, game over, and restart. Open `/?debug=1` for the developer-only `window.arcadeDebug` test controls.

The game runs directly from `index.html`, `arcade.css`, and `arcade.js`. No build step or runtime dependencies are required. `arcade-server.cjs` provides the local development server.
