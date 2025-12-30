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
    for (const missile of state.missiles) {
        if (!missile.active) continue;

        missile.x += missile.vx;
        missile.y += missile.vy;

        if (missile.isFast) {
            missile.flicker += 0.8;
            // Intense particle trail
            for (let i = 0; i < 3; i++) {
                state.particles.push(createParticle(missile.x, missile.y, '#ff00ff', 1.0, 1.8));
            }
            state.particles.push(createParticle(missile.x, missile.y, '#ffffff', 0.6, 1.2));
        } else {
            missile.flicker += 0.2;
            if (Math.random() > 0.3) {
                state.particles.push(createParticle(missile.x, missile.y, '#ff4400', 0.6, 1.2));
            }
        }
    }
}

/**
 * Update defense firework positions and trails
 * @param {Object} state - Game state
 */
function updateDefenseMines(state) {
    for (const mine of state.defenseMines) {
        if (!mine.active) continue;

        mine.x += mine.vx;
        mine.y += mine.vy;
        state.particles.push(createParticle(mine.x, mine.y, mine.color, 0.3, 1.0));
    }
}

/**
 * Update explosion radii
 * @param {Object} state - Game state
 */
function updateExplosions(state) {
    for (const explosion of state.explosions) {
        if (!explosion.active) continue;

        if (explosion.growing) {
            explosion.radius += 5;
            if (explosion.radius >= explosion.maxRadius) {
                explosion.growing = false;
            }
        } else {
            explosion.radius -= 1.8;
            explosion.alpha -= 0.01;
            if (explosion.radius <= 0 || explosion.alpha <= 0) {
                explosion.active = false;
                // Decay combo if player explosion didn't hit any enemy
                if (explosion.isPlayer && !explosion.hasHitEnemy) {
                    state.combo = Math.floor(state.combo * CONFIG.combo.decayRate);
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
 * Update all entity movements
 * @param {Object} state - Game state
 */
export function updateMovement(state) {
    updateStars(state);
    updateMissiles(state);
    updateDefenseMines(state);
    updateExplosions(state);
    updateParticles(state);
}
