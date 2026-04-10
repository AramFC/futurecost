const state = {
  activeTab: "home",
  currentPreset: "Custom Decision",
  lastCalculation: null,
  history: []
};

let largeModeEnabled = false;

const STORAGE_KEY = "futurecost_history_v4";
const FIXED_INFLATION_RATE = 0.03;
const AMOUNT_MIN = 0.01;
const AMOUNT_MAX = 10000000;
const YEARS_MIN = 1;
const YEARS_MAX = 100;

function getCurrentMaxAmount() {
  return largeModeEnabled ? AMOUNT_MAX : 1000;
}

const elements = {
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel"),

  amountRange: document.getElementById("amountRange"),
  amountInput: document.getElementById("amountInput"),
  amountRangeMinLabel: document.getElementById("amountRangeMinLabel"),
  amountRangeMaxLabel: document.getElementById("amountRangeMaxLabel"),
  toggleLargeModeBtn: document.getElementById("toggleLargeModeBtn"),

frequencySelect: document.getElementById("frequencySelect"),
investmentCategorySelect: document.getElementById("investmentCategorySelect"),
investmentSubTypeWrap: document.getElementById("investmentSubTypeWrap"),
investmentSubTypeSelect: document.getElementById("investmentSubTypeSelect"),
investmentTypeHelpText: document.getElementById("investmentTypeHelpText"),
customRateWrap: document.getElementById("customRateWrap"),
customRateInput: document.getElementById("customRateInput"),
customPortfolioWrap: document.getElementById("customPortfolioWrap"),
customPortfolioSp500: document.getElementById("customPortfolioSp500"),
customPortfolioSavings: document.getElementById("customPortfolioSavings"),

  yearsRange: document.getElementById("yearsRange"),
  yearsInput: document.getElementById("yearsInput"),
  
  inflationToggle: document.getElementById("inflationToggle"),

  calculateBtn: document.getElementById("calculateBtn"),
  saveDecisionBtn: document.getElementById("saveDecisionBtn"),
  resetBtn: document.getElementById("resetBtn"),
  shareBottomBtn: document.getElementById("shareBottomBtn"),

  futureLossDisplay: document.getElementById("futureLossDisplay"),
  futureLossSubtext: document.getElementById("futureLossSubtext"),
  opportunityCostDisplay: document.getElementById("opportunityCostDisplay"),
  totalSpentDisplay: document.getElementById("totalSpentDisplay"),
  potentialSavingsDisplay: document.getElementById("potentialSavingsDisplay"),

  regretGauge: document.getElementById("regretGauge"),
  regretScoreText: document.getElementById("regretScoreText"),
  regretSummary: document.getElementById("regretSummary"),

  graphChip: document.getElementById("graphChip"),
  investmentChartCanvas: document.getElementById("investmentChart"),
  graphStatus: document.getElementById("graphStatus"),
  graphNote: document.getElementById("graphNote"),
  graphEmptyState: document.getElementById("graphEmptyState"),

  verdictBadge: document.getElementById("verdictBadge"),
  verdictNote: document.getElementById("verdictNote"),

  timeCostText: document.getElementById("timeCostText"),
  contributionCountText: document.getElementById("contributionCountText"),
  habitImpactText: document.getElementById("habitImpactText"),
  inflationImpactText: document.getElementById("inflationImpactText"),

  compareSpendValue: document.getElementById("compareSpendValue"),
  compareInvestValue: document.getElementById("compareInvestValue"),
  compareDifferenceValue: document.getElementById("compareDifferenceValue"),
  barSpend: document.getElementById("barSpend"),
  barInvest: document.getElementById("barInvest"),

  insightBiggestLoss: document.getElementById("insightBiggestLoss"),
  insightBiggestLossText: document.getElementById("insightBiggestLossText"),
  insightSavings: document.getElementById("insightSavings"),
  insightSavingsText: document.getElementById("insightSavingsText"),
  insightBehavior: document.getElementById("insightBehavior"),
  insightBehaviorText: document.getElementById("insightBehaviorText"),
  insightInvestmentLens: document.getElementById("insightInvestmentLens"),
  insightInvestmentLensText: document.getElementById("insightInvestmentLensText"),

  presetCards: document.querySelectorAll(".preset-card"),
  historyList: document.getElementById("historyList"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  habitRankingList: document.getElementById("habitRankingList"),

  shareModal: document.getElementById("shareModal"),
  shareBackdrop: document.getElementById("shareBackdrop"),
  closeShareBtn: document.getElementById("closeShareBtn"),
  shareCard: document.getElementById("shareCard"),
  shareLossValue: document.getElementById("shareLossValue"),
  shareCopy: document.getElementById("shareCopy"),
  shareHabitName: document.getElementById("shareHabitName"),
  shareYearsText: document.getElementById("shareYearsText"),
  downloadShareBtn: document.getElementById("downloadShareBtn"),
  nativeShareBtn: document.getElementById("nativeShareBtn"),
  shareCanvas: document.getElementById("shareCanvas")
};

// Inflation warning explanation
let activeExplanationCard = null;
let explanationOverlay = null;

function showInflationExplanation() {
  // Remove any existing card first
  closeInflationExplanation();
  
  // Create overlay
  explanationOverlay = document.createElement("div");
  explanationOverlay.className = "inflation-overlay";
  explanationOverlay.addEventListener("click", closeInflationExplanation);
  document.body.appendChild(explanationOverlay);
  
  // Create explanation card
  activeExplanationCard = document.createElement("div");
  activeExplanationCard.className = "inflation-explanation-card";
  activeExplanationCard.innerHTML = `
    <button class="close-explanation" aria-label="Close">×</button>
    <h4>📉 Why negative opportunity cost?</h4>
    <p>You can lose purchasing power with a High-Yield Savings Account (HYSA) if inflation exceeds your APY.</p>
    <p style="margin-top: 10px;">Your nominal balance grows, but your <strong>purchasing power</strong>—what you can actually buy—decreases because prices for goods rise faster than your money accumulates.</p>
    <p style="margin-top: 10px; font-size: 0.75rem; color: var(--muted-2);">Example: 3% inflation vs 2% HYSA = 1% annual loss in real value.</p>
  `;
  
  const closeBtn = activeExplanationCard.querySelector(".close-explanation");
  closeBtn.addEventListener("click", closeInflationExplanation);
  
  document.body.appendChild(activeExplanationCard);
}

function closeInflationExplanation() {
  if (activeExplanationCard) {
    activeExplanationCard.remove();
    activeExplanationCard = null;
  }
  if (explanationOverlay) {
    explanationOverlay.remove();
    explanationOverlay = null;
  }
}

function formatCurrency(value) {
  const numericValue = Number(value) || 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: numericValue >= 1000 ? 0 : 2,
    minimumFractionDigits: numericValue > 0 && numericValue < 1 ? 2 : 0
  }).format(numericValue);
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(Number(value) || 0) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(Number(value) || 0) >= 100000 ? 1 : 0
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(Number(value) || 0));
}

function formatMultiple(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "0.0x";
  }

  return `${numericValue.toFixed(1)}x`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToCents(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function sanitizePositiveNumber(rawValue, fallback = 1, min = AMOUNT_MIN, max = null) {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return fallback;
  }
  
  // Use dynamic max if not provided
  const effectiveMax = max !== null ? max : getCurrentMaxAmount();
  
  // Allow only digits and one decimal point
  let cleaned = String(rawValue).replace(/[^\d.]/g, "");
  
  // Handle multiple decimal points — keep only the first one
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    const before = cleaned.slice(0, firstDot);
    const after = cleaned.slice(firstDot + 1).replace(/\./g, "");
    cleaned = before + "." + after;
  }
  
  // Remove leading zeros (but keep "0." if present)
  if (cleaned.startsWith("0") && !cleaned.startsWith("0.") && cleaned.length > 1) {
    cleaned = cleaned.replace(/^0+/, "");
    if (cleaned === "") cleaned = "0";
    if (cleaned.startsWith(".")) cleaned = "0" + cleaned;
  }
  
  // If empty after cleaning, use fallback
  if (cleaned === "" || cleaned === ".") {
    return fallback;
  }
  
  const parsed = Number(cleaned);
  
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  
  // Clamp to 2 decimal places
  const rounded = Math.round(parsed * 100) / 100;
  
  return clamp(rounded, min, effectiveMax);
}

function sanitizeInteger(rawValue, fallback = 1, min = YEARS_MIN, max = YEARS_MAX) {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return fallback;
  }

  const cleaned = String(rawValue).replace(/[^\d]/g, "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return clamp(Math.round(parsed), min, max);
}

