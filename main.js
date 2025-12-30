/**
 * Celestial Guardian: Firework Defense
 * Main entry point - game loop, initialization, and event handlers
 */

import AudioManager from './audio.js';
import { CONFIG } from './config.js';
import { initConfigUI } from './config-ui.js';
import {
    createInitialState,
    createStar,
    resetStar,
    createCity,
} from './state.js';
import { processInput } from './systems/input.js';
import { updateSpawning } from './systems/spawn.js';
import { updateMovement } from './systems/movement.js';
import { updateCollisions } from './systems/collision.js';
import { render, pulseCombo, resetRenderCache } from './systems/render.js';
import { flushSounds } from './systems/sound.js';

// Audio manager instance
const audio = new AudioManager();

// Canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM elements for UI updates
const domElements = {
    scoreEl: document.getElementById('score'),
    levelEl: document.getElementById('level'),
    comboContainer: document.getElementById('combo-container'),
    comboValEl: document.getElementById('combo-val'),
    multValEl: document.getElementById('mult-val'),
    gameOverEl: document.getElementById('game-over'),
    finalScoreEl: document.getElementById('final-score'),
    highscoreEl: document.getElementById('highscore'),
    newHighscoreEl: document.getElementById('new-highscore'),
};

// Game state
let state = null;
let previousCombo = 0;

/**
 * Load high score from localStorage
 */
function loadHighScore() {
    try {
        const saved = localStorage.getItem('celestialGuardianHighScore');
        if (saved !== null) {
            return parseInt(saved, 10) || 0;
        }
    } catch (e) {
        console.warn('Could not load high score:', e);
    }
    return 0;
}

/**
 * Save high score to localStorage
 */
function saveHighScore(highScore) {
    try {
        localStorage.setItem('celestialGuardianHighScore', highScore.toString());
    } catch (e) {
        console.warn('Could not save high score:', e);
    }
}

/**
 * Initialize canvas size
 */
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (state) {
        state.canvasWidth = canvas.width;
        state.canvasHeight = canvas.height;
        state.scale = canvas.height / CONFIG.baseHeight;
        state.stars.forEach(s => resetStar(s, canvas.width, canvas.height));
    }
}

/**
 * Initialize the game
 */
function init() {
    resize();
    window.addEventListener('resize', resize);

    // Initialize config UI
    initConfigUI();

    // Input event handlers - buffer input, don't process directly
    const triggerInput = (e) => {
        audio.init();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        if (state) {
            state.inputBuffer.push({ type: 'launch', x: clientX, y: clientY });
        }
    };

    canvas.addEventListener('mousedown', triggerInput);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        triggerInput(e);
    }, { passive: false });

    // Start the game
    restartGame();
    requestAnimationFrame(gameLoop);
}

/**
 * Restart the game with fresh state
 */
function restartGame() {
    state = createInitialState(canvas.width, canvas.height);
    state.highScore = loadHighScore();
    state.lastTime = performance.now();
    previousCombo = 0;
    resetRenderCache();

    // Create stars
    for (let i = 0; i < 150; i++) {
        state.stars.push(createStar(canvas.width, canvas.height));
    }

    // Create cities
    const cityCount = 6;
    const cityWidth = 50;  // base width before scaling
    const spacing = canvas.width / (cityCount + 1);
    for (let i = 1; i <= cityCount; i++) {
        state.cities.push(createCity(i * spacing - (cityWidth * state.scale) / 2, cityWidth, canvas.height, state.scale));
    }

    // Reset UI
    domElements.gameOverEl.style.display = 'none';
    domElements.comboContainer.classList.add('combo-hidden');
}

// Expose restartGame globally for onclick handler
window.restartGame = restartGame;

/**
 * Main game loop
 */
function gameLoop(timestamp) {
    if (!state) {
        requestAnimationFrame(gameLoop);
        return;
    }

    const dt = timestamp - state.lastTime;
    state.lastTime = timestamp;

    // 1. Buffer -> State (process input)
    processInput(state);

    // 2. Pure logic (no I/O)
    if (!state.isGameOver) {
        updateSpawning(state, dt);
    }
    updateMovement(state);
    updateCollisions(state);

    // Track combo changes for UI pulse
    if (state.combo !== previousCombo && state.combo > 0) {
        pulseCombo(domElements.comboContainer);
    }
    previousCombo = state.combo;

    // 3. Sound buffer -> Audio
    flushSounds(state.soundBuffer, audio);
    state.soundBuffer = [];

    // 4. State -> Screen
    render(ctx, state, domElements);

    // Save high score if game just ended
    if (state.isGameOver && state.score > 0) {
        const currentSavedHighScore = loadHighScore();
        if (state.highScore > currentSavedHighScore) {
            saveHighScore(state.highScore);
        }
    }

    requestAnimationFrame(gameLoop);
}

// Start the game when the window loads
window.onload = init;
