# Architecture

Missile defense game where players launch fireworks to intercept incoming threats and protect cities.

## Data/Systems Architecture

This game uses a **data/systems architecture** with **I/O isolation**:

- **Data**: All game entities are plain JavaScript objects, not class instances
- **Systems**: Pure functions that receive state, mutate state, return nothing
- **I/O Isolation**: Logic functions never call audio/canvas directly; I/O happens at boundaries

### I/O Boundary Pattern

```
Input Events → inputBuffer → processInput() → state mutations
                                                    ↓
                              updateSpawning() → updateMovement() → updateCollisions()
                                                    ↓
                              state.soundBuffer → flushSounds() → Audio API
                                                    ↓
                              state → render() → Canvas API / DOM
```

1. **Input**: Events buffer to `state.inputBuffer`, processed at frame start
2. **Logic**: Systems mutate state only, pushing sounds to `state.soundBuffer`
3. **Output**: Sound buffer flushed to audio, then state rendered to screen

## File Structure

```
index.html          # HTML markup, loads main.js as module
style.css           # All styles (HUD, game over, utilities)
config.js           # CONFIG object with balance values
audio.js            # AudioManager class (Web Audio API)
state.js            # createInitialState + entity factory functions
main.js             # Game loop, init, event handlers
systems/
  input.js          # processInput - buffer → state
  spawn.js          # updateSpawning - create missiles
  movement.js       # updateMovement - positions, physics
  collision.js      # updateCollisions - hits, scoring, combo
  render.js         # render - canvas drawing, DOM updates
  sound.js          # flushSounds - buffer → audio
```

## State Structure

```javascript
{
  // Game data
  score, highScore, level, combo, isGameOver,
  screenShake, missedCount, spawnTimer, spawnInterval, levelTimer, lastTime,

  // Canvas dimensions
  canvasWidth, canvasHeight,

  // Entity arrays (plain objects)
  missiles: [],      // Enemy missiles
  defenseMines: [],  // Player fireworks
  explosions: [],    // Explosion circles
  particles: [],     // Visual particles
  cities: [],        // City buildings
  stars: [],         // Background stars

  // I/O Buffers
  inputBuffer: [],   // { type: 'launch', x, y }
  soundBuffer: [],   // { type: 'launch' | 'explosion' | 'cityHit', volume? }
}
```

## Entity Data Shapes

All entities are plain objects created by factory functions:

- `createStar(canvasWidth, canvasHeight)` - Background star
- `createCity(x, width, canvasHeight)` - City building with windows
- `createEnemyMissile(state, isFast)` - Enemy projectile
- `createDefenseFirework(state, targetX, targetY)` - Player projectile
- `createExplosion(x, y, color, maxRadius, isPlayer)` - Expanding/shrinking circle
- `createParticle(x, y, color, speedScale, size, overrides)` - Visual particle

## System Responsibilities

| System | File | Purpose |
|--------|------|---------|
| Input | `systems/input.js` | Process buffered input, create defense fireworks |
| Spawn | `systems/spawn.js` | Timer-based missile spawning, level progression |
| Movement | `systems/movement.js` | Update positions, physics, particle trails |
| Collision | `systems/collision.js` | Hit detection, scoring, combo, game over |
| Render | `systems/render.js` | Canvas drawing, DOM updates |
| Sound | `systems/sound.js` | Flush sound buffer to AudioManager |

## Game Loop

```javascript
function gameLoop(timestamp) {
  const dt = timestamp - state.lastTime;
  state.lastTime = timestamp;

  // 1. Buffer → State
  processInput(state);

  // 2. Pure logic (no I/O)
  updateSpawning(state, dt);
  updateMovement(state);
  updateCollisions(state);

  // 3. Sound buffer → Audio
  flushSounds(state.soundBuffer, audio);
  state.soundBuffer = [];

  // 4. State → Screen
  render(ctx, state, domElements);

  requestAnimationFrame(gameLoop);
}
```

## Key Entry Points

- `init()` - Called on `window.onload`, sets up canvas, event listeners, starts game
- `gameLoop(timestamp)` - Main loop via `requestAnimationFrame`
- `restartGame()` - Creates fresh state, exposed globally for button onclick

## Critical Constraints

1. **No audio calls** inside systems except `sound.js`
2. **No ctx calls** inside systems except `render.js`
3. **No DOM manipulation** inside systems except `render.js`
4. Logic functions receive state, mutate state, return nothing
5. Entity factories are pure functions (except for `Math.random`)
