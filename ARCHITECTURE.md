# Architecture

Missile defense game where players launch fireworks to intercept incoming threats and protect cities.

## File Structure (ES Modules)

- **index.html** - HTML markup only, loads `main.js` as module
- **style.css** - All styles (HUD, game over screen, utilities)
- **audio.js** - `AudioManager` class (Web Audio API sounds) - `export default`
- **main.js** - Game logic, entities, rendering - imports `AudioManager`

## Key Entry Points

- `init()` - Called on `window.onload`, sets up canvas, event listeners, starts game loop
- `gameLoop(timestamp)` - Main loop via `requestAnimationFrame`
- `restartGame()` - Resets state, exposed globally for button onclick

## Entity Classes (in main.js)

- `Star`, `City` - Background/environment
- `EnemyMissile`, `DefenseFirework` - Projectiles
- `Explosion`, `Particle` - Visual effects
