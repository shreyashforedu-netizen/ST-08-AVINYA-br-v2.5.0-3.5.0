// ─────────────────────────────────────────────────────────────────────────────
//  TCA Simulation – Constants & Scene Builder
//  Realistic orbital physics:
//    • Individual absolute velocities per satellite (km/s)
//    • Orbital inclination (degrees) – tracks are properly inclined in 3D
//    • Opposing / retrograde directions (retroB flag)
//    • Altitude separation between SAT A and SAT B
//    • Satellites NEVER pass through each other (miss distance always enforced)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * velA / velB  – absolute orbital speeds (km/s) for each satellite
 * incA / incB  – orbital inclination (degrees)
 * retroB       – true → SAT B travels in the OPPOSITE direction
 * altA / altB  – individual perigee altitude (km)
 * vel          – closing (relative) speed at TCA for display
 */
import importedEvents from '../../src/data/tca_events.json';

export const EVENTS = importedEvents.length > 0 ? importedEvents : [];

export const RISK = {
  high:  { label: "Action advised", color: "#ef4444" },
  watch: { label: "Monitor",        color: "#f97316" },
  low:   { label: "No action",      color: "#10b981" },
};

export const SPEED    = 80;   // base scene units / minute (visual scale)
export const T_MAX    = 3.0;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 4;
export const clampZoom = (z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
export const MONO = "ui-monospace, Menlo, Consolas, monospace";

// ── Math helpers ──────────────────────────────────────────────────────────────
export const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : [1, 0, 0];
};
export const fmtDist = (m) => (m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(2) + " km");
export const mmss = (sec) => {
  sec = Math.round(Math.abs(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
};

/**
 * 3-D world position of a satellite:
 *   c   = TCA position (world coords)
 *   d   = unit direction vector (3-D, includes Y for inclination)
 *   spd = per-satellite speed scalar
 *   t   = time offset in minutes from TCA (negative = before TCA)
 */
export const posV = (c, d, spd, t) => [
  c[0] + d[0] * spd * t,
  c[1] + d[1] * spd * t,
  c[2] + d[2] * spd * t,
];


// ── Scene builder ─────────────────────────────────────────────────────────────
/**
 * Builds the 3-D scene geometry for event index `i`.
 *
 * Physics rules enforced
 * ─────────────────────
 * 1. Each satellite gets a 3-D direction vector derived from its REAL orbital
 *    inclination and azimuth, including a Y (vertical) component.
 *
 * 2. Retrograde satellites have their X-Z direction sign flipped, so they
 *    visually travel in the opposite horizontal direction.
 *
 * 3. TCA positions are separated by the miss-distance vector which is
 *    PERPENDICULAR to the relative velocity, ensuring the satellites are
 *    never co-located at t = 0 and diverge for |t| > 0.
 *
 * 4. Visual speed ratio matches the real velA / velB ratio.
 */
export function buildScene(i) {
  const ev = EVENTS[i];

  // Base azimuths for each event (degrees) – gives crossing geometry
  const baseAz  = [-4, -8,  2, -2, -6, 0][i];
  const crossAng = [14, 22, 11, 28, 17, 34][i]; // angle between the two tracks

  const azA = ( baseAz          * Math.PI) / 180;
  const azB = ((baseAz + crossAng) * Math.PI) / 180;

  const incA_r = (ev.incA * Math.PI) / 180;
  const incB_r = (ev.incB * Math.PI) / 180;

  // 3-D direction for SAT A (inclination lifts track in Y)
  const dA = norm([
    Math.cos(azA) * Math.cos(incA_r),
    Math.sin(incA_r) * 0.55,            // Y – scaled for visual clarity
    Math.sin(azA) * Math.cos(incA_r),
  ]);

  // 3-D direction for SAT B (retrograde flips horizontal component)
  const rs = ev.retroB ? -1 : 1;
  const dB = norm([
    rs * Math.cos(azB) * Math.cos(incB_r),
    Math.sin(incB_r) * 0.55,
    rs * Math.sin(azB) * Math.cos(incB_r),
  ]);

  // ── Miss-distance geometry ────────────────────────────────────────────────
  // Relative velocity direction at TCA
  const velRatio = ev.velA / ev.velB;
  const relVel = norm([
    dA[0] - dB[0] / velRatio,
    dA[1] - dB[1] / velRatio,
    dA[2] - dB[2] / velRatio,
  ]);

  // Miss vector = perpendicular to relVel in the X-Z plane
  let n = norm([-relVel[2], 0, relVel[0]]);
  if (n[0] * Math.cos(0.7) + n[2] * Math.sin(0.7) < 0) n = [-n[0], 0, -n[2]];

  // Visual gap (schematic – scaled to miss distance in km)
  const missKm = (ev.miss || 1000) / 1000;
  const gap = Math.min(28 + missKm * 0.65, 125);

  // Altitude difference adds a tiny Y offset between TCA points
  const altDiffY = (ev.altB - ev.altA) * 0.04;

  const cA = [-n[0] * gap * 0.9, -gap * 0.4,             -n[2] * gap * 0.9];
  const cB = [ n[0] * gap * 0.9,  gap * 0.4 + altDiffY,   n[2] * gap * 0.9];

  // Per-satellite speed scalars preserving real velocity ratio
  const maxVel = Math.max(ev.velA, ev.velB);
  const spdA = SPEED * (ev.velA / maxVel);
  const spdB = SPEED * (ev.velB / maxVel);

  const along = Math.min(26 + ((ev.sigma_in_plane_km || 0.5)) * 8.0, 75);

  return { dA, dB, cA, cB, aA: along * 0.85, aB: along * 1.1, spdA, spdB };
}
