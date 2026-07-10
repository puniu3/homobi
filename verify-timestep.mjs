/**
 * verify-timestep.mjs — zero-dependency proof that the 120Hz fixed-timestep
 * conversion (item B120) is (a) frame-rate independent and (b) feels identical
 * to the old 60fps-per-frame integration.
 *
 * Run:  node verify-timestep.mjs   (exits 0 on PASS, 1 on FAIL)
 *
 * We import the PURE systems + state.js (never main.js, which needs canvas/
 * audio) and replicate main.js's accumulator locally in run().
 *
 * Note on floating point: STEP = 1000/120 is not exactly representable in
 * IEEE-754. For power-of-two-multiple frame sizes (1x, 2x, 4x STEP) the
 * accumulator returns to ~0 each frame, so raw positions are bit-identical.
 * For a non-aligned size (e.g. 3x STEP) rounding can leave the un-integrated
 * sub-step remainder in state.accumulator — the raw snapshot then differs by
 * at most ONE sub-step. That remainder is NOT lost (the live game carries it
 * forward every rAF), so the principled frame-rate-independence invariant is
 * the renderAlpha-interpolated position `pos + (accumulator/STEP)*velocity`
 * (exactly the interpolation the reference loop exposes as renderAlpha). We
 * assert that invariant across all chunkings, and additionally assert bit-exact
 * raw equality for the aligned ones.
 */

// config.js reads localStorage at import time — stub it BEFORE importing.
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };

const { updateMovement } = await import('./systems/movement.js');
await import('./state.js'); // exercised transitively; imported to prove it loads clean

// ---- Mirror main.js's fixed-timestep constants exactly ----
const STEP = 1000 / 120;   // ms per sim step (~8.333)
const MAX_FRAME_DT = 250;  // clamp huge frames
const MAX_STEPS = 10;      // spiral-of-death guard

const OLD_FRAME_MS = 2 * STEP; // the old loop ran updateMovement once per ~60fps frame (= 2*STEP)

/** Minimal state object sufficient for updateMovement (scale=1). */
function makeState() {
    return {
        scale: 1,
        canvasWidth: 2400,
        canvasHeight: 1e9,
        accumulator: 0,
        screenShake: 0,
        missiles: [],
        defenseMines: [],
        explosions: [],
        particles: [],
        stars: [],
        cities: [],
    };
}

/** Inject a deterministic normal missile with a known velocity. Returns the object. */
function injectMissile(state, x, y, vx, vy) {
    const m = {
        x, y, vx, vy,
        startX: x, startY: y, targetX: x, targetY: y,
        active: true, isFast: false, flicker: 0,
    };
    state.missiles.push(m);
    return m;
}

/**
 * Replicate main.js's loop over an exact `nFrames` frames, each `frameMs` long,
 * mirroring STEP / MAX_FRAME_DT / MAX_STEPS / accumulator-clamp. Only the sim
 * step (updateMovement) is exercised — the property under test is the
 * movement/accumulator math. Returns total sim steps executed.
 */
function run(state, nFrames, frameMs) {
    let totalSteps = 0;
    for (let f = 0; f < nFrames; f++) {
        state.accumulator += Math.min(frameMs, MAX_FRAME_DT);
        let steps = 0;
        while (state.accumulator >= STEP && steps < MAX_STEPS) {
            updateMovement(state);
            state.accumulator -= STEP;
            steps++;
        }
        if (steps >= MAX_STEPS) state.accumulator = 0;
        totalSteps += steps;
    }
    return totalSteps;
}

const EPS = 1e-6;
let failed = false;
function assert(cond, label, detail) {
    const tag = cond ? 'PASS' : 'FAIL';
    if (!cond) failed = true;
    console.log(`[${tag}] ${label}${detail ? '  — ' + detail : ''}`);
}

// ===========================================================================
// (a) Frame-rate independence: same total real-time (240*STEP ≈ 2000ms),
//     four different frame chunkings, identical position. All chunk sizes are
//     within the non-clamping regime. `ex/ey` = renderAlpha-interpolated
//     position (raw pos + pending sub-step), the frame-rate-independent value.
// ===========================================================================
const SIM_STEPS = 240;     // 240*STEP ≈ 2000ms of real time
const VX = 1.5, VY = 1.0;  // (halved) per-step velocities; arbitrary, deterministic

function runMissile(nFrames, frameMs) {
    const s = makeState();
    const m = injectMissile(s, 100, 200, VX, VY);
    const steps = run(s, nFrames, frameMs);
    const alpha = s.accumulator / STEP; // pending fraction of a sim step
    return { x: m.x, y: m.y, ex: m.x + alpha * VX, ey: m.y + alpha * VY, steps };
}

