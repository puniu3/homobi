/**
 * Game balance configuration
 * All gameplay-affecting values in one place for tuning
 */

export const CONFIG = {
  spawn: {
    baseInterval: 2000,
    minInterval: 500,
    levelScale: 300,
  },

  level: {
    timeWeight: 14000,
    scoreWeight: 4000,
  },

  missile: {
    normal: {
      baseSpeed: 1,
      levelBonus: 0.15,
      explosionRadius: 40,
      screenShake: 15,
    },
    fast: {
      baseSpeed: 18,
      speedVariance: 8,
      explosionRadius: 80,
      screenShake: 30,
    },
    hitMargin: 6, // added to explosion radius for hit detection
  },

  defense: {
    speed: 11,
    explosionRadius: 75,
    arrivalDistance: 12, // distance to target to trigger explosion
  },

  combo: {
    multiplierPerStack: 0.2,
    decayRateOnMiss: 0.5,
    decayRateOnGroundHit: 1.0,
    decayRateOnCityHit: 1.0,
    directHitBonus: {
      normal: 5,
      fast: 10,
    },
    multiKillBonus: 1,
  },

  scoring: {
    directHit: {
      normal: 50,
      fast: 200,
    },
    explosionHit: {
      base: 10,
      levelBonus: 0.1,
    },
    chainHit: 10, // non-player explosion hit
  },

  directHitRadius: 15,

  penalty: {
    missThreshold: 6, // misses before fast missile spawns
  },
};