const INVESTMENT_CONFIG = {
  sp500: {
    label: "S&P 500",
    annualReturn: 0.10,
    help: "Broad U.S. market index."
  },
  savings: {
    label: "High-Yield Savings",
    annualReturn: 0.045,
    help: "Lower-risk cash yield option."
  },
  "stock-apple": {
    label: "Apple",
    annualReturn: 0.12,
    help: "Large-cap tech stock with higher volatility."
  },
  "stock-nvidia": {
    label: "Nvidia",
    annualReturn: 0.16,
    help: "High-growth semiconductor stock with high volatility."
  },
  "stock-microsoft": {
    label: "Microsoft",
    annualReturn: 0.12,
    help: "Large-cap software stock."
  },
  "stock-amazon": {
    label: "Amazon",
    annualReturn: 0.12,
    help: "Large-cap growth stock with business diversification."
  },
  "stock-google": {
    label: "Google",
    annualReturn: 0.11,
    help: "Large-cap advertising and cloud business stock."
  },
  "stock-tesla": {
    label: "Tesla",
    annualReturn: 0.14,
    help: "High-volatility auto and energy stock."
  },
  "stock-meta": {
    label: "Meta",
    annualReturn: 0.12,
    help: "Large-cap digital advertising and platform stock."
  },
  "real-estate-reit": {
    label: "REIT Index",
    annualReturn: 0.09,
    help: "Public real estate basket with income exposure."
  },
  "real-estate-rental": {
    label: "Rental Property",
    annualReturn: 0.08,
    help: "Long-term rental real estate style return."
  },
  "real-estate-commercial": {
    label: "Commercial Real Estate",
    annualReturn: 0.075,
    help: "Property exposure with moderate long-term return."
  }
};

const INVESTMENT_SUB_OPTIONS = {
  stock: [
    { value: "stock-apple", label: "Apple" },
    { value: "stock-nvidia", label: "Nvidia" },
    { value: "stock-microsoft", label: "Microsoft" },
    { value: "stock-amazon", label: "Amazon" },
    { value: "stock-google", label: "Google" },
    { value: "stock-tesla", label: "Tesla" },
    { value: "stock-meta", label: "Meta" }
  ],
  "real-estate": [
    { value: "real-estate-reit", label: "REIT Index" },
    { value: "real-estate-rental", label: "Rental Property" },
    { value: "real-estate-commercial", label: "Commercial Real Estate" }
  ],
  custom: [
    { value: "custom-rate", label: "Interest Rate" },
    { value: "custom-portfolio", label: "Portfolio" }
  ]
};

function getSelectedInvestmentType() {
  const category = elements.investmentCategorySelect.value;

  if (category === "stock" || category === "real-estate" || category === "custom") {
    return elements.investmentSubTypeSelect.value;
  }

  return category;
}

function populateInvestmentSubTypeOptions(category) {
  const subTypeSelect = elements.investmentSubTypeSelect;
  const options = INVESTMENT_SUB_OPTIONS[category] || [];

  subTypeSelect.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");
}

function getAnnualReturnFromInvestmentType(type) {
  if (type === "custom-rate") {
    const raw = Number(elements.customRateInput?.value || 0);
    return clamp(raw, 0, 100) / 100;
  }

  if (type === "custom-portfolio") {
const sp500Weight = clamp(Number(elements.customPortfolioSp500?.value || 0), 0, 100);
const savingsWeight = clamp(Number(elements.customPortfolioSavings?.value || 0), 0, 100);

return (sp500Weight / 100) * 0.10 + (savingsWeight / 100) * 0.045;
  }

  return INVESTMENT_CONFIG[type]?.annualReturn ?? 0.10;
}

function getInvestmentLabel(type) {
  if (type === "custom-rate") {
    return "Custom Interest Rate";
  }

  if (type === "custom-portfolio") {
    return "Custom Portfolio";
  }

  return INVESTMENT_CONFIG[type]?.label ?? "S&P 500";
}

function getInvestmentHelpText(type) {
  if (type === "custom-rate") {
    return "Set your own annual return assumption. Remember: past returns don't guarantee future results.";
  }
  
  if (type === "custom-portfolio") {
    return "Blend S&P 500 and HYSA using your own allocation. Based on historical averages through current year to date.";
  }
  
  const config = INVESTMENT_CONFIG[type];
  if (!config) return "Long-term average based on data through current year to date. Not guaranteed.";
  
  let riskNote = "";
  if (type.startsWith("stock-")) {
    riskNote = " ⚠️ Individual stocks have higher volatility based on past decade performance.";
  } else if (type.startsWith("real-estate-")) {
    riskNote = " Real estate returns vary by market and property type.";
  } else if (type === "sp500") {
    riskNote = " Based on 1926-current average returns. 20-year rolling periods range from 6% to 14%.";
  }
  
  return (config.help || "") + riskNote;
}

function getFrequencyLabel(frequency) {
  switch (frequency) {
    case "daily":
      return "day";
    case "weekly":
      return "week";
    case "bi-weekly":
      return "2 weeks";
    case "monthly":
      return "month";
    case "bi-monthly":
      return "2 months";
    case "quarterly":
      return "quarter";
    case "semi-annually":
      return "6 months";
    case "yearly":
      return "year";
    case "one-time":
      return "once";
    default:
      return frequency;
  }
}

function frequencyToPeriodsPerYear(frequency) {
  switch (frequency) {
    case "daily":
      return 365;
    case "weekly":
      return 52;
    case "bi-weekly":
      return 26;
    case "monthly":
      return 12;
    case "bi-monthly":
      return 6;
    case "quarterly":
      return 4;
    case "semi-annually":
      return 2;
    case "yearly":
      return 1;
    case "one-time":
      return 0;
    default:
      return 12;
  }
}

function getContributionCount(frequency, years) {
  const periods = frequencyToPeriodsPerYear(frequency);
  if (frequency === "one-time") {
    return 1;
  }
  return Math.max(1, Math.round(periods * years));
}

function getContributionPatternText(frequency, years) {
  if (frequency === "one-time") {
    return years >= 20 ? "Large one-time decision" : "Single purchase decision";
  }

  if (frequency === "daily") {
    return years >= 15 ? "Deep recurring habit" : "Daily recurring habit";
  }

  if (frequency === "weekly" || frequency === "bi-weekly") {
    return years >= 10 ? "Strong recurring pattern" : "Recurring spending pattern";
  }

  if (frequency === "monthly" || frequency === "bi-monthly") {
    return years >= 10 ? "Long monthly commitment" : "Monthly recurring habit";
  }

  if (frequency === "quarterly" || frequency === "semi-annually") {
    return years >= 10 ? "Long-term periodic commitment" : "Periodic spending pattern";
  }

  return "Long-term repeated habit";
}

function updateSliderFill(slider) {
  const min = Number(slider.min || 0);
  const max = Number(slider.max || 100);
  const value = Number(slider.value || 0);
  const percent = ((value - min) / (max - min)) * 100;

  slider.style.background = `linear-gradient(90deg, rgba(201, 168, 97, 0.95) 0%, rgba(201, 168, 97, 0.95) ${percent}%, rgba(255,248,232,0.08) ${percent}%, rgba(255,248,232,0.08) 100%)`;
}

function setAmountSliderScale(amount) {
  const sliderMax = largeModeEnabled ? 10000000 : 1000;
  const sliderStep = 1;
  const normalizedAmount = clamp(Number(amount) || AMOUNT_MIN, AMOUNT_MIN, AMOUNT_MAX);
  const sliderValue = clamp(normalizedAmount, AMOUNT_MIN, sliderMax);

  elements.amountRange.min = String(AMOUNT_MIN);
  elements.amountRange.max = String(sliderMax);
  elements.amountRange.step = String(sliderStep);
  elements.amountRange.value = String(Math.round(sliderValue));

  elements.amountRangeMinLabel.textContent = formatCurrency(AMOUNT_MIN);
  elements.amountRangeMaxLabel.textContent = formatCurrency(sliderMax);

  // ADD THIS LINE — enforce input max on mode change
  const currentInputValue = sanitizePositiveNumber(elements.amountInput.value, 5, AMOUNT_MIN, sliderMax);
  elements.amountInput.value = currentInputValue.toFixed(2);

  if (elements.toggleLargeModeBtn) {
    elements.toggleLargeModeBtn.textContent = largeModeEnabled
      ? "Back to normal purchases"
      : "Larger purchases (>$1,000)";
    elements.toggleLargeModeBtn.classList.toggle("active", largeModeEnabled);
  }

  updateSliderFill(elements.amountRange);
}

function syncAmountFromRange() {
  const sliderValue = Math.round(sanitizePositiveNumber(elements.amountRange.value, 5, AMOUNT_MIN, AMOUNT_MAX));
  
  elements.amountRange.value = String(sliderValue);
  elements.amountInput.value = sliderValue.toFixed(2);  // Shows as "5.00"
  
  updateSliderFill(elements.amountRange);
  calculateAndRender();
}

