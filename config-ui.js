/**
 * Config UI Module
 * Modal-based configuration interface for game balance parameters
 */

import { CONFIG, DEFAULT_CONFIG, saveConfig } from './config.js';

/**
 * Slider parameter definitions with ranges
 */
const SLIDER_PARAMS = [
  { category: 'spawn', key: 'baseInterval', label: 'Base Interval', min: 500, max: 5000, step: 100 },
  { category: 'spawn', key: 'minInterval', label: 'Min Interval', min: 100, max: 2000, step: 50 },
  { category: 'spawn', key: 'levelScale', label: 'Level Scale', min: 100, max: 1000, step: 50 },

  { category: 'level', key: 'timeWeight', label: 'Time Weight', min: 5000, max: 30000, step: 1000 },
  { category: 'level', key: 'scoreWeight', label: 'Score Weight', min: 1000, max: 10000, step: 500 },

  { category: 'missile.normal', key: 'baseSpeed', label: 'Base Speed', min: 0.5, max: 5, step: 0.1 },
  { category: 'missile.normal', key: 'levelBonus', label: 'Level Bonus', min: 0, max: 0.5, step: 0.01 },
  { category: 'missile.normal', key: 'explosionRadius', label: 'Explosion Radius', min: 20, max: 100, step: 5 },
  { category: 'missile.normal', key: 'screenShake', label: 'Screen Shake', min: 0, max: 50, step: 1 },

  { category: 'missile.fast', key: 'baseSpeed', label: 'Base Speed', min: 10, max: 30, step: 1 },
  { category: 'missile.fast', key: 'speedVariance', label: 'Speed Variance', min: 0, max: 20, step: 1 },
  { category: 'missile.fast', key: 'explosionRadius', label: 'Explosion Radius', min: 40, max: 150, step: 5 },
  { category: 'missile.fast', key: 'screenShake', label: 'Screen Shake', min: 0, max: 80, step: 5 },

  { category: 'missile', key: 'hitMargin', label: 'Hit Margin', min: 0, max: 20, step: 1 },

  { category: 'defense', key: 'speed', label: 'Speed', min: 5, max: 20, step: 1 },
  { category: 'defense', key: 'explosionRadius', label: 'Explosion Radius', min: 30, max: 150, step: 5 },
  { category: 'defense', key: 'arrivalDistance', label: 'Arrival Distance', min: 5, max: 30, step: 1 },

  { category: 'combo', key: 'multiplierPerStack', label: 'Multiplier Per Stack', min: 0.1, max: 1.0, step: 0.05 },
  { category: 'combo', key: 'decayRateOnMiss', label: 'Decay Rate On Miss', min: 0, max: 1.0, step: 0.1 },
  { category: 'combo', key: 'decayRateOnGroundHit', label: 'Decay Rate On Ground Hit', min: 0, max: 1.0, step: 0.1 },
  { category: 'combo', key: 'decayRateOnCityHit', label: 'Decay Rate On City Hit', min: 0, max: 1.0, step: 0.1 },

  { category: 'combo.directHitBonus', key: 'normal', label: 'Normal', min: 1, max: 20, step: 1 },
  { category: 'combo.directHitBonus', key: 'fast', label: 'Fast', min: 1, max: 30, step: 1 },

  { category: 'combo', key: 'multiKillBonus', label: 'Multi Kill Bonus', min: 0, max: 5, step: 1 },

  { category: 'scoring.directHit', key: 'normal', label: 'Normal', min: 10, max: 200, step: 10 },
  { category: 'scoring.directHit', key: 'fast', label: 'Fast', min: 50, max: 500, step: 25 },

  { category: 'scoring.explosionHit', key: 'base', label: 'Base', min: 1, max: 50, step: 1 },
  { category: 'scoring.explosionHit', key: 'levelBonus', label: 'Level Bonus', min: 0, max: 0.5, step: 0.05 },

  { category: 'scoring', key: 'chainHit', label: 'Chain Hit', min: 1, max: 50, step: 1 },

  { category: '(root)', key: 'directHitRadius', label: 'Direct Hit Radius', min: 5, max: 40, step: 1 },

  { category: 'penalty', key: 'missThreshold', label: 'Miss Threshold', min: 1, max: 20, step: 1 },
];

/**
 * Get a nested value from an object using dot notation path
 */
function getNestedValue(obj, category, key) {
  if (category === '(root)') {
    return obj[key];
  }

  const parts = category.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current ? current[key] : undefined;
}

/**
 * Set a nested value in an object using dot notation path
 */
function setNestedValue(obj, category, key, value) {
  if (category === '(root)') {
    obj[key] = value;
    return;
  }

  const parts = category.split('.');
  let current = obj;
  for (const part of parts) {
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }
  current[key] = value;
}

/**
 * Format category name for display
 */
