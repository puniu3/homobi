/**
 * Input System
 * Processes buffered input events and updates game state
 */

import { createDefenseFirework } from '../state.js';

/**
 * Process all buffered input events
 * @param {Object} state - Game state
 */
export function processInput(state) {
    for (const input of state.inputBuffer) {
        if (input.type === 'launch' && !state.isGameOver) {
            state.defenseMines.push(createDefenseFirework(state, input.x, input.y));
            state.soundBuffer.push({ type: 'launch' });
        }
    }
    state.inputBuffer = [];
}