// Scenario ranges for different investment types
const INVESTMENT_SCENARIOS = {
  // Broad market indices (S&P 500, REIT)
  sp500: { low: 0.06, mid: 0.10, high: 0.14 },
  savings: { low: 0.03, mid: 0.045, high: 0.06 },
  "real-estate-reit": { low: 0.05, mid: 0.09, high: 0.12 },
  "real-estate-rental": { low: 0.04, mid: 0.08, high: 0.11 },
  "real-estate-commercial": { low: 0.035, mid: 0.075, high: 0.10 },
  
  // Individual stocks (higher volatility)
  "stock-apple": { low: 0.07, mid: 0.12, high: 0.18 },
  "stock-nvidia": { low: 0.08, mid: 0.16, high: 0.25 },
  "stock-microsoft": { low: 0.07, mid: 0.12, high: 0.17 },
  "stock-amazon": { low: 0.06, mid: 0.12, high: 0.19 },
  "stock-google": { low: 0.06, mid: 0.11, high: 0.16 },
  "stock-tesla": { low: 0.05, mid: 0.14, high: 0.28 },
  "stock-meta": { low: 0.06, mid: 0.12, high: 0.20 },
  
  // Custom
  "custom-rate": { low: null, mid: null, high: null },
  "custom-portfolio": { low: null, mid: null, high: null }
};

function getInvestmentScenarios(type) {
  return INVESTMENT_SCENARIOS[type] || INVESTMENT_SCENARIOS.sp500;
}

function updateScenarioBox() {
  const investmentType = getSelectedInvestmentType();
  const scenarios = getInvestmentScenarios(investmentType);
  const inputs = getInputs();
  const years = inputs.years;
  const amount = inputs.amount;
  const frequency = inputs.frequency;
  const inflationOn = inputs.inflationOn;
  
  const scenarioBox = document.getElementById("scenarioBox");
  
  // Hide scenario box for custom options or if no scenarios
  if (!scenarios || scenarios.low === null || investmentType === "custom-rate" || investmentType === "custom-portfolio") {
    if (scenarioBox) scenarioBox.hidden = true;
    return;
  }
  
  // Calculate future value for each scenario
  function calcForReturn(annualReturn) {
    let future = calculateFutureLoss({ ...inputs, annualReturn });
    if (inflationOn) {
      future = applyInflationAdjustment(future, FIXED_INFLATION_RATE, years);
    }
    return future;
  }
  
  const lowValue = calcForReturn(scenarios.low);
  const midValue = calcForReturn(scenarios.mid);
  const highValue = calcForReturn(scenarios.high);
  
  // Update the DOM
  document.getElementById("scenarioLow").textContent = formatCurrency(lowValue);
  document.getElementById("scenarioMid").textContent = formatCurrency(midValue);
  document.getElementById("scenarioHigh").textContent = formatCurrency(highValue);
  
  // Show the box with animation
  if (scenarioBox && scenarioBox.hidden) {
    scenarioBox.hidden = false;
    scenarioBox.style.animation = "none";
    setTimeout(() => { if (scenarioBox) scenarioBox.style.animation = "fadeIn 0.2s ease"; }, 10);
  } else if (scenarioBox) {
    scenarioBox.hidden = false;
  }
}

function handleAmountInputTyping(e) {
  const raw = e.target.value;
  const currentMax = getCurrentMaxAmount();
  
  // Allow temporary states like "5.", ".", "5.5" 
  if (raw === "" || raw === ".") {
    return; // Nothing to calculate yet
  }
  
  // Clean up excessive decimal places (more than 2)
  let cleaned = raw;
  const dotIndex = raw.indexOf(".");
  if (dotIndex !== -1) {
    const beforeDot = raw.slice(0, dotIndex);
    let afterDot = raw.slice(dotIndex + 1);
    // Limit to 2 decimal places
    if (afterDot.length > 2) {
      afterDot = afterDot.slice(0, 2);
      cleaned = beforeDot + "." + afterDot;
      e.target.value = cleaned; // Immediately trim excess decimals
    }
  }
  
  // Try to parse whatever is typed so far
  let partialValue = parseFloat(cleaned);
  
  if (isNaN(partialValue)) {
    return; // Invalid, wait for more typing
  }
  
  // Check if value exceeds current max
  let clampedValue = partialValue;
  let needsRewrite = false;
  
  if (partialValue > currentMax) {
    clampedValue = currentMax;
    needsRewrite = true;
  } else if (partialValue < AMOUNT_MIN) {
    clampedValue = AMOUNT_MIN;
    needsRewrite = true;
  }
  
  // If value was clamped, rewrite the input field immediately
  if (needsRewrite) {
    e.target.value = clampedValue.toFixed(2);
  }
  
  // Update slider (rounded to whole dollar)
  const sliderMax = Number(elements.amountRange.max);
  const sliderValue = Math.round(clamp(clampedValue, AMOUNT_MIN, sliderMax));
  elements.amountRange.value = String(sliderValue);
  updateSliderFill(elements.amountRange);
  
  // Calculate with the clamped value
  calculateAndRenderWithValue(clampedValue);
}

function syncAmountFromInput() {
  const raw = elements.amountInput.value;
  
  if (raw === "") {
    return;
  }
  
  const currentMax = getCurrentMaxAmount();
  let value = sanitizePositiveNumber(raw, null, AMOUNT_MIN, currentMax);
  
  if (value === null) {
    // Still typing an incomplete number (e.g., "5." or ".")
    return;
  }
  
  const sliderMax = Number(elements.amountRange.max);
  const sliderValue = Math.round(clamp(value, AMOUNT_MIN, sliderMax));
  
  // Always show 2 decimal places for consistency
  elements.amountInput.value = value.toFixed(2);
  elements.amountRange.value = String(sliderValue);
  
  updateSliderFill(elements.amountRange);
  calculateAndRender();
}

function syncYearsFromRange() {
  const value = sanitizeInteger(elements.yearsRange.value, 20, YEARS_MIN, YEARS_MAX);
  elements.yearsRange.value = String(value);
  elements.yearsInput.value = String(value);
  updateSliderFill(elements.yearsRange);
  updateDerivedLabels();
  calculateAndRender();
}

function syncYearsFromInput() {
  const raw = elements.yearsInput.value;

  if (raw === "") {
    elements.yearsRange.value = String(YEARS_MIN);
    updateSliderFill(elements.yearsRange);
    calculateAndRender();
    return;
  }

  const value = sanitizeInteger(raw, 20, YEARS_MIN, YEARS_MAX);
  elements.yearsInput.value = String(value);
  elements.yearsRange.value = String(value);
  updateSliderFill(elements.yearsRange);
  updateDerivedLabels();
  calculateAndRender();
}

function syncPortfolioInputs(changedInput) {
  const spInput = elements.customPortfolioSp500;
  const hyInput = elements.customPortfolioSavings;

  let sp = clamp(Number(spInput.value || 0), 0, 100);
  let hy = clamp(Number(hyInput.value || 0), 0, 100);

  if (changedInput === "sp500") {
    sp = clamp(sp, 0, 100);
    hy = 100 - sp;
  } else if (changedInput === "savings") {
    hy = clamp(hy, 0, 100);
    sp = 100 - hy;
  }

  spInput.value = Math.round(sp);
  hyInput.value = Math.round(hy);
}

function updateDerivedLabels() {
  const years = Math.max(YEARS_MIN, Math.min(YEARS_MAX, Number(elements.yearsRange.value) || YEARS_MIN));
  elements.yearsRange.value = String(years);
  elements.yearsInput.value = String(years);
}