const r120 = runMissile(240, 1 * STEP); // 120fps: 1 step/frame  (aligned)
const r60 = runMissile(120, 2 * STEP);  // 60fps:  2 steps/frame (aligned)
const r30 = runMissile(60, 4 * STEP);   // 30fps:  4 steps/frame (aligned)
const r40 = runMissile(80, 3 * STEP);   // 40fps:  3 steps/frame (NON-aligned)

console.log(`   steps: 120fps=${r120.steps} 60fps=${r60.steps} 30fps=${r30.steps} 40fps=${r40.steps} (aligned=${SIM_STEPS}; 40fps ±1 sub-step is carried remainder)`);

// Principled invariant: renderAlpha-interpolated position identical for ALL chunkings.
const refEx = r120.ex, refEy = r120.ey;
for (const [name, r] of [['60fps', r60], ['30fps', r30], ['40fps', r40]]) {
    assert(Math.abs(r.ex - refEx) < EPS && Math.abs(r.ey - refEy) < EPS,
        `(a) interpolated position 120fps == ${name}`,
        `d=(${(r.ex - refEx).toExponential(2)}, ${(r.ey - refEy).toExponential(2)})`);
}
// Bonus strict check on the two rates in the actual bug report (60Hz vs 120Hz):
// STEP and 2*STEP frames are float-clean, so raw positions are BIT-identical and
// both execute exactly 240 steps — i.e. no 2x speed-up on a 120Hz display.
assert(r120.x === r60.x && r120.y === r60.y && r120.steps === SIM_STEPS && r60.steps === SIM_STEPS,
    '(a) 60Hz vs 120Hz: bit-identical raw position, exactly 240 steps each',
    `120fps=${r120.steps} steps, 60fps=${r60.steps} steps`);

// ===========================================================================
// (b) 60fps-feel equivalence: total displacement under the 120Hz-halved sim
//     equals the OLD 60fps-per-frame integration with the ORIGINAL (un-halved)
//     velocity. Proves the HALVING is correct, not merely self-consistent.
// ===========================================================================
const VX_OLD = 3.0, VY_OLD = 2.0;               // original per-frame velocity (60fps)
const VX_NEW = VX_OLD / 2, VY_NEW = VY_OLD / 2; // what config-halving produces
const OLD_FRAMES = 120;                          // old loop: 120 frames over ~2000ms

const sb = makeState();
const mb = injectMissile(sb, 0, 0, VX_NEW, VY_NEW);
run(sb, OLD_FRAMES, OLD_FRAME_MS); // 120 frames * 2 steps = 240 halved steps
const simDx = mb.x, simDy = mb.y;

// Old 60fps loop over the same real time: OLD_FRAMES frames, each moving VX_OLD.
const expectedDx = VX_OLD * OLD_FRAMES;
const expectedDy = VY_OLD * OLD_FRAMES;

console.log(`   simΔ=(${simDx.toFixed(6)}, ${simDy.toFixed(6)})  oldΔ=(${expectedDx.toFixed(6)}, ${expectedDy.toFixed(6)})`);
assert(Math.abs(simDx - expectedDx) < EPS, '(b) Δx matches old-60fps displacement',
    `|${(simDx - expectedDx).toExponential(2)}|`);
assert(Math.abs(simDy - expectedDy) < EPS, '(b) Δy matches old-60fps displacement',
    `|${(simDy - expectedDy).toExponential(2)}|`);

// ---------------------------------------------------------------------------
// Bonus: the spiral-of-death guard. A 500ms frame exceeds MAX_FRAME_DT (250ms)
// and requests 30 steps (capped at MAX_STEPS=10), so it SHEDS simulation time
// by design — it must NOT reproduce the full-detail position (that is the guard
// working, not a bug). We assert it is clamped (fewer steps), not equal.
// (This is why the literal "500ms chunk == small chunks" is impossible with
// MAX_FRAME_DT=250 — a 500ms frame can accumulate at most 250ms; documented.)
// ---------------------------------------------------------------------------
const guard = runMissile(4, 60 * STEP); // 4 frames of ~500ms delivering ~2000ms real time
assert(guard.steps < SIM_STEPS,
    'guard: 500ms frames are clamped (spiral protection sheds time by design)',
    `steps=${guard.steps} (< ${SIM_STEPS}); clamped to MAX_STEPS/frame`);

console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
process.exit(failed ? 1 : 0);
