/**
 * Game balance configuration
 * All gameplay-affecting values in one place for tuning
 */

const STORAGE_KEY = 'celestialGuardian_config';

/**
 * Default configuration values (immutable reference for reset)
 */
export const DEFAULT_CONFIG = {
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

/**
 * Deep clone an object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep merge source into target
 */
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

/**
 * Load saved config from LocalStorage
 */
function loadSavedConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not load saved config:', e);
  }
  return null;
}

/**
 * Active configuration (starts with defaults, merged with saved values)
 */
export const CONFIG = deepClone(DEFAULT_CONFIG);

// Initialize CONFIG from LocalStorage on load
const savedConfig = loadSavedConfig();
if (savedConfig) {
  deepMerge(CONFIG, savedConfig);
}

/**
 * Save current CONFIG to LocalStorage
 */
export function saveConfig(configObj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configObj));
    deepMerge(CONFIG, configObj);
  } catch (e) {
    console.warn('Could not save config:', e);
  }
}

/**
 * Get storage key (for external use)
 */
export function getStorageKey() {
  return STORAGE_KEY;
}