function activateTab(tab) {
  state.activeTab = tab;

  elements.tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tab}`);
  });
}

function updateInvestmentUI() {
  const category = elements.investmentCategorySelect.value;

  // Hide everything first
  elements.investmentSubTypeWrap.hidden = true;
  elements.customRateWrap.hidden = true;
  elements.customPortfolioWrap.hidden = true;

  // Default actual type = direct category
  let actualType = category;

  // Categories that need a second dropdown
  if (category === "stock" || category === "real-estate" || category === "custom") {
    elements.investmentSubTypeWrap.hidden = false;

    const currentOptions = Array.from(elements.investmentSubTypeSelect.options).map((opt) => opt.value);
    const expectedOptions = (INVESTMENT_SUB_OPTIONS[category] || []).map((opt) => opt.value);

    const needsRefresh =
      currentOptions.length !== expectedOptions.length ||
      currentOptions.some((value, index) => value !== expectedOptions[index]);

    if (needsRefresh) {
      populateInvestmentSubTypeOptions(category);
    }

    // If nothing is selected yet, pick the first option automatically
    if (!elements.investmentSubTypeSelect.value && elements.investmentSubTypeSelect.options.length > 0) {
      elements.investmentSubTypeSelect.selectedIndex = 0;
    }

    actualType = elements.investmentSubTypeSelect.value;
  }

  // Only show these when they actually apply
  if (actualType === "custom-rate") {
    elements.customRateWrap.hidden = false;
  }

  if (actualType === "custom-portfolio") {
    elements.customPortfolioWrap.hidden = false;
  }

  if (elements.investmentTypeHelpText) {
    elements.investmentTypeHelpText.textContent = getInvestmentHelpText(actualType);
  }

const scenarioBox = document.getElementById("scenarioBox");
if (scenarioBox) {
  const currentType = getSelectedInvestmentType();
  const scenarios = getInvestmentScenarios(currentType);
  if (!scenarios || scenarios.low === null || currentType === "custom-rate" || currentType === "custom-portfolio") {
    scenarioBox.hidden = true;
  }
}

}

let calcTimeout;
function calculateAndRenderDebounced() {
  clearTimeout(calcTimeout);
  calcTimeout = setTimeout(calculateAndRender, 16); // ~60fps
}

function setupTabs() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tab);
    });
  });
}

function safeAddEventListener(element, event, handler) {
  if (element) element.addEventListener(event, handler);
}

function setupInputs() {
  [elements.amountRange, elements.yearsRange].forEach((slider) => {
  updateSliderFill(slider);

elements.customPortfolioSp500.addEventListener("input", () => {
  syncPortfolioInputs("sp500");
  calculateAndRender();
});

elements.customPortfolioSavings.addEventListener("input", () => {
  syncPortfolioInputs("savings");
  calculateAndRender();
});

  slider.addEventListener("input", () => {
    if (slider === elements.amountRange) {
      syncAmountFromRange();
    } else {
      syncYearsFromRange();
    }
  });
});

elements.amountInput.addEventListener("input", handleAmountInputTyping);
elements.amountInput.addEventListener("keydown", function(e) {
  const value = this.value;
  const dotIndex = value.indexOf(".");
  
  // If there's already a decimal point and user types another, block it
  if (e.key === "." && dotIndex !== -1) {
    e.preventDefault();
    return;
  }
  
  // If there are already 2 digits after decimal, block additional digits
  if (dotIndex !== -1 && value.length - dotIndex - 1 >= 2) {
    // Allow backspace, delete, arrow keys, etc.
    const allowedKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Escape", "Enter"];
    if (!allowedKeys.includes(e.key) && !e.key.startsWith("Arrow") && e.key !== "Home" && e.key !== "End") {
      // Also allow numbers if they're replacing selection, but simpler: block
      if (e.key.length === 1 && !isNaN(parseInt(e.key))) {
        e.preventDefault();
      }
    }
  }
});
elements.yearsInput.addEventListener("input", syncYearsFromInput);
elements.yearsInput.addEventListener("change", syncYearsFromInput);
elements.yearsInput.addEventListener("blur", syncYearsFromInput);

elements.frequencySelect.addEventListener("change", calculateAndRender);
elements.investmentCategorySelect.addEventListener("change", () => {
  updateInvestmentUI();
  calculateAndRender();
});

elements.investmentSubTypeSelect.addEventListener("change", () => {
  updateInvestmentUI();
  calculateAndRender();
});
elements.inflationToggle.addEventListener("change", calculateAndRender);

if (elements.customRateInput) {
  elements.customRateInput.addEventListener("input", calculateAndRender);
}

if (elements.customPortfolioSp500) {
  elements.customPortfolioSp500.addEventListener("input", calculateAndRender);
}

if (elements.customPortfolioSavings) {
  elements.customPortfolioSavings.addEventListener("input", calculateAndRender);
}

updateDerivedLabels();
setAmountSliderScale(elements.amountInput.value);
updateInvestmentUI();
}

function getInputs() {
  const amount = sanitizePositiveNumber(elements.amountInput.value, 5, AMOUNT_MIN, AMOUNT_MAX);
  const years = sanitizeInteger(elements.yearsInput.value || elements.yearsRange.value, 20, YEARS_MIN, YEARS_MAX);

  return {
    amount,
    frequency: elements.frequencySelect.value,
investmentType: getSelectedInvestmentType(),
annualReturn: getAnnualReturnFromInvestmentType(getSelectedInvestmentType()),
    years,
    inflationOn: elements.inflationToggle.checked,
    inflationRate: FIXED_INFLATION_RATE
  };
}

function futureValueOfLumpSum(principal, annualReturn, years) {
  return principal * Math.pow(1 + annualReturn, years);
}

function futureValueOfRecurringPayment(payment, annualReturn, years, periodsPerYear) {
  if (periodsPerYear <= 0) {
    return 0;
  }

  const periodicRate = annualReturn / periodsPerYear;
  const periods = years * periodsPerYear;

  if (periodicRate === 0) {
    return payment * periods;
  }

  return payment * ((Math.pow(1 + periodicRate, periods) - 1) / periodicRate);
}

function totalSpent(amount, frequency, years) {
  const periods = frequencyToPeriodsPerYear(frequency);
  if (frequency === "one-time") {
    return amount;
  }
  return amount * periods * years;
}

function calculateFutureLoss(inputs) {
  const { amount, frequency, annualReturn, years } = inputs;
  const periodsPerYear = frequencyToPeriodsPerYear(frequency);

  if (frequency === "one-time") {
    return futureValueOfLumpSum(amount, annualReturn, years);
  }

  return futureValueOfRecurringPayment(amount, annualReturn, years, periodsPerYear);
}

function applyInflationAdjustment(futureValue, inflationRate, years) {
  return futureValue / Math.pow(1 + inflationRate, years);
}

function calculateRegretScore({ futureLoss, totalOutOfPocket, years, frequency }) {
  const ratio = totalOutOfPocket > 0 ? futureLoss / totalOutOfPocket : futureLoss;
  const normalizedFutureLoss = Math.min(Math.log10(Math.max(futureLoss, 1)) / 7, 1);
  const normalizedOpportunity = Math.min(Math.log10(Math.max(futureLoss - totalOutOfPocket, 1)) / 7, 1);
  const normalizedSpend = Math.min(Math.log10(Math.max(totalOutOfPocket, 1)) / 7, 1);
  const normalizedYears = Math.min(years / 60, 1);
  const normalizedRatio = Math.min(Math.max((ratio - 1) / 8, 0), 1);

  let score =
    normalizedFutureLoss * 34 +
    normalizedOpportunity * 24 +
    normalizedSpend * 12 +
    normalizedYears * 15 +
    normalizedRatio * 15;

  switch (frequency) {
    case "daily":
      score += 8;
      break;
    case "weekly":
      score += 5;
      break;
    case "bi-weekly":
      score += 4;
      break;
    case "monthly":
      score += 3;
      break;
    case "bi-monthly":
      score += 2;
      break;
    case "quarterly":
      score += 1;
      break;
    case "one-time":
      score -= 8;
      break;
    default:
      score += 0;
  }

  return Math.round(clamp(score, 0, 100));
}

function getVerdict(score) {
  if (score < 35) {
    return {
      text: "Buy",
      className: "verdict-buy",
      note: "Low long-term damage. This decision stays relatively contained.",
      summary: "Low cost decision. The future impact is limited."
    };
  }

  if (score < 70) {
    return {
      text: "Think About It",
      className: "verdict-think",
      note: "Moderate future cost. This gets expensive faster than it feels.",
      summary: "Middle zone. This is not harmless anymore if repeated."
    };
  }

  return {
    text: "Don’t Buy",
    className: "verdict-dont",
    note: "High future damage. This choice compounds into a serious loss.",
    summary: "Heavy regret zone. This decision costs real future value."
  };
}

function getHabitImpact(score) {
  if (score < 20) return "Very Low";
  if (score < 40) return "Low";
  if (score < 60) return "Moderate";
  if (score < 80) return "High";
  return "Extreme";
}

function getBehaviorPattern(score, frequency, years) {
  if (frequency === "daily" && years >= 10 && score >= 70) {
    return {
      title: "Silent Wealth Leak",
      text: "Small repeated spending is quietly draining a large future number."
    };
  }

  if (frequency === "one-time" && score < 35) {
    return {
      title: "Contained Purchase",
      text: "This looks more like a controlled one-off than a destructive habit."
    };
  }

  if (score >= 70) {
    return {
      title: "High Regret Pattern",
      text: "This pattern is strong enough to noticeably cut into future wealth."
    };
  }

  if (score >= 35) {
    return {
      title: "Moderate Pattern",
      text: "This choice is not catastrophic, but it gets expensive when repeated."
    };
  }

  return {
    title: "Low Drag Pattern",
    text: "This decision has a relatively limited long-term effect at the current settings."
  };
}

function buildGaugeGradient(score) {
  const degrees = (score / 100) * 360;

  let segments = [];

  if (degrees > 0) {
    const greenEnd = Math.min(degrees, 126);
    if (greenEnd > 0) segments.push(`var(--green) 0deg ${greenEnd}deg`);
  }

  if (degrees > 126) {
    const yellowEnd = Math.min(degrees, 252);
    segments.push(`var(--yellow) 126deg ${yellowEnd}deg`);
  }

  if (degrees > 252) {
    segments.push(`var(--red) 252deg ${degrees}deg`);
  }

  segments.push(`rgba(255,255,255,0.08) ${degrees}deg 360deg`);

  return `conic-gradient(${segments.join(", ")})`;
}

function updateGauge(score) {
  elements.regretGauge.style.background = buildGaugeGradient(score);

  animateNumber(
    elements.regretScoreText,
    Number(elements.regretScoreText.textContent) || 0,
    score,
    400,
    false
  );
}

function animateCurrency(element, endValue, duration = 650) {
  const startText = element.textContent.replace(/[$,]/g, "");
  const startValue = Number(startText) || 0;
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startValue + (endValue - startValue) * eased;
    element.textContent = formatCurrency(current);

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

function animateNumber(element, startValue, endValue, duration = 500, currency = false) {
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startValue + (endValue - startValue) * eased;

    if (currency) {
      element.textContent = formatCurrency(current);
    } else {
      element.textContent = Math.round(current);
    }

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

function calculateAndRender() {
  const inputs = getInputs();

  elements.amountInput.value = roundToCents(inputs.amount).toFixed(inputs.amount % 1 === 0 ? 0 : 2);
  elements.yearsInput.value = String(inputs.years);
  elements.yearsRange.value = String(inputs.years);

  let futureLoss = calculateFutureLoss(inputs);
  const totalOutOfPocket = totalSpent(inputs.amount, inputs.frequency, inputs.years);

  if (inputs.inflationOn) {
    futureLoss = applyInflationAdjustment(futureLoss, inputs.inflationRate, inputs.years);
  }

  const opportunityCost = futureLoss - totalOutOfPocket;
  const futureValueMultiple = totalOutOfPocket > 0 ? futureLoss / totalOutOfPocket : 0;

  const regretScore = calculateRegretScore({
    futureLoss,
    totalOutOfPocket,
    years: inputs.years,
    frequency: inputs.frequency
  });

  const verdict = getVerdict(regretScore);
  const habitImpact = getHabitImpact(regretScore);
  const behaviorPattern = getBehaviorPattern(regretScore, inputs.frequency, inputs.years);
  const contributionCount = getContributionCount(inputs.frequency, inputs.years);
  const contributionPattern = getContributionPatternText(inputs.frequency, inputs.years);

  let inflationExplanation = "";
  if (inputs.inflationOn && opportunityCost < 0 && inputs.investmentType === "savings") {
    inflationExplanation = "After inflation, this option may lose purchasing power even if the balance still grows.";
  }

  state.lastCalculation = {
    presetName: state.currentPreset,
    amount: inputs.amount,
    frequency: inputs.frequency,
    frequencyLabel: getFrequencyLabel(inputs.frequency),
    investmentType: inputs.investmentType,
    investmentLabel: getInvestmentLabel(inputs.investmentType),
    annualReturn: inputs.annualReturn,
    years: inputs.years,
    inflationOn: inputs.inflationOn,
    inflationRate: inputs.inflationRate,
    futureLoss,
    totalOutOfPocket,
    opportunityCost,
    futureValueMultiple,
    potentialSavings: futureLoss,
    regretScore,
    verdict: verdict.text,
    verdictClass: verdict.className,
    verdictNote: verdict.note,
    inflationExplanation,
    habitImpact,
    contributionCount,
    contributionPattern,
    behaviorPattern,
    createdAt: new Date().toISOString()
  };

  // Handle inflation warning link (AFTER state.lastCalculation is set)
  const warningLink = document.getElementById("inflationWarningLink");
  const warningBtn = document.getElementById("showInflationWarningBtn");

  if (state.lastCalculation.inflationExplanation && state.lastCalculation.opportunityCost < 0 && state.lastCalculation.investmentType === "savings") {
    if (warningLink) warningLink.style.display = "inline-block";
    if (warningBtn && !warningBtn.hasListener) {
      warningBtn.addEventListener("click", showInflationExplanation);
      warningBtn.hasListener = true;
    }
  } else {
    if (warningLink) warningLink.style.display = "none";
    closeInflationExplanation();
  }

  updateScenarioBox();
  renderCalculation();
}

function calculateAndRenderWithValue(overrideAmount) {
  const inputs = getInputs();
  
  // Override the amount with the one being typed
  inputs.amount = overrideAmount;
  
  // Same calculation logic as calculateAndRender, but using the override
  let futureLoss = calculateFutureLoss(inputs);
  const totalOutOfPocket = totalSpent(inputs.amount, inputs.frequency, inputs.years);
  
  if (inputs.inflationOn) {
    futureLoss = applyInflationAdjustment(futureLoss, inputs.inflationRate, inputs.years);
  }
  
  const opportunityCost = futureLoss - totalOutOfPocket;
  const futureValueMultiple = totalOutOfPocket > 0 ? futureLoss / totalOutOfPocket : 0;
  
  const regretScore = calculateRegretScore({
    futureLoss,
    totalOutOfPocket,
    years: inputs.years,
    frequency: inputs.frequency
  });
  
  const verdict = getVerdict(regretScore);
  const habitImpact = getHabitImpact(regretScore);
  const behaviorPattern = getBehaviorPattern(regretScore, inputs.frequency, inputs.years);
  const contributionCount = getContributionCount(inputs.frequency, inputs.years);
  const contributionPattern = getContributionPatternText(inputs.frequency, inputs.years);
  
  let inflationExplanation = "";
  if (inputs.inflationOn && opportunityCost < 0 && inputs.investmentType === "savings") {
    inflationExplanation = "After inflation, this option may lose purchasing power even if the balance still grows.";
  }

  // Inside calculateAndRenderWithValue, after setting inflationExplanation
  
  state.lastCalculation = {
    presetName: state.currentPreset,
    amount: inputs.amount,
    frequency: inputs.frequency,
    frequencyLabel: getFrequencyLabel(inputs.frequency),
    investmentType: inputs.investmentType,
    investmentLabel: getInvestmentLabel(inputs.investmentType),
    annualReturn: inputs.annualReturn,
    years: inputs.years,
    inflationOn: inputs.inflationOn,
    inflationRate: inputs.inflationRate,
    futureLoss,
    totalOutOfPocket,
    opportunityCost,
    futureValueMultiple,
    potentialSavings: futureLoss,
    regretScore,
    verdict: verdict.text,
    verdictClass: verdict.className,
    verdictNote: verdict.note,
    inflationExplanation,
    habitImpact,
    contributionCount,
    contributionPattern,
    behaviorPattern,
    createdAt: new Date().toISOString()
  };
  
  const warningLink = document.getElementById("inflationWarningLink");
const warningBtn = document.getElementById("showInflationWarningBtn");

if (inputs.inflationOn && opportunityCost < 0 && inputs.investmentType === "savings") {
  inflationExplanation = "After inflation, this option may lose purchasing power even if the balance still grows.";
  
  if (warningLink) warningLink.style.display = "inline-block";
  
  if (warningBtn && !warningBtn.hasListener) {
    warningBtn.addEventListener("click", showInflationExplanation);
    warningBtn.hasListener = true;
  }
} else {
  if (warningLink) warningLink.style.display = "none";
  closeInflationExplanation();
}
  updateScenarioBox();

  renderCalculation();
}

function renderCalculation() {
  if (!state.lastCalculation) return;

  const calc = state.lastCalculation;

animateCurrency(elements.futureLossDisplay, calc.futureLoss, 700);
animateCurrency(elements.opportunityCostDisplay, calc.opportunityCost, 650);
animateCurrency(elements.totalSpentDisplay, calc.totalOutOfPocket, 650);
elements.potentialSavingsDisplay.textContent = formatMultiple(calc.futureValueMultiple);

elements.opportunityCostDisplay.classList.remove("value-negative", "value-neutral", "value-positive");

if (calc.opportunityCost < 0) {
  elements.opportunityCostDisplay.classList.add("value-negative");
} else if (calc.opportunityCost > 0) {
  elements.opportunityCostDisplay.classList.add("value-positive");
} else {
  elements.opportunityCostDisplay.classList.add("value-neutral");
}

  elements.futureLossSubtext.textContent = calc.inflationOn
    ? "Inflation-adjusted future value if invested instead"
    : "Nominal future value if invested instead";

  elements.verdictBadge.textContent = calc.verdict;
  elements.verdictBadge.className = `verdict-badge ${calc.verdictClass}`;
elements.verdictNote.textContent = calc.inflationExplanation || calc.verdictNote;

  elements.regretSummary.textContent = calc.behaviorPattern.text;

  updateGauge(calc.regretScore);

  elements.timeCostText.textContent = calc.contributionPattern;
  elements.contributionCountText.textContent = formatNumber(calc.contributionCount);
  elements.habitImpactText.textContent = calc.habitImpact;
  elements.inflationImpactText.textContent = calc.inflationOn ? "Real Value On" : "Nominal Value";

  renderCompare(calc);
  renderInsights(calc);
  renderShareCard(calc);
  queueGraphUpdate(calc);
}

function renderCompare(calc) {
  elements.compareSpendValue.textContent = formatCurrency(calc.totalOutOfPocket);
  elements.compareInvestValue.textContent = formatCurrency(calc.futureLoss);
  elements.compareDifferenceValue.textContent = formatCurrency(calc.futureLoss - calc.totalOutOfPocket);

  const total = calc.totalOutOfPocket + calc.futureLoss;

  const spendWidth = total > 0 ? (calc.totalOutOfPocket / total) * 100 : 50;
  const investWidth = total > 0 ? (calc.futureLoss / total) * 100 : 50;

  elements.barSpend.style.width = `${spendWidth}%`;
  elements.barInvest.style.width = `${investWidth}%`;
}

function renderInsights(calc) {
  const biggestLossTitle =
    calc.presetName && calc.presetName !== "Custom Decision"
      ? calc.presetName
      : `${formatCurrency(calc.amount)} ${calc.frequency === "one-time" ? "once" : `per ${calc.frequencyLabel}`}`;

  const perText = calc.frequency === "one-time"
    ? "once"
    : `per ${calc.frequencyLabel}`;

  elements.insightBiggestLoss.textContent = biggestLossTitle;
  elements.insightBiggestLossText.textContent =
    `At ${formatCurrency(calc.amount)} ${perText}, this can grow into ${formatCompactCurrency(calc.futureLoss)} over ${calc.years} years.`;

  elements.insightSavings.textContent = formatCompactCurrency(calc.futureLoss);
  elements.insightSavingsText.textContent =
    `Redirecting this decision into ${calc.investmentLabel.toLowerCase()} could create a future value of ${formatCurrency(calc.futureLoss)}.`;

  elements.insightBehavior.textContent = calc.behaviorPattern.title;
  elements.insightBehaviorText.textContent = calc.behaviorPattern.text;

  elements.insightInvestmentLens.textContent = calc.investmentLabel;
  elements.insightInvestmentLensText.textContent =
    `This projection assumes an estimated long-term return based on a ${calc.investmentLabel.toLowerCase()} approach.`;

  renderHabitRankings();
}

function renderShareCard(calc) {
  elements.shareLossValue.textContent = formatCurrency(calc.futureLoss);
  elements.shareHabitName.textContent = calc.presetName || "Custom Decision";
  elements.shareYearsText.textContent = `${calc.years} years`;

  const frequencyText = calc.frequency === "one-time" ? "once" : `every ${calc.frequencyLabel}`;
  elements.shareCopy.textContent =
    `${formatCurrency(calc.futureLoss)} from investing ${formatCurrency(calc.amount)} ${frequencyText} over ${calc.years} years instead of spending it.`;
}

function setupButtons() {
  elements.calculateBtn.addEventListener("click", calculateAndRender);

  elements.saveDecisionBtn.addEventListener("click", () => {
    if (!state.lastCalculation) return;
    saveDecisionToHistory(state.lastCalculation);
  });

  elements.resetBtn.addEventListener("click", resetCalculator);

   elements.toggleLargeModeBtn.addEventListener("click", () => {
  largeModeEnabled = !largeModeEnabled;
  setAmountSliderScale(elements.amountInput.value);
  calculateAndRender();
});

  elements.shareBottomBtn.addEventListener("click", openShareModal);
  elements.shareBackdrop.addEventListener("click", closeShareModal);
  elements.closeShareBtn.addEventListener("click", closeShareModal);
  elements.downloadShareBtn.addEventListener("click", downloadShareImage);
  elements.nativeShareBtn.addEventListener("click", nativeShareImage);

  elements.clearHistoryBtn.addEventListener("click", () => {
    state.history = [];
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    renderHabitRankings();
  });
}

function resetCalculator() {
  elements.amountInput.value = "5.00";
  elements.frequencySelect.value = "daily";
elements.investmentCategorySelect.value = "sp500";
elements.investmentSubTypeSelect.innerHTML = "";
elements.investmentSubTypeWrap.hidden = true;
  elements.yearsRange.value = "20";
  elements.yearsInput.value = "20";
  elements.inflationToggle.checked = true;

  state.currentPreset = "Custom Decision";
  setActivePresetCard(null);

updateDerivedLabels();
setAmountSliderScale(5);
updateSliderFill(elements.yearsRange);

if (elements.customRateInput) {
  elements.customRateInput.value = "8";
}

if (elements.customPortfolioSp500) {
  elements.customPortfolioSp500.value = "60";
}

if (elements.customPortfolioSavings) {
  elements.customPortfolioSavings.value = "40";
}

updateInvestmentUI();
calculateAndRender();
}

function setupPresets() {
  elements.presetCards.forEach((card) => {
    card.addEventListener("click", () => {
      state.currentPreset = card.dataset.name || "Preset";

      const amount = Number(card.dataset.amount || 5);
      const frequency = card.dataset.frequency || "daily";
      const investment = card.dataset.investment || "sp500";
      const years = Number(card.dataset.years || 20);

      elements.amountInput.value = String(amount);
      elements.frequencySelect.value = frequency;
     if (investment.startsWith("stock-")) {
  elements.investmentCategorySelect.value = "stock";
  populateInvestmentSubTypeOptions("stock");
  elements.investmentSubTypeSelect.value = investment;
} else if (investment.startsWith("real-estate-")) {
  elements.investmentCategorySelect.value = "real-estate";
  populateInvestmentSubTypeOptions("real-estate");
  elements.investmentSubTypeSelect.value = investment;
} else if (investment.startsWith("custom-")) {
  elements.investmentCategorySelect.value = "custom";
  populateInvestmentSubTypeOptions("custom");
  elements.investmentSubTypeSelect.value = investment;
} else {
  elements.investmentCategorySelect.value = investment;
  elements.investmentSubTypeSelect.innerHTML = "";
  elements.investmentSubTypeWrap.hidden = true;
}

updateInvestmentUI();

      elements.yearsRange.value = String(years);
      elements.yearsInput.value = String(years);

      setAmountSliderScale(amount);
      updateDerivedLabels();
      updateSliderFill(elements.yearsRange);

      setActivePresetCard(card);
      calculateAndRender();

      const calculatorTabBtn = document.querySelector('[data-tab="calculator"]');
      if (calculatorTabBtn) {
        calculatorTabBtn.click();
      }
    });
  });
}

function setActivePresetCard(activeCard) {
  elements.presetCards.forEach((card) => {
    card.classList.toggle("active", card === activeCard);
  });
}

function saveDecisionToHistory(decision) {
  const entry = {
    ...decision,
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    readableDate: new Date().toLocaleString()
  };

  state.history.unshift(entry);
  state.history = state.history.slice(0, 40);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));

  renderHistory();
  renderHabitRankings();

  const historyTabBtn = document.querySelector('[data-tab="history"]');
  if (historyTabBtn) {
    historyTabBtn.click();
  }
}

function deleteHistoryItem(id) {
  state.history = state.history.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
  renderHistory();
  renderHabitRankings();
}

function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      state.history = parsed;
    }
  } catch (error) {
    console.error("Failed to load history:", error);
    state.history = [];
  }
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML =
      '<div class="history-empty">No saved decisions yet. Run one and press “Save Decision.”</div>';
    return;
  }

  elements.historyList.innerHTML = state.history
    .map((item) => {
      return `
        <article class="history-card">
          <div class="history-top">
            <div>
              <h3>${escapeHtml(item.presetName || "Custom Decision")}</h3>
              <p>${escapeHtml(item.readableDate || "")}</p>
            </div>
            <div class="history-top-actions">
              <div class="history-score-pill">Score ${item.regretScore}</div>
              <button class="history-delete-btn" type="button" data-history-id="${escapeHtml(item.id)}">Delete</button>
            </div>
          </div>

          <div class="history-metrics">
            <div class="history-metric">
              <span>Amount</span>
              <strong>${formatCurrency(item.amount)}</strong>
            </div>
            <div class="history-metric">
              <span>Frequency</span>
              <strong>${escapeHtml(item.frequency)}</strong>
            </div>
            <div class="history-metric">
              <span>Investment</span>
              <strong>${escapeHtml(item.investmentLabel || item.investmentType || "—")}</strong>
            </div>
            <div class="history-metric">
              <span>Inflation</span>
              <strong>${item.inflationOn ? "On" : "Off"}</strong>
            </div>
            <div class="history-metric">
              <span>Years</span>
              <strong>${item.years}</strong>
            </div>
            <div class="history-metric">
              <span>Future Value</span>
              <strong>${formatCurrency(item.futureLoss)}</strong>
            </div>
            <div class="history-metric">
              <span>Total Spent</span>
              <strong>${formatCurrency(item.totalOutOfPocket)}</strong>
            </div>
            <div class="history-metric">
              <span>Verdict</span>
              <strong>${escapeHtml(item.verdict)}</strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  elements.historyList.querySelectorAll(".history-delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteHistoryItem(button.dataset.historyId);
    });
  });
}

