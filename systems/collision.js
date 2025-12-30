/**
 * Collision System
 * Handles all collision detection, scoring, and combo logic
 */

import { CONFIG } from '../config.js';
import {
    createExplosion,
    createEnemyMissile,
    createFireworkBurst,
    createDirectHitEffect,
} from '../state.js';

/**
 * Check defense firework direct hits against missiles
 * @param {Object} state - Game state
 */
function checkDefenseDirectHits(state) {
    const directHitRadius = CONFIG.directHitRadius;

    for (const mine of state.defenseMines) {
        if (!mine.active) continue;

        for (const missile of state.missiles) {
            if (!missile.active) continue;

            const d = Math.hypot(missile.x - mine.x, missile.y - mine.y);
            if (d < directHitRadius) {
                // Direct hit!
                missile.active = false;
                mine.active = false;

                // Extra bonus for hitting fast missiles (the only way to stop them)
                const comboBonus = missile.isFast
                    ? CONFIG.combo.directHitBonus.fast
                    : CONFIG.combo.directHitBonus.normal;
                const basePoints = missile.isFast
                    ? CONFIG.scoring.directHit.fast
                    : CONFIG.scoring.directHit.normal;

                state.combo += comboBonus;

                // Score with multiplier
                const multiplier = 1 + (state.combo * CONFIG.combo.multiplierPerStack);
                state.score += Math.floor(basePoints * multiplier);

                // Sound effects
                state.soundBuffer.push({
                    type: 'explosion',
                    volume: missile.isFast ? 0.35 : 0.25,
                });

                // Special direct hit effects (extra intense for fast missiles)
                createDirectHitEffect(state.particles, missile.x, missile.y);
                if (missile.isFast) {
                    // Extra spectacular effect for stopping fast missile
                    createDirectHitEffect(state.particles, missile.x, missile.y);
                    createFireworkBurst(state.particles, missile.x, missile.y, '#ff00ff', 100);
                }
                createFireworkBurst(state.particles, missile.x, missile.y, mine.color, 80);
                return; // One hit per mine
            }
        }

        // Check if defense mine reached its target
        const dist = Math.hypot(mine.targetX - mine.x, mine.targetY - mine.y);
        if (dist < CONFIG.defense.arrivalDistance) {
            mine.active = false;
            state.soundBuffer.push({ type: 'explosion' });
            state.explosions.push(
                createExplosion(mine.x, mine.y, mine.color, CONFIG.defense.explosionRadius, true)
            );
            createFireworkBurst(state.particles, mine.x, mine.y, mine.color, 120);
            // Add white sparkle particles
            for (let i = 0; i < 5; i++) {
                state.particles.push({
                    x: mine.x,
                    y: mine.y,
                    color: '#ffffff',
                    vx: (Math.random() - 0.5) * 16,
                    vy: (Math.random() - 0.5) * 16,
                    alpha: 1,
                    friction: 0.95,
                    gravity: 0.08,
                    size: 2.5 + Math.random(),
                    active: true,
                    decay: 0.01 + Math.random() * 0.02,
                });
            }
        }
    }
}

/**
 * Check explosion radius hits against missiles and handle combo
 * @param {Object} state - Game state
 */
function checkExplosionHits(state) {
    for (const explosion of state.explosions) {
        if (!explosion.active) continue;

        for (const missile of state.missiles) {
            if (!missile.active) continue;

            // Fast missiles are immune to explosion radius - only direct hit works
            if (missile.isFast) continue;

            const d = Math.hypot(missile.x - explosion.x, missile.y - explosion.y);
            if (d < explosion.radius + CONFIG.missile.hitMargin) {
                missile.active = false;

                if (explosion.isPlayer) {
                    // Each kill contributes to combo, with bonus for multi-kills
                    if (explosion.hasHitEnemy) {
                        state.combo += CONFIG.combo.multiKillBonus;
                    }
                    explosion.hasHitEnemy = true;
                    state.combo++;
                    const basePoints = CONFIG.scoring.explosionHit.base;
                    const multiplier = 1 + (state.combo * CONFIG.combo.multiplierPerStack);
                    state.score += Math.floor(
                        basePoints * (1 + state.level * CONFIG.scoring.explosionHit.levelBonus) * multiplier
                    );
                } else {
                    state.score += CONFIG.scoring.chainHit;
                }

                state.soundBuffer.push({ type: 'explosion', volume: 0.08 });
                createFireworkBurst(state.particles, missile.x, missile.y, '#ffffff', 40);
            }
        }
    }
}

/**
 * Check missiles hitting the ground or cities
 * @param {Object} state - Game state
 */
function checkMissileGroundHits(state) {
    for (const missile of state.missiles) {
        if (!missile.active) continue;

        if (missile.y >= state.canvasHeight - 5) {
            missile.active = false;

            // Count missed missiles
            state.missedCount++;

            // Every N misses, spawn a fast missile targeting a city
            if (state.missedCount >= CONFIG.penalty.missThreshold) {
                state.missedCount = 0;
                const liveCities = state.cities.filter(c => c.isAlive);
                if (liveCities.length > 0) {
                    state.missiles.push(createEnemyMissile(state, true));
                }
            }

            state.screenShake = missile.isFast
                ? CONFIG.missile.fast.screenShake
                : CONFIG.missile.normal.screenShake;

            let cityHit = false;
            for (const city of state.cities) {
                if (city.isAlive && Math.abs(missile.x - (city.x + city.width / 2)) < city.width) {
                    city.isAlive = false;
                    cityHit = true;
                    createFireworkBurst(
                        state.particles,
                        city.x + city.width / 2,
                        state.canvasHeight - 20,
                        '#555555',
                        60
                    );
                }
            }

            if (cityHit) {
                state.soundBuffer.push({ type: 'cityHit' });
                state.combo = Math.floor(state.combo * CONFIG.combo.decayRateOnCityHit);
                if (state.cities.every(c => !c.isAlive)) {
                    state.isGameOver = true;
                }
            } else {
                state.soundBuffer.push({ type: 'explosion' });
                state.combo = Math.floor(state.combo * CONFIG.combo.decayRateOnGroundHit);
            }

            const explosionColor = missile.isFast ? '#ff00ff' : '#ff3300';
            const explosionSize = missile.isFast
                ? CONFIG.missile.fast.explosionRadius
                : CONFIG.missile.normal.explosionRadius;
            state.explosions.push(
                createExplosion(missile.x, missile.y, explosionColor, explosionSize, false)
            );
            createFireworkBurst(
                state.particles,
                missile.x,
                missile.y,
                explosionColor,
                missile.isFast ? 70 : 30
            );
        }
    }
}

/**
 * Clean up inactive entities
 * @param {Object} state - Game state
 */
function cleanupEntities(state) {
    state.missiles = state.missiles.filter(m => m.active);
    state.defenseMines = state.defenseMines.filter(dm => dm.active);
    state.explosions = state.explosions.filter(e => e.active);
    state.particles = state.particles.filter(p => p.active);
}

/**
 * Update all collisions and related game logic
 * @param {Object} state - Game state
 */
export function updateCollisions(state) {
    checkDefenseDirectHits(state);
    checkExplosionHits(state);
    checkMissileGroundHits(state);
    cleanupEntities(state);
}
