/**
 * Real spacecraft models available under public/models. Keep these URLs in
 * sync with the model assets in that directory.
 */
export const AVAILABLE_RANDOM_MODELS = [
  '/models/Active Cavity Irradiance Monitor Satellite (AcrimSAT) (A).glb',
  '/models/Apollo_Lunar_Module (1).glb',
  '/models/Cluster II.glb',
  '/models/Constellation-X.glb',
  '/models/Deep Space 1.glb',
  '/models/Deep Space Climate Observatory (DSCOVR) (Triana).glb',
  '/models/Firefly.glb',
];

const ACRIMSAT_MODEL = AVAILABLE_RANDOM_MODELS[0];
const APOLLO_MODEL = AVAILABLE_RANDOM_MODELS[1];
const MODEL_BY_FILE = new Set(AVAILABLE_RANDOM_MODELS);

// Explicit identity matches take precedence over the varied fallback pool.
export const NORAD_MODEL_MAPPING = {
  'APOLLO-LM': APOLLO_MODEL,
  '26032': ACRIMSAT_MODEL,
  'SAT-016': ACRIMSAT_MODEL,
};

const NAME_MODEL_MAPPING = {
  'APOLLO LUNAR MODULE': APOLLO_MODEL,
  'APOLLO 11 LUNAR MODULE': APOLLO_MODEL,
  'LUNAR MODULE': APOLLO_MODEL,
  'ACRIMSAT': ACRIMSAT_MODEL,
  'ACTIVE CAVITY IRRADIANCE MONITOR SATELLITE': ACRIMSAT_MODEL,
  'CLUSTER II': '/models/Cluster II.glb',
  'CONSTELLATION-X': '/models/Constellation-X.glb',
  'DEEP SPACE 1': '/models/Deep Space 1.glb',
  'DEEP SPACE CLIMATE OBSERVATORY': '/models/Deep Space Climate Observatory (DSCOVR) (Triana).glb',
  'DSCOVR': '/models/Deep Space Climate Observatory (DSCOVR) (Triana).glb',
  'TRIANA': '/models/Deep Space Climate Observatory (DSCOVR) (Triana).glb',
  'FIREFLY': '/models/Firefly.glb',
};

// Fallback allocations are unique until every available model is in use.
// The assignment is memoized for the page session, so reopening a satellite
// card does not change its spacecraft model.
const fallbackAssignments = new Map();
const claimedFallbackModels = new Set();

function getStringHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getStableIdentifier(satellite) {
  const identifier = satellite?.noradId ?? satellite?.id ?? satellite?.intlDes ?? satellite?.name;
  return identifier == null ? null : String(identifier).trim().toUpperCase();
}

function getFallbackModel(identifier) {
  const key = identifier || 'UNKNOWN';
  if (fallbackAssignments.has(key)) return fallbackAssignments.get(key);

  const firstChoice = getStringHash(key) % AVAILABLE_RANDOM_MODELS.length;
  let selectedModel = AVAILABLE_RANDOM_MODELS[firstChoice];

  // Prefer an unused asset, probing from a stable per-satellite starting point.
  // Once the pool is exhausted, reuse begins at that satellite's stable choice.
  if (claimedFallbackModels.size < AVAILABLE_RANDOM_MODELS.length) {
    for (let offset = 0; offset < AVAILABLE_RANDOM_MODELS.length; offset += 1) {
      const candidate = AVAILABLE_RANDOM_MODELS[(firstChoice + offset) % AVAILABLE_RANDOM_MODELS.length];
      if (!claimedFallbackModels.has(candidate)) {
        selectedModel = candidate;
        break;
      }
    }
  }

  fallbackAssignments.set(key, selectedModel);
  claimedFallbackModels.add(selectedModel);
  return selectedModel;
}

/** Return the exact matching asset where available, otherwise a varied GLB. */
export function getSatelliteModelSrc(satellite) {
  const identifier = getStableIdentifier(satellite);
  if (satellite?.modelSrc) return satellite.modelSrc;

  const id = satellite?.id == null ? null : String(satellite.id).trim().toUpperCase();
  const noradId = satellite?.noradId == null ? null : String(satellite.noradId).trim().toUpperCase();
  if (id && NORAD_MODEL_MAPPING[id]) return NORAD_MODEL_MAPPING[id];
  if (noradId && NORAD_MODEL_MAPPING[noradId]) return NORAD_MODEL_MAPPING[noradId];

  const intlDes = satellite?.intlDes == null ? '' : String(satellite.intlDes).trim().toUpperCase();
  if (intlDes === '1969-059C') return APOLLO_MODEL;
  if (intlDes === '1999-070B') return ACRIMSAT_MODEL;

  const name = satellite?.name == null ? '' : String(satellite.name).trim().toUpperCase();
  if (NAME_MODEL_MAPPING[name]) return NAME_MODEL_MAPPING[name];

  return getFallbackModel(identifier);
}

/** Register an explicit satellite identity to a bundled model URL. */
export function registerSatelliteModel(noradId, modelPath) {
  if (noradId && MODEL_BY_FILE.has(modelPath)) {
    NORAD_MODEL_MAPPING[String(noradId).trim().toUpperCase()] = modelPath;
  }
}