function renderHabitRankings() {
  if (!state.history.length) {
    elements.habitRankingList.innerHTML =
      '<div class="ranking-item empty">No saved decisions yet.</div>';
    return;
  }

  const topThree = [...state.history]
    .sort((a, b) => b.futureLoss - a.futureLoss)
    .slice(0, 3);

  elements.habitRankingList.innerHTML = topThree
    .map((item, index) => {
      return `
        <div class="ranking-item">
          <div class="rank-left">
            <div class="rank-badge">#${index + 1}</div>
            <div class="rank-copy">
              <strong>${escapeHtml(item.presetName || "Custom Decision")}</strong>
              <small>${item.years} yrs • Score ${item.regretScore}</small>
            </div>
          </div>
          <div class="rank-value">${formatCompactCurrency(item.futureLoss)}</div>
        </div>
      `;
    })
    .join("");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openShareModal() {
  if (!state.lastCalculation) return;
  elements.shareModal.classList.add("open");
  elements.shareModal.setAttribute("aria-hidden", "false");
  elements.closeShareBtn.focus();
}

function closeShareModal() {
  elements.shareModal.classList.remove("open");
  elements.shareModal.setAttribute("aria-hidden", "true");
  elements.shareBottomBtn.focus();
}

function createShareCanvas() {
  if (!state.lastCalculation) return null;

  const canvas = elements.shareCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const calc = state.lastCalculation;

  ctx.clearRect(0, 0, width, height);

  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
bgGradient.addColorStop(0, "#0c0906");
bgGradient.addColorStop(1, "#060403");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

const orb1 = ctx.createRadialGradient(160, 180, 30, 160, 180, 300);
orb1.addColorStop(0, "rgba(201, 168, 97, 0.22)");
orb1.addColorStop(1, "rgba(201, 168, 97, 0)");
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, width, height);

  const orb2 = ctx.createRadialGradient(980, 930, 40, 980, 930, 280);
  orb2.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  orb2.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, width, height);

  for (let x = 0; x < width; x += 40) {
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += 40) {
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 2;
  roundRect(ctx, 40, 40, width - 80, height - 80, 36);
  ctx.stroke();

ctx.fillStyle = "#e7d1a4";
  ctx.font = "800 28px Inter, sans-serif";
  ctx.fillText("FUTURECOST", 90, 120);

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "700 22px Inter, sans-serif";
  ctx.fillText("FUTURE VALUE", 90, 195);

 ctx.fillStyle = "#ffffff";

const valueText = formatCurrency(calc.futureLoss);
let fontSize = 118;

do {
  ctx.font = `800 ${fontSize}px Inter, sans-serif`;
  fontSize -= 4;
} while (ctx.measureText(valueText).width > 980 && fontSize > 52);

ctx.fillText(valueText, 90, 360);

  ctx.fillStyle = "#f5e8cf";
  ctx.font = "600 34px Inter, sans-serif";
  wrapCanvasText(
    ctx,
    `${formatCurrency(calc.futureLoss)} from investing ${formatCurrency(calc.amount)} ${calc.frequency === "one-time" ? "once" : `every ${calc.frequencyLabel}`} over ${calc.years} years instead of spending it.`,
    90,
    450,
    980,
    48
  );

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "700 26px Inter, sans-serif";
  ctx.fillText(calc.presetName || "Custom Decision", 90, 980);

  ctx.fillStyle = "#98a2b3";
  ctx.font = "600 24px Inter, sans-serif";
  ctx.fillText(`${calc.years} years`, 980, 980);

  return canvas;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let i = 0; i < words.length; i += 1) {
    const testLine = `${line}${words[i]} `;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, currentY);
      line = `${words[i]} `;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
  }
}