function formatCategoryName(category) {
  if (category === '(root)') return 'General';
  return category
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' > ');
}

/**
 * Generate slider HTML for a parameter
 */
function createSliderHTML(param, value) {
  const id = `slider-${param.category}-${param.key}`.replace(/[.\(\)]/g, '-');
  return `
    <div class="config-slider-row" data-category="${param.category}" data-key="${param.key}">
      <label class="config-slider-label" for="${id}">${param.label}</label>
      <div class="config-slider-control">
        <input type="range"
               id="${id}"
               class="config-slider"
               min="${param.min}"
               max="${param.max}"
               step="${param.step}"
               value="${value}">
        <span class="config-slider-value">${value}</span>
      </div>
    </div>
  `;
}

/**
 * Build the modal HTML with all sliders
 */
function buildModalHTML() {
  // Group parameters by category
  const grouped = {};
  for (const param of SLIDER_PARAMS) {
    if (!grouped[param.category]) {
      grouped[param.category] = [];
    }
    grouped[param.category].push(param);
  }

  let slidersHTML = '';
  for (const category of Object.keys(grouped)) {
    slidersHTML += `<div class="config-category">
      <h3 class="config-category-title">${formatCategoryName(category)}</h3>`;

    for (const param of grouped[category]) {
      const value = getNestedValue(CONFIG, param.category, param.key);
      slidersHTML += createSliderHTML(param, value);
    }

    slidersHTML += '</div>';
  }

  return `
    <div id="config-modal" class="config-modal">
      <div class="config-modal-content">
        <h2 class="config-modal-title">Game Configuration</h2>
        <div class="config-sliders-container">
          ${slidersHTML}
        </div>
        <div class="config-buttons">
          <button id="config-save" class="btn config-btn config-btn-save">Save & Exit</button>
          <button id="config-reset" class="btn config-btn config-btn-reset">Reset</button>
          <button id="config-export" class="btn config-btn config-btn-export">Export</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Get current values from all sliders
 */
function getSliderValues() {
  const values = {};
  const sliderRows = document.querySelectorAll('.config-slider-row');

  for (const row of sliderRows) {
    const category = row.dataset.category;
    const key = row.dataset.key;
    const slider = row.querySelector('.config-slider');
    const value = parseFloat(slider.value);

    setNestedValue(values, category, key, value);
  }

  return values;
}

/**
 * Update slider values from a config object
 */
function updateSlidersFromConfig(configObj) {
  for (const param of SLIDER_PARAMS) {
    const id = `slider-${param.category}-${param.key}`.replace(/[.\(\)]/g, '-');
    const slider = document.getElementById(id);
    if (slider) {
      const value = getNestedValue(configObj, param.category, param.key);
      if (value !== undefined) {
        slider.value = value;
        const valueDisplay = slider.parentElement.querySelector('.config-slider-value');
        if (valueDisplay) {
          valueDisplay.textContent = value;
        }
      }
    }
  }
}

/**
 * Initialize the config UI
 */
export function initConfigUI() {
  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = buildModalHTML();
  document.body.appendChild(modalContainer.firstElementChild);

  const modal = document.getElementById('config-modal');
  const configBtn = document.getElementById('config-btn');
  const saveBtn = document.getElementById('config-save');
  const resetBtn = document.getElementById('config-reset');
  const exportBtn = document.getElementById('config-export');

  // Slider real-time value update
  modal.addEventListener('input', (e) => {
    if (e.target.classList.contains('config-slider')) {
      const valueDisplay = e.target.parentElement.querySelector('.config-slider-value');
      if (valueDisplay) {
        valueDisplay.textContent = e.target.value;
      }
    }
  });

  // Open modal
  if (configBtn) {
    configBtn.addEventListener('click', () => {
      updateSlidersFromConfig(CONFIG);
      modal.style.display = 'flex';
    });
  }

  // Save & Exit
  saveBtn.addEventListener('click', () => {
    const values = getSliderValues();
    saveConfig(values);
    modal.style.display = 'none';
  });

  // Reset to defaults
  resetBtn.addEventListener('click', () => {
    updateSlidersFromConfig(DEFAULT_CONFIG);
  });

  // Export to clipboard
  exportBtn.addEventListener('click', async () => {
    const values = getSliderValues();
    const json = JSON.stringify(values, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      exportBtn.textContent = 'Copied!';
      setTimeout(() => {
        exportBtn.textContent = 'Export';
      }, 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
      alert('Failed to copy to clipboard. Check console for details.');
    }
  });

  // Close modal on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * Open the config modal (for external use)
 */
export function openConfigModal() {
  const modal = document.getElementById('config-modal');
  if (modal) {
    updateSlidersFromConfig(CONFIG);
    modal.style.display = 'flex';
  }
}

/**
 * Close the config modal (for external use)
 */
export function closeConfigModal() {
  const modal = document.getElementById('config-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}
