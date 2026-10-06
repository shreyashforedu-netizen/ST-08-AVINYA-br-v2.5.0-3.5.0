// ─────────────────────────────────────────────────────────────────────────────
//  Hypothetical TCA Simulation – Vanguard 1 vs Hubble
//  A completely independent TCA viewer for the hypothetical collision scenario.
//  Uses the same UI layout, controls, and interaction patterns as the existing
//  TCASimulation, but is self-contained and does NOT touch existing TCA state.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import './tca-styles.css';
import { T_MAX, clampZoom, mmss, SPEED, norm, ZOOM_MIN, ZOOM_MAX, MONO, fmtDist } from "./constants";
import { drawHypothetical } from "./drawHypothetical";
import Controls from "./Controls";
import SimulationCanvas from "./SimulationCanvas";

// ── Hypothetical Event Data (hardcoded, completely separate from real events) ──
const HYPOTHETICAL_EVENT = {
  a: "VANGUARD 1",
  satA: "VANGUARD 1",
  idA: "SAT-001",
  b: "HUBBLE",
  satB: "HUBBLE",
  idB: "SAT-002",
  typeA: "Scientific",
  typeB: "Observation",
  tca: "2026-10-06 14:30:00",
  when: "HYPOTHETICAL",
  geometry: "Head-on collision",
  miss: 0,
  miss_km: 0,
  velA: 7.58,
  velB: 7.56,
  vel: 15.14,
  incA: 34.2,
  incB: 28.5,
  altA: 956,
  altB: 956,
  retroB: false,
  sigma_in_plane_km: 0,
  pc: 1.0,
  prob: 100,
  risk: "high",
  assumptions: "Hypothetical scenario — orbits forced to intersect at same altitude",
  reason: "This is a HYPOTHETICAL collision simulation. NOT real-world data.",
};

// ── Scene Builder (zero miss distance — satellites converge to same point) ──
function buildHypotheticalScene() {
  const ev = HYPOTHETICAL_EVENT;
  const azA = (-6 * Math.PI) / 180;
  const azB = ((- 6 + 28) * Math.PI) / 180;
  const incA_r = (ev.incA * Math.PI) / 180;
  const incB_r = (ev.incB * Math.PI) / 180;

  const dA = norm([
    Math.cos(azA) * Math.cos(incA_r),
    Math.sin(incA_r) * 0.55,
    Math.sin(azA) * Math.cos(incA_r),
  ]);

  const dB = norm([
    Math.cos(azB) * Math.cos(incB_r),
    Math.sin(incB_r) * 0.55,
    Math.sin(azB) * Math.cos(incB_r),
  ]);

  // Both TCA positions at the SAME point — zero miss distance = collision
  const cA = [0, 0, 0];
  const cB = [0, 0, 0];

  const maxVel = Math.max(ev.velA, ev.velB);
  const spdA = SPEED * (ev.velA / maxVel);
  const spdB = SPEED * (ev.velB / maxVel);
  const along = 50;

  return { dA, dB, cA, cB, aA: along * 0.85, aB: along * 1.1, spdA, spdB };
}