function downloadShareImage() {
  const canvas = createShareCanvas();
  if (!canvas) return;

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "futurecost-share-card.png";
  link.click();
}

async function nativeShareImage() {
  const canvas = createShareCanvas();
  if (!canvas) return;

  const calc = state.lastCalculation;

  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], "futurecost-share-card.png", { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "FutureCost Share Card",
        text: `${formatCurrency(calc.futureLoss)} from investing instead of spending.`,
        files: [file]
      });
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: "FutureCost",
        text: `${formatCurrency(calc.futureLoss)} from investing instead of spending over ${calc.years} years.`
      });
      return;
    }

    alert("Native sharing isn’t supported on this device. Use Download Image instead.");
  } catch (error) {
    console.error("Share failed:", error);
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.shareModal.classList.contains("open")) {
      closeShareModal();
    }
  });
}

function setupRevealAnimations() {
  const revealItems = document.querySelectorAll(".reveal-up");

  if (!revealItems.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function setupHomeButtons() {
  const jumpButtons = document.querySelectorAll("[data-jump-tab]");

  jumpButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.jumpTab;
      if (!nextTab) return;
      activateTab(nextTab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function initializeUIState() {
  loadHistory();
  renderHistory();
  renderHabitRankings();
  setAmountSliderScale(elements.amountInput.value);
  updateSliderFill(elements.yearsRange);
  updateDerivedLabels();
  calculateAndRender();
}

function init() {
  if (
    !elements.amountRange ||
    !elements.amountInput ||
    !elements.yearsRange ||
    !elements.yearsInput ||
    !elements.frequencySelect ||
    !elements.investmentCategorySelect
  ) {
    console.error("FutureCost init failed: missing required DOM elements.");
    return;
  }

  setupTabs();
  setupInputs();
  setupButtons();
  setupPresets();
  setupKeyboardShortcuts();
  setupHomeButtons();
  initializeUIState();
  setupRevealAnimations();
  activateTab("home");
}

const GRAPH_HISTORY_MONTHS = 60;
const GRAPH_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const GRAPH_PROXY_MAP = {
  sp500: {
    symbol: "SPY",
    label: "S&P 500 proxy (SPY ETF)",
    historicalSupported: true
  },
  savings: {
    symbol: null,
    label: "High-Yield Savings",
    historicalSupported: false
  },
  "stock-apple": {
    symbol: "AAPL",
    label: "Apple",
    historicalSupported: true
  },
  "stock-nvidia": {
    symbol: "NVDA",
    label: "Nvidia",
    historicalSupported: true
  },
  "stock-microsoft": {
    symbol: "MSFT",
    label: "Microsoft",
    historicalSupported: true
  },
  "stock-amazon": {
    symbol: "AMZN",
    label: "Amazon",
    historicalSupported: true
  },
  "stock-google": {
    symbol: "GOOG",
    label: "Google",
    historicalSupported: true
  },
  "stock-tesla": {
    symbol: "TSLA",
    label: "Tesla",
    historicalSupported: true
  },
  "stock-meta": {
    symbol: "META",
    label: "Meta",
    historicalSupported: true
  },
  "real-estate-reit": {
    symbol: "VNQ",
    label: "U.S. REIT proxy (VNQ ETF)",
    historicalSupported: true
  },
  "real-estate-rental": {
    symbol: null,
    label: "Rental Property",
    historicalSupported: false
  },
  "real-estate-commercial": {
    symbol: null,
    label: "Commercial Real Estate",
    historicalSupported: false
  },
  "custom-rate": {
    symbol: null,
    label: "Custom Interest Rate",
    historicalSupported: false
  },
  "custom-portfolio": {
    symbol: null,
    label: "Custom Portfolio",
    historicalSupported: false
  }
};

let investmentChartInstance = null;
let graphUpdateToken = 0;
let graphWarnedOnce = false;

const todayMarkerPlugin = {
  id: "todayMarkerPlugin",
  afterDatasetsDraw(chart, args, pluginOptions) {
    const todayIndex = pluginOptions?.todayIndex;
    if (typeof todayIndex !== "number") return;

    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return;

    const x = xScale.getPixelForValue(todayIndex);
    const ctx = chart.ctx;

    ctx.save();
    ctx.strokeStyle = "#c9a861";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, yScale.top);
    ctx.lineTo(x, yScale.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#e7c980";
    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = "left";
    ctx.fillText("Today", x + 8, yScale.top + 16);
    ctx.restore();
  }
};

function queueGraphUpdate(calc) {
  const token = ++graphUpdateToken;

  Promise.resolve()
    .then(() => updateInvestmentGraph(calc, token))
    .catch((error) => {
      if (!graphWarnedOnce) {
        console.warn("Graph update failed:", error);
        graphWarnedOnce = true;
      }
      showGraphFallback("Graph unavailable right now. The calculator still works normally.");
    });
}

function resolveGraphMeta(investmentType) {
  return GRAPH_PROXY_MAP[investmentType] || {
    symbol: null,
    label: getInvestmentLabel(investmentType),
    historicalSupported: false
  };
}

function setGraphStatus(message, isError = false) {
  if (!elements.graphStatus) return;
  elements.graphStatus.textContent = message;
  elements.graphStatus.classList.toggle("error", Boolean(isError));
}

function setGraphNote(message) {
  if (!elements.graphNote) return;
  elements.graphNote.textContent = message;
}

function showGraphFallback(message) {
  if (elements.graphEmptyState) {
    elements.graphEmptyState.hidden = false;
    elements.graphEmptyState.textContent = message;
  }

  if (elements.investmentChartCanvas) {
    elements.investmentChartCanvas.style.display = "none";
  }

  setGraphStatus(message, true);

  if (investmentChartInstance) {
    investmentChartInstance.destroy();
    investmentChartInstance = null;
  }
}

function showGraphCanvas() {
  if (elements.graphEmptyState) {
    elements.graphEmptyState.hidden = true;
  }

  if (elements.investmentChartCanvas) {
    elements.investmentChartCanvas.style.display = "block";
  }
}

function getGraphCacheKey(symbol) {
  return `futurecost_graph_cache_${symbol}`;
}

function readGraphCache(symbol) {
  try {
    const raw = localStorage.getItem(getGraphCacheKey(symbol));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !Array.isArray(parsed?.series)) return null;
    if (Date.now() - parsed.savedAt > GRAPH_CACHE_TTL_MS) return null;
    return parsed.series;
  } catch {
    return null;
  }
}

function writeGraphCache(symbol, series) {
  try {
    localStorage.setItem(
      getGraphCacheKey(symbol),
      JSON.stringify({
        savedAt: Date.now(),
        series
      })
    );
  } catch {
    // ignore cache failures
  }
}

async function fetchHistoricalSeries(symbol) {
  const cached = readGraphCache(symbol);
  if (cached) return cached;

  const response = await fetch(`/api/market-history?symbol=${encodeURIComponent(symbol)}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Graph API request failed with ${response.status}`);
  }

  const payload = await response.json();

  if (!payload || !Array.isArray(payload.series) || payload.series.length < 12) {
    throw new Error("Graph API returned invalid data");
  }

  writeGraphCache(symbol, payload.series);
  return payload.series;
}

function getMonthlyContribution(calc) {
  if (calc.frequency === "one-time") return 0;
  const periodsPerYear = frequencyToPeriodsPerYear(calc.frequency);
  return (calc.amount * periodsPerYear) / 12;
}

function buildHistoricalDataset(calc, historicalSeries) {
  const trimmed = historicalSeries.slice(-GRAPH_HISTORY_MONTHS);
  if (trimmed.length < 12) return [];

  return trimmed
    .map((point) => ({
      x: point.date,
      y: Number(point.close)
    }))
    .filter((point) => Number.isFinite(point.y) && point.y > 0);
}

function buildProjectionDatasets(calc, startPoint = null) {
  const scenarios = getInvestmentScenarios(calc.investmentType);

  const avgAnnual = calc.annualReturn;
  const lowAnnual = scenarios?.low ?? Math.max(avgAnnual - 0.03, 0);
  const highAnnual = scenarios?.high ?? avgAnnual + 0.03;

  const monthlyRateAvg = avgAnnual / 12;
  const monthlyRateLow = lowAnnual / 12;
  const monthlyRateHigh = highAnnual / 12;

  const totalMonths = Math.max(1, calc.years * 12);

  const avg = [];
  const low = [];
  const high = [];

  const startDate = startPoint ? new Date(startPoint.x) : new Date();
  let valueAvg = startPoint ? startPoint.y : 100;
  let valueLow = startPoint ? startPoint.y : 100;
  let valueHigh = startPoint ? startPoint.y : 100;

  for (let monthIndex = 0; monthIndex <= totalMonths; monthIndex += 1) {
    const pointDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + monthIndex,
      startDate.getDate()
    )
      .toISOString()
      .slice(0, 10);

    if (monthIndex > 0) {
      valueAvg *= (1 + monthlyRateAvg);
      valueLow *= (1 + monthlyRateLow);
      valueHigh *= (1 + monthlyRateHigh);
    }

    avg.push({ x: pointDate, y: valueAvg });
    low.push({ x: pointDate, y: valueLow });
    high.push({ x: pointDate, y: valueHigh });
  }

  return { avg, low, high };
}

function renderInvestmentChart({ historicalPoints, projectionPoints, lowPoints, highPoints, calc }) {
  if (!elements.investmentChartCanvas || typeof Chart === "undefined") {
    showGraphFallback("Chart library unavailable. The calculator still works normally.");
    return;
  }

  showGraphCanvas();

  const ctx = elements.investmentChartCanvas.getContext("2d");
  if (!ctx) {
    showGraphFallback("Chart canvas unavailable.");
    return;
  }

  const labels = [
    ...historicalPoints.map((p) => p.x),
    ...projectionPoints.map((p) => p.x)
  ];

  const historicalData = [...historicalPoints.map((p) => p.y), ...projectionPoints.map(() => null)];
  const lowData = [...historicalPoints.map(() => null), ...lowPoints.map((p) => p.y)];
  const highData = [...historicalPoints.map(() => null), ...highPoints.map((p) => p.y)];
  const avgData = [...historicalPoints.map(() => null), ...projectionPoints.map((p) => p.y)];

  const todayIndex = historicalPoints.length > 0 ? historicalPoints.length - 1 : null;
  const futureLastIndex = labels.length - 1;

  if (investmentChartInstance) {
    investmentChartInstance.destroy();
  }

  investmentChartInstance = new Chart(ctx, {
    type: "line",
    plugins: [todayMarkerPlugin],
    data: {
      labels,
      datasets: [
  {
    label: "Historical price",
    data: historicalData,
    borderColor: "#c9a861",
    backgroundColor: "rgba(201, 168, 97, 0.12)",
    borderWidth: 2.5,
    pointRadius: 0,
    tension: 0.28
  },
  {
    label: "Projected low",
    data: lowData,
    borderColor: "rgba(0,0,0,0)",
    backgroundColor: "rgba(0,0,0,0)",
    pointRadius: 0,
    tension: 0.22
  },
  {
    label: "Projected range",
    data: highData,
    borderColor: "rgba(0,0,0,0)",
    backgroundColor: "rgba(201, 168, 97, 0.14)",
    fill: "-1",
    pointRadius: 0,
    tension: 0.22
  },
  {
    label: "Projected price",
    data: avgData,
    borderColor: "#f3e1b0",
    backgroundColor: "rgba(243, 225, 176, 0.10)",
    borderWidth: 2.5,
    pointRadius(context) {
      const index = context.dataIndex;
      return index === futureLastIndex ? 4 : 0;
    },
    pointBackgroundColor: "#f3e1b0",
    pointBorderColor: "#1a140d",
    pointBorderWidth: 2,
    tension: 0.22
  }
]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: "#d7dbff",
            boxWidth: 10,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: "rgba(10, 12, 18, 0.96)",
          titleColor: "#ffffff",
          bodyColor: "#d7dbff",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          callbacks: {
            label(context) {
              const value = Number(context.parsed.y || 0);
              return `${context.dataset.label}: ${formatCurrency(value)}`;
            }
          }
        },
        todayMarkerPlugin: {
          todayIndex
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#98a2b3",
            maxTicksLimit: 8
          },
          grid: {
            color: "rgba(255,255,255,0.05)"
          }
        },
        y: {
          ticks: {
            color: "#98a2b3",
            callback(value) {
              return formatCompactCurrency(value);
            }
          },
          grid: {
            color: "rgba(255,255,255,0.05)"
          }
        }
      }
    }
  });

  if (elements.graphChip) {
    elements.graphChip.textContent = calc.investmentLabel;
  }
}

