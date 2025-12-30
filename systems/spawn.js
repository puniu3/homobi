/**
 * Spawn System
 * Handles spawning of enemy missiles based on game progression
 */

import { CONFIG } from '../config.js';
import { createEnemyMissile } from '../state.js';

/**
 * Update spawning logic and create new missiles
 * @param {Object} state - Game state
 * @param {number} dt - Delta time in milliseconds
 */
export function updateSpawning(state, dt) {
    if (state.isGameOver) return;

    state.spawnTimer += dt;
    state.levelTimer += dt;

    // Calculate current level based on time and score
    state.level = Math.floor(
        state.levelTimer / CONFIG.level.timeWeight +
        state.score / CONFIG.level.scoreWeight
    ) + 1;

    // Spawn new missiles
    if (state.spawnTimer > state.spawnInterval) {
        state.missiles.push(createEnemyMissile(state, false));
        state.spawnTimer = 0;
        state.spawnInterval = Math.max(
            CONFIG.spawn.minInterval,
            CONFIG.spawn.baseInterval - (state.level * CONFIG.spawn.levelScale)
        );
    }
}
