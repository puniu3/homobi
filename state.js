/**
 * Game state and entity factory functions
 * All entities are plain data objects, not class instances
 */

import { CONFIG } from './config.js';

const COLORS = [
    '#ff0055', '#00ffcc', '#ffcc00', '#ff00ff', '#0099ff', '#ffffff', '#ff6600'
];

/**
 * Create the initial game state
 */
export function createInitialState(canvasWidth, canvasHeight) {
    // Scale factor based on canvas height (reference: 750px)
    const scale = canvasHeight / CONFIG.baseHeight;

    return {
        // Game data
        score: 0,
        highScore: 0,
        level: 1,
        combo: 0,
        isGameOver: false,
        screenShake: 0,
        missedCount: 0,
        spawnTimer: 0,
        spawnInterval: CONFIG.spawn.baseInterval,
        levelTimer: 0,
        lastTime: 0,

        // Canvas dimensions (for spawning/positioning)
        canvasWidth,
        canvasHeight,
        scale,

        // Entity arrays (plain objects, not class instances)
        missiles: [],
        defenseMines: [],
        explosions: [],
        particles: [],
        cities: [],
        stars: [],

        // I/O Buffers
        inputBuffer: [],   // { type: 'launch', x, y }
        soundBuffer: [],   // { type: 'launch' | 'explosion' | 'cityHit', volume? }
    };
}

/**
 * Create a star entity
 */
export function createStar(canvasWidth, canvasHeight) {
    return {
        x: Math.random() * canvasWidth,
        y: Math.random() * (canvasHeight * 0.7),
        size: Math.random() * 1.5,
        blinkSpeed: 0.01 + Math.random() * 0.05,
        alpha: Math.random(),
    };
}

/**
 * Reset a star's position (for resize)
 */
export function resetStar(star, canvasWidth, canvasHeight) {
    star.x = Math.random() * canvasWidth;
    star.y = Math.random() * (canvasHeight * 0.7);
    star.size = Math.random() * 1.5;
    star.blinkSpeed = 0.01 + Math.random() * 0.05;
    star.alpha = Math.random();
}

/**
 * Create a city entity
 */
export function createCity(x, width, canvasHeight, scale = 1) {
    const height = (40 + Math.random() * 40) * scale;
    const scaledWidth = width * scale;
    const windows = [];
    for (let i = 0; i < 10; i++) {
        windows.push({
            ox: (5 + Math.random() * (width - 10)) * scale,
            oy: (5 + Math.random() * 30) * scale,  // relative to unscaled height range
            lit: Math.random() > 0.3
        });
    }
    return {
        x,
        width: scaledWidth,
        height,
        isAlive: true,
        color: '#1a1a2e',
        windows,
        canvasHeight, // needed for rendering
        scale, // store for window rendering
    };
}

/**
 * Create an enemy missile entity
 */
export function createEnemyMissile(state, isFast = false) {
    const { canvasWidth, canvasHeight, cities, level, scale } = state;
    const liveCities = cities.filter(c => c.isAlive);

    const startX = Math.random() * canvasWidth;
    const startY = -20 * scale;
    let targetX, targetY;

    if (isFast && liveCities.length > 0) {
        // Fast missile always targets a living city precisely
        const targetCity = liveCities[Math.floor(Math.random() * liveCities.length)];
        targetX = targetCity.x + targetCity.width / 2;
        targetY = canvasHeight - targetCity.height / 2;
    } else if (liveCities.length > 0 && Math.random() > 0.3) {
        const targetCity = liveCities[Math.floor(Math.random() * liveCities.length)];
        targetX = targetCity.x + targetCity.width / 2;
        targetY = canvasHeight;
    } else {
        targetX = Math.random() * canvasWidth;
        targetY = canvasHeight;
    }

    let vx, vy;
    if (isFast) {
        // Extremely fast straight line - ~0.4-0.6 seconds to cross screen
        const baseSpeed = (CONFIG.missile.fast.baseSpeed + Math.random() * CONFIG.missile.fast.speedVariance) * scale;
        const angle = Math.atan2(targetY - startY, targetX - startX);
        vx = Math.cos(angle) * baseSpeed;
        vy = Math.sin(angle) * baseSpeed;
    } else {
        const baseSpeed = (CONFIG.missile.normal.baseSpeed + (level * CONFIG.missile.normal.levelBonus)) * scale;
        const angle = Math.atan2(targetY - startY, targetX - startX);
        vx = Math.cos(angle) * baseSpeed;
        vy = Math.sin(angle) * baseSpeed;
    }

    return {
        x: startX,
        y: startY,
        vx,
        vy,
        startX,
        startY,
        targetX,
        targetY,
        active: true,
        isFast,
        flicker: 0,
    };
}

/**
 * Create a defense firework entity
 */
export function createDefenseFirework(state, targetX, targetY) {
    const { canvasWidth, canvasHeight, scale } = state;
    const startX = canvasWidth / 2;
    const startY = canvasHeight;

    const speed = CONFIG.defense.speed * scale;
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    return {
        x: startX,
        y: startY,
        vx,
        vy,
        startX,
        startY,
        targetX,
        targetY,
        active: true,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
}

/**
 * Create an explosion entity
 */
export function createExplosion(x, y, color, maxRadius, isPlayer) {
    return {
        x,
        y,
        color,
        radius: 0,
        maxRadius,
        active: true,
        growing: true,
        alpha: 0.4,
        isPlayer,
        hasHitEnemy: false,
    };
}

/**
 * Create a particle entity
 */
export function createParticle(x, y, color, speedScale = 1, size = 1.5, overrides = {}) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 5 + 2) * speedScale;

    return {
        x,
        y,
        color,
        vx: overrides.vx !== undefined ? overrides.vx : Math.cos(angle) * speed,
        vy: overrides.vy !== undefined ? overrides.vy : Math.sin(angle) * speed,
        alpha: 1,
        friction: overrides.friction !== undefined ? overrides.friction : 0.95,
        gravity: overrides.gravity !== undefined ? overrides.gravity : 0.08,
        size: size + Math.random(),
        active: true,
        decay: overrides.decay !== undefined ? overrides.decay : 0.01 + Math.random() * 0.02,
    };
}

/**
 * Create particles for a firework burst
 */
export function createFireworkBurst(particles, x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(createParticle(x, y, color, 1.0));
    }
}

/**
 * Create special direct hit effect particles
 */
export function createDirectHitEffect(particles, x, y) {
    // Golden starburst pattern
    const colors = ['#ffcc00', '#ffffff', '#ff9900', '#ffff00'];
    for (let i = 0; i < 60; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(createParticle(x, y, color, 2.5, 3.0));
    }
    // Ring of sparks
    for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        particles.push(createParticle(x, y, '#ffffff', 0.1, 2.0, {
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8,
            gravity: 0,
            friction: 0.92,
            decay: 0.025,
        }));
    }
    // Central flash particles
    for (let i = 0; i < 15; i++) {
        particles.push(createParticle(x, y, '#ffffff', 0.5, 5.0, {
            decay: 0.05,
            gravity: 0,
        }));
    }
}

export { COLORS };
