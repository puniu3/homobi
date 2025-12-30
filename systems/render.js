/**
 * Render System
 * Handles all canvas drawing and DOM updates
 */

import { CONFIG } from '../config.js';

// Pre-computed constants for performance
const TWO_PI = Math.PI * 2;

// DOM update cache to avoid unnecessary updates
let lastScore = -1;
let lastLevel = -1;
let lastCombo = -1;

/**
 * Reset render cache (call on game restart)
 */
export function resetRenderCache() {
    lastScore = -1;
    lastLevel = -1;
    lastCombo = -1;
}

/**
 * Draw a star
 */
function drawStar(ctx, star) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, star.alpha)})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, TWO_PI);
    ctx.fill();
}

/**
 * Draw a city
 */
function drawCity(ctx, city, canvasHeight) {
    if (!city.isAlive) {
        ctx.fillStyle = '#111';
        ctx.fillRect(city.x, canvasHeight - 10, city.width, 10);
        return;
    }
    ctx.fillStyle = city.color;
    ctx.fillRect(city.x, canvasHeight - city.height, city.width, city.height);
    city.windows.forEach(w => {
        if (w.lit) {
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(city.x + w.ox, canvasHeight - city.height + w.oy, 3, 3);
        }
    });
}

/**
 * Draw an enemy missile
 */
function drawMissile(ctx, missile) {
    ctx.save();

    if (missile.isFast) {
        // Fast missile: purple/magenta with intense pulsing glow
        const glowSize = 20 + Math.sin(missile.flicker) * 10;
        const grad = ctx.createRadialGradient(
            missile.x, missile.y, 0,
            missile.x, missile.y, glowSize
        );
        grad.addColorStop(0, 'rgba(255, 0, 255, 1.0)');
        grad.addColorStop(0.3, 'rgba(255, 100, 255, 0.7)');
        grad.addColorStop(0.6, 'rgba(200, 0, 255, 0.4)');
        grad.addColorStop(1, 'rgba(255, 0, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(missile.x, missile.y, glowSize, 0, TWO_PI);
        ctx.fill();

        // Inner bright core
        ctx.fillStyle = '#ff88ff';
        ctx.beginPath();
        ctx.arc(missile.x, missile.y, 6, 0, TWO_PI);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(missile.x, missile.y, 3, 0, TWO_PI);
        ctx.fill();
    } else {
        // Normal missile: orange glow
        const glowSize = 10 + Math.sin(missile.flicker) * 5;
        const grad = ctx.createRadialGradient(
            missile.x, missile.y, 0,
            missile.x, missile.y, glowSize
        );
        grad.addColorStop(0, 'rgba(255, 68, 0, 0.8)');
        grad.addColorStop(1, 'rgba(255, 68, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(missile.x, missile.y, glowSize, 0, TWO_PI);
        ctx.fill();
        ctx.fillStyle = '#ff9900';
        ctx.beginPath();
        ctx.arc(missile.x, missile.y, 4, 0, TWO_PI);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(missile.x, missile.y, 2, 0, TWO_PI);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Draw a defense firework
 */
function drawDefenseMine(ctx, mine) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mine.x, mine.y, 3, 0, TWO_PI);
    ctx.fill();
}

/**
 * Draw an explosion
 * Note: globalAlpha reset is handled in render() after all alpha-based drawing
 */
function drawExplosion(ctx, explosion) {
    // Prevent drawing with invalid radius (negative radius causes DOMException)
    if (explosion.radius <= 0 || explosion.alpha <= 0) return;

    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius, 0, TWO_PI);
    ctx.strokeStyle = explosion.color;
    ctx.globalAlpha = explosion.alpha;
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * Draw a particle
 * Uses fillRect for small particles (size <= 2) for better performance
 */
function drawParticle(ctx, particle) {
    // Prevent drawing with invalid alpha
    if (particle.alpha <= 0) return;

    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = Math.random() > 0.9 ? '#fff' : particle.color;

    if (particle.size <= 2) {
        // Small particles: use faster fillRect
        const size = particle.size * 2;
        ctx.fillRect(particle.x - particle.size, particle.y - particle.size, size, size);
    } else {
        // Larger particles: use arc for smooth circles
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, TWO_PI);
        ctx.fill();
    }
}

/**
 * Update combo UI display (only when changed)
 */
function updateComboUI(state, comboContainer, comboValEl, multValEl) {
    if (state.combo !== lastCombo) {
        lastCombo = state.combo;
        if (state.combo > 0) {
            comboContainer.classList.remove('combo-hidden');
            comboValEl.innerText = state.combo;
            multValEl.innerText = (1 + state.combo * CONFIG.combo.multiplierPerStack).toFixed(1);
        } else {
            comboContainer.classList.add('combo-hidden');
        }
    }
}

/**
 * Render the entire game state
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} state - Game state
 * @param {Object} domElements - DOM element references
 */
export function render(ctx, state, domElements) {
    const { scoreEl, levelEl, comboContainer, comboValEl, multValEl, gameOverEl, finalScoreEl, highscoreEl, newHighscoreEl } = domElements;

    // Clear screen
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

    // Apply screen shake
    if (state.screenShake > 0) {
        const sx = (Math.random() - 0.5) * state.screenShake;
        const sy = (Math.random() - 0.5) * state.screenShake;
        ctx.setTransform(1, 0, 0, 1, sx, sy);
        state.screenShake *= 0.9;
        if (state.screenShake < 0.5) {
            state.screenShake = 0;
        }
    }

    // Draw stars
    for (const star of state.stars) {
        drawStar(ctx, star);
    }

    // Draw cities
    for (const city of state.cities) {
        drawCity(ctx, city, state.canvasHeight);
    }

    // Draw missiles
    for (const missile of state.missiles) {
        if (missile.active) {
            drawMissile(ctx, missile);
        }
    }

    // Draw defense mines
    for (const mine of state.defenseMines) {
        if (mine.active) {
            drawDefenseMine(ctx, mine);
        }
    }

    // Draw explosions
    for (const explosion of state.explosions) {
        if (explosion.active) {
            drawExplosion(ctx, explosion);
        }
    }

    // Draw particles
    for (const particle of state.particles) {
        if (particle.active) {
            drawParticle(ctx, particle);
        }
    }

    // Reset globalAlpha after all alpha-based drawing (explosions & particles)
    ctx.globalAlpha = 1.0;

    // Reset transform
    ctx.resetTransform();

    // Update DOM (only when values change)
    if (state.score !== lastScore) {
        lastScore = state.score;
        scoreEl.innerText = state.score;
    }
    if (state.level !== lastLevel) {
        lastLevel = state.level;
        levelEl.innerText = state.level;
    }
    updateComboUI(state, comboContainer, comboValEl, multValEl);

    // Handle game over display
    if (state.isGameOver && gameOverEl.style.display !== 'block') {
        finalScoreEl.innerText = state.score;

        // Check for new high score
        const isNewHighScore = state.score > state.highScore;
        if (isNewHighScore) {
            state.highScore = state.score;
            // Save high score (done in main.js)
        }

        highscoreEl.innerText = state.highScore;
        newHighscoreEl.style.display = isNewHighScore ? 'block' : 'none';
        gameOverEl.style.display = 'block';
    }
}

/**
 * Trigger combo pulse animation
 */
export function pulseCombo(comboContainer) {
    comboContainer.classList.add('combo-pulse');
    setTimeout(() => comboContainer.classList.remove('combo-pulse'), 200);
}
