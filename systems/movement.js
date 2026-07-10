/**
 * Movement System
 * Updates positions of all moving entities
 */

import { CONFIG } from '../config.js';
import { createParticle } from '../state.js';

/**
 * Update star blinking
 * @param {Object} state - Game state
 */
function updateStars(state) {
    for (const star of state.stars) {
        star.alpha += star.blinkSpeed;
        if (star.alpha > 1 || star.alpha < 0) {
            star.blinkSpeed *= -1;
        }
    }
}

/**
 * Update missile positions and trails
 * @param {Object} state - Game state
 */
function updateMissiles(state) {
    const { scale } = state;

    for (const missile of state.missiles) {
        if (!missile.active) continue;

        missile.x += missile.vx;
        missile.y += missile.vy;

        if (missile.isFast) {
            missile.flicker += 0.4;   // @120Hz: half osc speed (half of old 0.8)
            // Intense particle trail — emit at half rate per step to keep @60fps density
            if (Math.random() < 0.5) {
                for (let i = 0; i < 3; i++) {
                    state.particles.push(createParticle(missile.x, missile.y, '#ff00ff', 1.0, 1.8, {}, scale));
                }
                state.particles.push(createParticle(missile.x, missile.y, '#ffffff', 0.6, 1.2, {}, scale));
            }
        } else {
            missile.flicker += 0.1;   // @120Hz: half osc speed (half of old 0.2)
            // half emission rate: old p=0.7 per frame -> p=0.35 per step
            if (Math.random() > 0.65) {
                state.particles.push(createParticle(missile.x, missile.y, '#ff4400', 0.6, 1.2, {}, scale));
            }
        }
    }
}

/**
 * Update defense firework positions and trails
 * @param {Object} state - Game state
 */
function updateDefenseMines(state) {
    const { scale } = state;

    for (const mine of state.defenseMines) {
        if (!mine.active) continue;

        mine.x += mine.vx;
        mine.y += mine.vy;
        // half emission rate per step to keep @60fps trail density
        if (Math.random() < 0.5) {
            state.particles.push(createParticle(mine.x, mine.y, mine.color, 0.3, 1.0, {}, scale));
        }
    }
}

/**
 * Update explosion radii
 * @param {Object} state - Game state
 */
function updateExplosions(state) {
    const { scale } = state;
    const growSpeed = 2.5 * scale;    // @120Hz: half of old 5
    const shrinkSpeed = 0.9 * scale;  // @120Hz: half of old 1.8

    for (const explosion of state.explosions) {
        if (!explosion.active) continue;

        if (explosion.growing) {
            explosion.radius += growSpeed;
            if (explosion.radius >= explosion.maxRadius) {
                explosion.growing = false;
            }
        } else {
            explosion.radius -= shrinkSpeed;
            explosion.alpha -= 0.005;   // @120Hz: half of old 0.01 per-step decay
            if (explosion.radius <= 0 || explosion.alpha <= 0) {
                explosion.active = false;
                // Decay combo if player explosion didn't hit any enemy
                if (explosion.isPlayer && !explosion.hasHitEnemy) {
                    state.combo = Math.floor(state.combo * CONFIG.combo.decayRateOnMiss);
                }
            }
        }
    }
}

/**
 * Update particle physics
 * @param {Object} state - Game state
 */
function updateParticles(state) {
    for (const particle of state.particles) {
        if (!particle.active) continue;

        particle.vx *= particle.friction;
        particle.vy *= particle.friction;
        particle.vy += particle.gravity;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= particle.decay;

        if (particle.alpha <= 0) {
            particle.active = false;
        }
    }
}

/**
 * Decay screen shake. Runs in the sim step (not render) so it is
 * frame-rate independent. Multiplicative decay -> sqrt transform @120Hz.
 * render.js only READS state.screenShake.
 * @param {Object} state - Game state
 */
function updateScreenShake(state) {
    if (state.screenShake > 0) {
        state.screenShake *= Math.sqrt(0.9);
        if (state.screenShake < 0.5) {
            state.screenShake = 0;
        }
    }
}

/**
 * Update all entity movements
 * @param {Object} state - Game state
 */
export function updateMovement(state) {
    updateStars(state);
    updateMissiles(state);
    updateDefenseMines(state);
    updateExplosions(state);
    updateParticles(state);
    updateScreenShake(state);
}
