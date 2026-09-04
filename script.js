/**
 * Peptide Calculator - Core Mathematical Engine & UI Controller
 * Pure Vanilla JavaScript (ES6+) - Zero dependencies, zero tracking, 100% client-side
 */

// Strict measurement conversion factors normalized to base units (mg for mass, mL for volume)
const MASS_TO_MG = {
  g: 1000,
  mg: 1,
  mcg: 0.001
};

const VOLUME_TO_ML = {
  L: 1000,
  mL: 1
};

/**
 * Clean floating point arithmetic formatting
 * Displays numbers legibly without scientific notation or unnecessary trailing zeros
 */
function formatPrecision(num, maxDecimals = 4) {
  if (!Number.isFinite(num)) return '—';
  
  // Format very small positive numbers clearly
  if (Math.abs(num) < 0.0001 && num !== 0) {
    return num.toExponential(4);
  }
  
  // Check if it's effectively an integer
  if (Math.abs(num - Math.round(num)) < 1e-9) {
    return Math.round(num).toLocaleString('en-US');
  }

  // Format with sensible precision
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(num * factor) / factor;
  return rounded.toLocaleString('en-US', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0
  });
}

/**
 * Validate that a value is a finite number greater than zero
 */
function isValidPositive(val) {
  return typeof val === 'number' && Number.isFinite(val) && val > 0;
}

/**
 * Safely parse a numeric input value from element ID
 */
function parseInputValue(id) {
  const el = document.getElementById(id);
  if (!el) return NaN;
  const raw = el.value.trim();
  if (raw === '') return NaN;
  const num = parseFloat(raw);
  return num;
}

/**
 * Set contextual inline error message and visual state
 */
function setFieldError(fieldId, errorElementId, message) {
  const inputEl = document.getElementById(fieldId);
  const errEl = document.getElementById(errorElementId);
  
  if (inputEl) {
    const combo = inputEl.closest('.input-combo');
    if (combo) {
      if (message) {
        combo.classList.add('has-error');
      } else {
        combo.classList.remove('has-error');
      }
    }
  }
  
  if (errEl) {
    if (message) {
      errEl.textContent = message;
      errEl.classList.add('visible');
    } else {
      errEl.textContent = '';
      errEl.classList.remove('visible');
    }
  }
}

/**
 * Update the interactive SVG/CSS syringe visualizer
 */
function updateSyringeGraphic(requiredVolumeMl, syringeType, syringeCapacity) {
  const fluidEl = document.getElementById('syringe-fluid');
  const badgeEl = document.getElementById('syringe-fill-badge');
  const unitLabelEl = document.getElementById('syringe-units-output');
  const warningEl = document.getElementById('syringe-warning');
  
  if (!fluidEl) return;

  // Determine barrel capacity in mL
  let capMl = 1.0;
  let isUnitsSyringe = false;
  let unitFactor = 100; // U-100 default

  if (syringeType === 'u100-1ml') {
    capMl = 1.0;
    isUnitsSyringe = true;
    unitFactor = 100;
  } else if (syringeType === 'u100-05ml') {
    capMl = 0.5;
    isUnitsSyringe = true;
    unitFactor = 100;
  } else if (syringeType === 'u100-03ml') {
    capMl = 0.3;
    isUnitsSyringe = true;
    unitFactor = 100;
  } else if (syringeType === 'u40-1ml') {
    capMl = 1.0;
    isUnitsSyringe = true;
    unitFactor = 40;
  } else if (syringeType === 'ml-3ml') {
    capMl = 3.0;
  } else if (syringeCapacity && syringeCapacity > 0) {
    capMl = syringeCapacity;
  }

  // Calculate percentage of barrel
  const percent = Math.min(100, Math.max(0, (requiredVolumeMl / capMl) * 100));
  fluidEl.style.width = `${percent}%`;

  // Calculate syringe markings / units
  let unitDisplay = '';
  if (isUnitsSyringe) {
    const units = requiredVolumeMl * unitFactor;
    unitDisplay = `${formatPrecision(units, 1)} Units (IU)`;
  } else {
    unitDisplay = `${formatPrecision(requiredVolumeMl, 3)} mL`;
  }

  if (badgeEl) {
    badgeEl.textContent = unitDisplay;
  }

  if (unitLabelEl) {
    unitLabelEl.textContent = unitDisplay;
  }

  // Warning if required volume exceeds syringe capacity
  if (warningEl) {
    if (requiredVolumeMl > capMl) {
      warningEl.textContent = `Warning: Calculated volume (${formatPrecision(requiredVolumeMl, 2)} mL) exceeds the capacity of this ${capMl} mL syringe.`;
      warningEl.style.display = 'block';
    } else {
      warningEl.style.display = 'none';
    }
  }
}

