export const SETTINGS_KEYS = {
  MAP_MODE: "fieldPractice.defaultMapMode",
  GEOLOGY_LAYERS: "fieldPractice.defaultGeologyLayers",
};

export const DEFAULT_GEOLOGY_LAYERS = {
  lithology: false,
  stratigraphy: false,
  fault: false,
};

const SUPPORTED_MAP_MODES = new Set(["standard", "satellite"]);
const TEMPORARY_SESSION_PREFIXES = [
  "field-practice-analysis-flow-",
  "field-practice-ai-analysis-result-",
];

export function getDefaultMapMode() {
  try {
    const value = window.localStorage.getItem(SETTINGS_KEYS.MAP_MODE);
    return SUPPORTED_MAP_MODES.has(value) ? value : "standard";
  } catch {
    return "standard";
  }
}

export function setDefaultMapMode(mode) {
  if (!SUPPORTED_MAP_MODES.has(mode)) return false;
  try {
    window.localStorage.setItem(SETTINGS_KEYS.MAP_MODE, mode);
    return true;
  } catch {
    return false;
  }
}

export function getDefaultGeologyLayers() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEYS.GEOLOGY_LAYERS));
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
      return { ...DEFAULT_GEOLOGY_LAYERS };
    }
    return Object.fromEntries(Object.keys(DEFAULT_GEOLOGY_LAYERS).map((key) => (
      [key, typeof stored[key] === "boolean" ? stored[key] : DEFAULT_GEOLOGY_LAYERS[key]]
    )));
  } catch {
    return { ...DEFAULT_GEOLOGY_LAYERS };
  }
}

export function setDefaultGeologyLayers(value) {
  const normalized = Object.fromEntries(Object.keys(DEFAULT_GEOLOGY_LAYERS).map((key) => (
    [key, Boolean(value?.[key])]
  )));
  try {
    window.localStorage.setItem(SETTINGS_KEYS.GEOLOGY_LAYERS, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function clearKnownLocalCaches() {
  const keysToRemove = [];
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (key && TEMPORARY_SESSION_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  return keysToRemove;
}