async function updateInvestmentGraph(calc, token) {
  if (!calc) return;

  if (!elements.investmentChartCanvas) return;

  if (typeof Chart === "undefined") {
    showGraphFallback("Chart library unavailable. The calculator still works normally.");
    return;
  }

  const meta = resolveGraphMeta(calc.investmentType);
  let projection = buildProjectionDatasets(calc);

  setGraphStatus("Updating graph…", false);

  if (!meta.historicalSupported || !meta.symbol) {
    setGraphNote(
  "No direct live market history exists for this option. Projection begins today using your selected assumptions. Calculator results assume you begin investing today."
);
    renderInvestmentChart({
      historicalPoints: [],
      projectionPoints: projection.avg,
      lowPoints: projection.low,
      highPoints: projection.high,
      calc
    });
    setGraphStatus("Projection only", false);
    return;
  }

  setGraphNote(
  `Historical price data uses ${meta.label}. Projection begins at today's market price and extends using your selected long-term return assumptions. Calculator results assume you begin investing today.`
);

  try {
    const historicalSeries = await fetchHistoricalSeries(meta.symbol);

    if (token !== graphUpdateToken) return;

const historicalPoints = buildHistoricalDataset(calc, historicalSeries);

const lastHistoricalPoint = historicalPoints.length
  ? historicalPoints[historicalPoints.length - 1]
  : null;

projection = buildProjectionDatasets(calc, lastHistoricalPoint);

renderInvestmentChart({
  historicalPoints,
  projectionPoints: projection.avg,
  lowPoints: projection.low,
  highPoints: projection.high,
  calc
});

    setGraphStatus(`Live market context loaded for ${meta.label}`, false);
  } catch (error) {
    if (!graphWarnedOnce) {
      console.warn("Historical graph data failed:", error);
      graphWarnedOnce = true;
    }

    renderInvestmentChart({
      historicalPoints: [],
      projectionPoints: projection.avg,
      lowPoints: projection.low,
      highPoints: projection.high,
      calc
    });

setGraphStatus("Historical data unavailable. Projection still shown.", true);
setGraphNote(
  "Live historical market data could not be loaded, so only the forward projection is being shown."
);
  }
}

init();