/**
 * Handle Main Peptide Calculator Submission
 */
function handleMainCalculator(e) {
  e.preventDefault();

  // Clear previous errors
  setFieldError('peptide-amount', 'err-peptide-amount', '');
  setFieldError('liquid-volume', 'err-liquid-volume', '');
  setFieldError('desired-dose', 'err-desired-dose', '');

  const globalAlert = document.getElementById('form-error-alert');
  if (globalAlert) {
    globalAlert.style.display = 'none';
    globalAlert.textContent = '';
  }

  // Extract raw values
  const peptideAmount = parseInputValue('peptide-amount');
  const peptideUnit = document.getElementById('peptide-unit')?.value || 'mg';
  
  const liquidVolume = parseInputValue('liquid-volume');
  const liquidUnit = document.getElementById('liquid-unit')?.value || 'mL';

  const desiredDose = parseInputValue('desired-dose');
  const doseUnit = document.getElementById('dose-unit')?.value || 'mcg';

  const syringeType = document.getElementById('syringe-type')?.value || 'u100-1ml';

  // Validation
  let hasError = false;

  if (!isValidPositive(peptideAmount)) {
    setFieldError('peptide-amount', 'err-peptide-amount', 'Please enter a valid peptide amount greater than zero.');
    hasError = true;
  }

  if (!isValidPositive(liquidVolume)) {
    setFieldError('liquid-volume', 'err-liquid-volume', 'Liquid volume must be greater than zero.');
    hasError = true;
  }

  if (!isValidPositive(desiredDose)) {
    setFieldError('desired-dose', 'err-desired-dose', 'Please enter a valid dose greater than zero.');
    hasError = true;
  }

  if (hasError) {
    if (globalAlert) {
      globalAlert.textContent = 'Please correct the highlighted fields above before calculating.';
      globalAlert.style.display = 'flex';
    }
    return;
  }

  // Conversion to base units: mass in mg, volume in mL
  const amountMg = peptideAmount * MASS_TO_MG[peptideUnit];
  const volumeMl = liquidVolume * VOLUME_TO_ML[liquidUnit];
  const doseMg = desiredDose * MASS_TO_MG[doseUnit];

  // Mathematical Calculations
  // Concentration = Amount / Volume
  const concentrationMgPerMl = amountMg / volumeMl;
  const concentrationMcgPerMl = concentrationMgPerMl * 1000;
  const concentrationPercent = (concentrationMgPerMl / 10); // 10 mg/mL = 1% w/v

  // Required Volume = Desired Dose / Concentration
  const requiredVolumeMl = doseMg / concentrationMgPerMl;

  // Syringe Units
  let syringeUnits = requiredVolumeMl * 100; // standard U-100
  let syringeUnitName = 'Units on U-100';
  if (syringeType === 'u40-1ml') {
    syringeUnits = requiredVolumeMl * 40;
    syringeUnitName = 'Units on U-40';
  } else if (syringeType === 'u100-05ml' || syringeType === 'u100-03ml') {
    syringeUnits = requiredVolumeMl * 100;
    syringeUnitName = 'Units (0.01 mL/tick)';
  } else if (syringeType === 'ml-3ml') {
    syringeUnits = requiredVolumeMl;
    syringeUnitName = 'Volume (mL)';
  }

  // Display in UI
  const resultsCard = document.getElementById('results-card');
  if (resultsCard) {
    resultsCard.hidden = false;
  }

  const resMg = document.getElementById('res-conc-mg');
  const resMcg = document.getElementById('res-conc-mcg');
  const resDose = document.getElementById('res-entered-dose');
  const resVolume = document.getElementById('res-required-volume');
  const resSyringe = document.getElementById('res-syringe-units');
  const resSummary = document.getElementById('res-summary-text');

  if (resMg) resMg.textContent = `${formatPrecision(concentrationMgPerMl, 3)} mg/mL`;
  if (resMcg) resMcg.textContent = `${formatPrecision(concentrationMcgPerMl, 1)} mcg/mL`;
  if (resDose) resDose.textContent = `${formatPrecision(desiredDose)} ${doseUnit}`;
  if (resVolume) resVolume.textContent = `${formatPrecision(requiredVolumeMl, 3)} mL`;
  if (resSyringe) resSyringe.textContent = `${formatPrecision(syringeUnits, 1)} ${syringeUnitName}`;

  // Calculation Summary
  if (resSummary) {
    resSummary.innerHTML = `
      <strong>Summary:</strong> Dissolving <strong>${formatPrecision(peptideAmount)} ${peptideUnit}</strong> in <strong>${formatPrecision(liquidVolume)} ${liquidUnit}</strong> yields a concentration of <strong>${formatPrecision(concentrationMgPerMl, 3)} mg/mL</strong> (<strong>${formatPrecision(concentrationMcgPerMl, 1)} mcg/mL</strong>). For a user-entered dose of <strong>${formatPrecision(desiredDose)} ${doseUnit}</strong>, the mathematical required volume is <strong>${formatPrecision(requiredVolumeMl, 4)} mL</strong> (${formatPrecision(syringeUnits, 1)} ${syringeUnitName}).
    `;
  }

  // Update Syringe Graphic
  updateSyringeGraphic(requiredVolumeMl, syringeType);

  // Update Step-by-Step Math Trace
  const traceStep1 = document.getElementById('trace-step-1');
  const traceStep2 = document.getElementById('trace-step-2');
  const traceStep3 = document.getElementById('trace-step-3');

  if (traceStep1) {
    traceStep1.innerHTML = `<strong>1. Normalize to base units:</strong> Peptide = ${formatPrecision(amountMg, 3)} mg, Diluent = ${formatPrecision(volumeMl, 3)} mL, Dose = ${formatPrecision(doseMg, 4)} mg.`;
  }
  if (traceStep2) {
    traceStep2.innerHTML = `<strong>2. Concentration:</strong> ${formatPrecision(amountMg, 3)} mg ÷ ${formatPrecision(volumeMl, 3)} mL = <strong>${formatPrecision(concentrationMgPerMl, 4)} mg/mL</strong> (${formatPrecision(concentrationMcgPerMl, 1)} mcg/mL).`;
  }
  if (traceStep3) {
    traceStep3.innerHTML = `<strong>3. Required Volume:</strong> ${formatPrecision(doseMg, 4)} mg ÷ ${formatPrecision(concentrationMgPerMl, 4)} mg/mL = <strong>${formatPrecision(requiredVolumeMl, 4)} mL</strong>.`;
  }

  // Smooth scroll to results
  if (resultsCard) {
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Handle Dedicated Concentration Calculator
 */
function handleConcentrationCalculator(e) {
  e.preventDefault();

  setFieldError('conc-amount', 'err-conc-amount', '');
  setFieldError('conc-volume', 'err-conc-volume', '');

  const amount = parseInputValue('conc-amount');
  const amountUnit = document.getElementById('conc-amount-unit')?.value || 'mg';
  const volume = parseInputValue('conc-volume');
  const volumeUnit = document.getElementById('conc-volume-unit')?.value || 'mL';

  let hasError = false;
  if (!isValidPositive(amount)) {
    setFieldError('conc-amount', 'err-conc-amount', 'Please enter a valid peptide amount greater than zero.');
    hasError = true;
  }
  if (!isValidPositive(volume)) {
    setFieldError('conc-volume', 'err-conc-volume', 'Liquid volume must be greater than zero.');
    hasError = true;
  }

  if (hasError) return;

  const amountMg = amount * MASS_TO_MG[amountUnit];
  const volumeMl = volume * VOLUME_TO_ML[volumeUnit];

  const concMg = amountMg / volumeMl;
  const concMcg = concMg * 1000;
  const percent = concMg / 10; // 10 mg/mL = 1% w/v

  const resultsCard = document.getElementById('conc-results-card');
  if (resultsCard) resultsCard.hidden = false;

  const resMg = document.getElementById('res-conc-only-mg');
  const resMcg = document.getElementById('res-conc-only-mcg');
  const resPercent = document.getElementById('res-conc-only-percent');
  const resSummary = document.getElementById('res-conc-only-summary');

  if (resMg) resMg.textContent = `${formatPrecision(concMg, 3)} mg/mL`;
  if (resMcg) resMcg.textContent = `${formatPrecision(concMcg, 1)} mcg/mL`;
  if (resPercent) resPercent.textContent = `${formatPrecision(percent, 3)}% w/v`;

  if (resSummary) {
    resSummary.innerHTML = `<strong>Result:</strong> <strong>${formatPrecision(amount)} ${amountUnit}</strong> in <strong>${formatPrecision(volume)} ${volumeUnit}</strong> produces an exact concentration of <strong>${formatPrecision(concMg, 3)} mg/mL</strong> (<strong>${formatPrecision(concMcg, 1)} mcg/mL</strong>).`;
  }

  if (resultsCard) {
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Handle Unit Converter
 */
function handleUnitConverter(e) {
  if (e) e.preventDefault();

  const errEl = document.getElementById('err-converter');
  if (errEl) errEl.textContent = '';

  const value = parseInputValue('convert-value');
  const fromUnit = document.getElementById('convert-from')?.value;
  const toUnit = document.getElementById('convert-to')?.value;

  if (!isValidPositive(value)) {
    if (errEl) errEl.textContent = 'Please enter a valid number greater than zero.';
    return;
  }

  const isMassFrom = fromUnit in MASS_TO_MG;
  const isMassTo = toUnit in MASS_TO_MG;
  const isVolFrom = fromUnit in VOLUME_TO_ML;
  const isVolTo = toUnit in VOLUME_TO_ML;

  const resCard = document.getElementById('converter-results-card');
  const resVal = document.getElementById('res-converted-value');
  const resFormula = document.getElementById('res-converter-formula');

  if (isMassFrom && isMassTo) {
    // Mass conversion
    const baseMg = value * MASS_TO_MG[fromUnit];
    const converted = baseMg / MASS_TO_MG[toUnit];

    if (resCard) resCard.hidden = false;
    if (resVal) resVal.textContent = `${formatPrecision(converted, 6)} ${toUnit}`;
    if (resFormula) {
      resFormula.textContent = `${formatPrecision(value)} ${fromUnit} = ${formatPrecision(converted, 6)} ${toUnit} (${formatPrecision(baseMg, 4)} mg base)`;
    }

    // Populate matrix
    updateMatrixValues(value, fromUnit, 'mass');
  } else if (isVolFrom && isVolTo) {
    // Volume conversion
    const baseMl = value * VOLUME_TO_ML[fromUnit];
    const converted = baseMl / VOLUME_TO_ML[toUnit];

    if (resCard) resCard.hidden = false;
    if (resVal) resVal.textContent = `${formatPrecision(converted, 6)} ${toUnit}`;
    if (resFormula) {
      resFormula.textContent = `${formatPrecision(value)} ${fromUnit} = ${formatPrecision(converted, 6)} ${toUnit} (${formatPrecision(baseMl, 4)} mL base)`;
    }

    // Populate matrix
    updateMatrixValues(value, fromUnit, 'volume');
  } else {
    if (errEl) errEl.textContent = 'Cannot convert between mass and liquid volume directly without known density/concentration.';
    if (resCard) resCard.hidden = true;
  }
}

/**
 * Update the dynamic multi-unit matrix on the converter page
 */
function updateMatrixValues(val, fromUnit, type) {
  if (type === 'mass') {
    const baseMg = val * MASS_TO_MG[fromUnit];
    const gVal = baseMg / 1000;
    const mgVal = baseMg;
    const mcgVal = baseMg * 1000;

    const rowG = document.getElementById('matrix-g');
    const rowMg = document.getElementById('matrix-mg');
    const rowMcg = document.getElementById('matrix-mcg');

    if (rowG) rowG.textContent = `${formatPrecision(gVal, 6)} g`;
    if (rowMg) rowMg.textContent = `${formatPrecision(mgVal, 4)} mg`;
    if (rowMcg) rowMcg.textContent = `${formatPrecision(mcgVal, 2)} mcg`;
  } else if (type === 'volume') {
    const baseMl = val * VOLUME_TO_ML[fromUnit];
    const lVal = baseMl / 1000;
    const mlVal = baseMl;

    const rowL = document.getElementById('matrix-l');
    const rowMl = document.getElementById('matrix-ml');

    if (rowL) rowL.textContent = `${formatPrecision(lVal, 6)} L`;
    if (rowMl) rowMl.textContent = `${formatPrecision(mlVal, 3)} mL`;
  }
}

/**
 * Reset all fields, states, and outputs of any active form
 */
function handleResetAll() {
  const forms = document.querySelectorAll('form');
  forms.forEach(f => f.reset());

  // Hide all result cards
  const resultCards = document.querySelectorAll('.results-card, #results-card, #conc-results-card, #converter-results-card');
  resultCards.forEach(c => { c.hidden = true; });

  // Clear errors
  document.querySelectorAll('.field-error-msg').forEach(e => {
    e.textContent = '';
    e.classList.remove('visible');
  });
  document.querySelectorAll('.input-combo').forEach(c => {
    c.classList.remove('has-error');
  });
  const alert = document.getElementById('form-error-alert');
  if (alert) {
    alert.style.display = 'none';
  }

  // Reset Syringe graphic
  const fluidEl = document.getElementById('syringe-fluid');
  if (fluidEl) fluidEl.style.width = '0%';
  const badgeEl = document.getElementById('syringe-fill-badge');
  if (badgeEl) badgeEl.textContent = '0 Units';
  const unitLabelEl = document.getElementById('syringe-units-output');
  if (unitLabelEl) unitLabelEl.textContent = '0 Units';
  const warningEl = document.getElementById('syringe-warning');
  if (warningEl) warningEl.style.display = 'none';
}

/**
 * Quick Load Educational Examples
 */
function loadPreset(peptide, pUnit, volume, vUnit, dose, dUnit, syringe = 'u100-1ml') {
  const elPeptide = document.getElementById('peptide-amount');
  const elPUnit = document.getElementById('peptide-unit');
  const elVolume = document.getElementById('liquid-volume');
  const elVUnit = document.getElementById('liquid-unit');
  const elDose = document.getElementById('desired-dose');
  const elDUnit = document.getElementById('dose-unit');
  const elSyringe = document.getElementById('syringe-type');

  if (elPeptide) elPeptide.value = peptide;
  if (elPUnit) elPUnit.value = pUnit;
  if (elVolume) elVolume.value = volume;
  if (elVUnit) elVUnit.value = vUnit;
  if (elDose) elDose.value = dose;
  if (elDUnit) elDUnit.value = dUnit;
  if (elSyringe) elSyringe.value = syringe;

  // Trigger calculation
  const form = document.getElementById('main-calculator-form');
  if (form) {
    form.dispatchEvent(new Event('submit', { cancelable: true }));
  }
}

/**
 * Copy calculation summary to clipboard with UI feedback
 */
function copyResultsToClipboard(btnElement) {
  const summaryEl = document.getElementById('res-summary-text');
  if (!summaryEl) return;

  const textToCopy = summaryEl.innerText || summaryEl.textContent;
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Copied!
    `;
    setTimeout(() => {
      btnElement.innerHTML = originalText;
    }, 2000);
  }).catch(() => {
    alert('Unable to copy to clipboard.');
  });
}

/**
 * Setup Global Interactive Handlers
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const toggleBtn = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', isOpen);
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!toggleBtn.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 2. Main Calculator Form
  const mainForm = document.getElementById('main-calculator-form');
  if (mainForm) {
    mainForm.addEventListener('submit', handleMainCalculator);
  }

  // 3. Dedicated Concentration Form
  const concForm = document.getElementById('concentration-calculator-form');
  if (concForm) {
    concForm.addEventListener('submit', handleConcentrationCalculator);
  }

  // 4. Unit Converter Form & Live Updates
  const converterForm = document.getElementById('unit-converter-form');
  if (converterForm) {
    converterForm.addEventListener('submit', handleUnitConverter);

    const convVal = document.getElementById('convert-value');
    const convFrom = document.getElementById('convert-from');
    const convTo = document.getElementById('convert-to');

    if (convVal) convVal.addEventListener('input', () => handleUnitConverter());
    if (convFrom) convFrom.addEventListener('change', () => handleUnitConverter());
    if (convTo) convTo.addEventListener('change', () => handleUnitConverter());
  }

  // 5. Reset Buttons
  document.querySelectorAll('[data-action="reset"]').forEach(btn => {
    btn.addEventListener('click', handleResetAll);
  });

  // 6. Educational Presets
  document.querySelectorAll('[data-preset]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const p = e.currentTarget.dataset;
      loadPreset(p.peptide, p.punit, p.volume, p.vunit, p.dose, p.dunit, p.syringe);
    });
  });

  // 7. Math Trace Accordion
  const traceTrigger = document.querySelector('.math-trace-trigger');
  const traceContent = document.querySelector('.math-trace-content');
  if (traceTrigger && traceContent) {
    traceTrigger.addEventListener('click', () => {
      const isOpen = traceContent.classList.toggle('open');
      traceTrigger.setAttribute('aria-expanded', isOpen);
    });
  }

  // 8. FAQ Accordion Items
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (item) {
        const isOpen = item.classList.toggle('open');
        btn.setAttribute('aria-expanded', isOpen);
      }
    });
  });

  // 9. Copy Buttons
  document.querySelectorAll('[data-action="copy"]').forEach(btn => {
    btn.addEventListener('click', () => copyResultsToClipboard(btn));
  });

  // 10. Sticky Header Shadow
  window.addEventListener('scroll', () => {
    const header = document.querySelector('.site-header');
    if (header) {
      if (window.scrollY > 15) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }, { passive: true });
});