export default function HypotheticalTCASimulation() {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [t, setT] = useState(-T_MAX);
  const [playing, setPlaying] = useState(!reduce);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);

  const cvRef = useRef(null);
  const stageRef = useRef(null);
  const size = useRef({ W: 0, H: 0, dpr: 1 });
  const drag = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const view = useRef({
    yaw: 0.7, pitch: 0.55, t: -T_MAX, playing: !reduce, speed: 1,
    zoom: 1, zoomTarget: 1,
  });

  const setZoomTo = useCallback((z) => {
    const c = clampZoom(z);
    view.current.zoomTarget = c;
    setZoom(c);
  }, []);
  const zoomBy = useCallback((f) => setZoomTo(view.current.zoomTarget * f), [setZoomTo]);
  const resetView = () => {
    const v = view.current;
    v.yaw = 0.7; v.pitch = 0.55;
    setZoomTo(1);
  };

  const ev = HYPOTHETICAL_EVENT;
  const scene = useMemo(() => buildHypotheticalScene(), []);
  const sceneRef = useRef(scene);
  const evRef = useRef(ev);

  useEffect(() => {
    sceneRef.current = scene;
    evRef.current = ev;
    view.current.playing = playing;
    view.current.speed = speed;
  }, [scene, ev, playing, speed]);

  // Canvas sizing
  useEffect(() => {
    const cv = cvRef.current, stage = stageRef.current;
    if (!cv || !stage) return;
    const fit = () => {
      const r = stage.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      size.current = { W: r.width, H: r.height, dpr };
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Animation loop – uses drawHypothetical instead of the standard draw
  useEffect(() => {
    const ctx = cvRef.current?.getContext("2d");
    if (!ctx) return;
    let raf, last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const v = view.current;
      v.zoom += (v.zoomTarget - v.zoom) * Math.min(1, dt * 12);
      if (Math.abs(v.zoomTarget - v.zoom) < 0.0005) v.zoom = v.zoomTarget;
      if (v.playing) {
        v.t += dt * 0.35 * v.speed;
        if (v.t > T_MAX) v.t = -T_MAX;
        setT(v.t);
      }
      const { W, H, dpr } = size.current;
      drawHypothetical(ctx, W, H, dpr, v, sceneRef.current, evRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Wheel zoom
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      zoomBy(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  // Pointer interactions (drag / pinch)
  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(p.x - q.x, p.y - q.y) || 1, zoom: view.current.zoomTarget };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY };
    }
  };
  const onMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [p, q] = [...pointers.current.values()];
      setZoomTo((pinch.current.zoom * Math.hypot(p.x - q.x, p.y - q.y)) / pinch.current.d);
      return;
    }
    if (!drag.current) return;
    const v = view.current;
    v.yaw += (e.clientX - drag.current.x) * 0.006;
    v.pitch = Math.max(0.25, Math.min(1.1, v.pitch + (e.clientY - drag.current.y) * 0.004));
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      drag.current = { x: p.x, y: p.y };
    } else {
      drag.current = null;
    }
  };

  const onScrub = (e) => {
    const val = parseFloat(e.target.value);
    view.current.t = val;
    setT(val);
  };

  const sec = t * 60;
  const range = ev ? Math.hypot(ev.miss / 1000, ev.vel * Math.abs(sec)) : 0;

  let utcString = "";
  if (ev && ev.tca) {
    try {
      const tcaDate = new Date(ev.tca.replace(" ", "T") + "Z");
      const currentUtc = new Date(tcaDate.getTime() + sec * 1000);
      utcString = currentUtc.toISOString().replace("T", " ").substring(0, 19) + " UTC";
    } catch (_e) {
      utcString = ev.tca + " UTC";
    }
  }

  const [shapeMode, setShapeMode] = useState('ellipsoid');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    view.current.shapeMode = shapeMode;
  }, [shapeMode]);

  const toggleFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!document.fullscreenElement && !isFullscreen) {
      if (stage.requestFullscreen) {
        stage.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(true));
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => setIsFullscreen(false));
      } else {
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    const onKeyDown = (e) => {
      if (e.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => { });
        }
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  const controlsProps = {
    playing, setPlaying, t, onScrub, speed, setSpeed, sec, zoom, zoomBy, resetView, shapeMode, setShapeMode, isFullscreen, toggleFullscreen
  };

  return (
    <div className="cw">
      {/* ── Header with RED collision warning styling ── */}
      <header className="cw-head" style={{ background: 'linear-gradient(135deg, #450a0a 0%, #1a0505 100%)', borderBottom: '2px solid #dc2626' }}>
        <div className="cw-brand">
          <span className="cw-brand-mark" style={{ color: '#fca5a5', fontSize: '1.4em' }} aria-hidden="true">⚠️</span>
          <div>
            <span className="cw-eyebrow" style={{ color: '#fca5a5', letterSpacing: '2px' }}>HYPOTHETICAL TCA SIMULATION — NOT A REAL COLLISION</span>
            <h1 style={{ color: '#fef2f2' }}>Vanguard 1 vs Hubble — Collision Scenario</h1>
          </div>
        </div>
        <div className="cw-event-count" style={{ color: '#fca5a5' }}>
          <span className="cw-live-dot" aria-hidden="true" style={{ background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />
          <strong style={{ color: '#ef4444' }}>COLLISION</strong> scenario active
        </div>
      </header>

      <div className="cw-layout">
        {/* ── Sidebar: scenario info panel (replaces the event list sidebar) ── */}
        <aside className="cw-side">
          <div className="cw-side-heading" style={{ borderColor: '#dc262633' }}>
            <h2 style={{ color: '#fca5a5' }}>Collision Scenario</h2>
            <span style={{ color: '#ef4444' }}>HYPOTHETICAL</span>
          </div>

          {/* Scenario card */}
          <div
            className="cw-ev"
            aria-pressed="true"
            style={{ borderColor: '#dc262666', background: 'rgba(127,29,29,0.15)' }}
          >
            <div className="cw-pair" style={{ color: '#fca5a5' }}>
              VANGUARD 1 <i style={{ color: '#ef4444' }}>collides with</i> HUBBLE
            </div>
            <div className="cw-meta cw-meta-risk">
              <span className="cw-miss-distance">
                <span
                  className="cw-dot"
                  style={{ background: '#ef4444', boxShadow: '0 0 10px #ef4444' }}
                />
                <span style={{ color: '#ef4444', fontWeight: 700 }}>0 m</span>
                <span className="cw-miss-label">miss distance</span>
              </span>
              <span className="cw-risk-pill" style={{ '--risk-color': '#ef4444' }}>
                COLLISION
              </span>
            </div>
            <div className="cw-meta cw-meta-detail">
              <span style={{ color: '#fca5a5' }}>Hypothetical scenario</span>
              <span>Head-on collision</span>
            </div>
          </div>

          {/* Warning box */}
          <div style={{
            margin: '16px 12px', padding: '12px', borderRadius: '8px',
            background: 'rgba(127,29,29,0.2)', border: '1px solid rgba(220,38,38,0.3)',
            color: '#fca5a5', fontSize: '11px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            lineHeight: 1.5
          }}>
            <div style={{ fontWeight: 700, marginBottom: '6px', color: '#ef4444', fontSize: '12px' }}>
              ⚠ DISCLAIMER
            </div>
            This simulation is a <strong style={{ color: '#fff' }}>hypothetical scenario</strong> created
            for demonstration purposes only. It does <strong style={{ color: '#fff' }}>NOT</strong> represent
            real-world collision data, predictions, or orbital mechanics calculations.
            <div style={{ marginTop: '8px', color: '#ef444488' }}>
              Collision probability forced to 100% for visualization.
            </div>
          </div>
        </aside>

        {/* ── Main simulation area ── */}
        <main className="cw-main">
          <SimulationCanvas
            stageRef={stageRef}
            cvRef={cvRef}
            onDown={onDown}
            onMove={onMove}
            onUp={onUp}
            isFullscreen={isFullscreen}
            toggleFullscreen={toggleFullscreen}
            controlsProps={controlsProps}
          />

          <Controls {...controlsProps} />
          <p className="cw-hint">Drag to rotate. Scroll or pinch to zoom.</p>

          {/* T-minus / T-plus countdown */}
          <div style={{
            textAlign: 'center', margin: '24px 0 16px 0', padding: '12px',
            background: 'rgba(127,29,29,0.15)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
             <div style={{
               color: '#ef4444', fontSize: '2.5rem', fontWeight: 'bold',
               fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
               letterSpacing: '2px', textShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
             }}>
                 {t <= 0 ? `T-MINUS ${mmss(sec)}` : `T-PLUS ${mmss(sec)}`}
             </div>
             <div style={{
               color: '#94a3b8', fontSize: '1.1rem',
               fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
               marginTop: '6px', letterSpacing: '1px'
             }}>
                 {utcString}
             </div>
             {Math.abs(t) < 0.15 && (
               <div style={{
                 marginTop: '8px', color: '#ef4444', fontWeight: 'bold', fontSize: '1.3rem',
                 animation: 'mc-pulse 0.5s ease-in-out infinite',
                 textShadow: '0 0 20px rgba(239,68,68,0.6)'
               }}>
                 💥 COLLISION IN PROGRESS
               </div>
             )}
          </div>

          {/* Stats panel – matching the existing Stats component layout */}
          <div className="cw-objs">
            <div className="cw-a" style={{ borderColor: '#f9731666' }}>
              <b style={{ color: '#f97316' }}>SAT A&nbsp; VANGUARD 1</b>
              <small>Scientific, {ev.altA} km alt, {ev.incA.toFixed(1)}° inc, {ev.velA.toFixed(2)} km/s</small>
            </div>
            <div className="cw-b" style={{ borderColor: '#ef444466' }}>
              <b style={{ color: '#ef4444' }}>SAT B&nbsp; HUBBLE</b>
              <small>Observation, {ev.altB} km alt, {ev.incB.toFixed(1)}° inc, {ev.velB.toFixed(2)} km/s</small>
            </div>
          </div>

          <dl className="cw-stats">
            <div><dt>Encounter geometry</dt><dd className="cw-small">{ev.geometry}</dd></div>
            <div><dt>Miss distance</dt><dd style={{ color: '#ef4444', fontWeight: 700 }}>{fmtDist(ev.miss)}</dd></div>
            <div><dt>Time to closest approach</dt><dd>{t < 0 ? mmss(sec) : "Passed"}</dd></div>
            <div><dt>Closest approach (UTC)</dt><dd className="cw-small">{ev.tca}</dd></div>
            <div>
              <dt>Current range</dt>
              <dd>{range < 1 ? Math.round(range * 1000) + " m" : range.toFixed(range < 100 ? 1 : 0) + " km"}</dd>
            </div>
            <div><dt>Relative closing speed</dt><dd>{ev.vel.toFixed(1)} km/s</dd></div>
            <div><dt>SAT A velocity</dt><dd>{ev.velA.toFixed(2)} km/s</dd></div>
            <div><dt>SAT B velocity</dt><dd>{ev.velB.toFixed(2)} km/s</dd></div>
            <div><dt>Altitude separation</dt><dd>{ev.altB - ev.altA} km</dd></div>
            <div><dt>Collision probability</dt>
              <dd style={{ color: '#ef4444', fontWeight: 700 }}>
                1.0 × 10<sup>0</sup> (100%)
              </dd>
            </div>
            <div>
              <dt>Assessment</dt>
              <dd className="cw-small">
                <span className="cw-dot" style={{ background: '#ef4444' }} />
                <span style={{ color: '#ef4444' }}>HYPOTHETICAL COLLISION</span>
              </dd>
            </div>
            <div>
              <dt>Scenario type</dt>
              <dd className="cw-small" style={{ color: '#fca5a5' }}>Hypothetical — not real-world data</dd>
            </div>
          </dl>
        </main>
      </div>
    </div>
  );
}
