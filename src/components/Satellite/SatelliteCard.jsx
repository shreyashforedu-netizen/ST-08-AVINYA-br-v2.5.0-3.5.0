import React, { useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import Satellite3DViewer from './Satellite3DViewer';
import { getSatelliteModelSrc } from '../../utils/satelliteModels';

/* ====================== GLASS + ANIMATION STYLES ====================== */
const GlassStyles = () => (
  <style>{`
    :root {
      --f-display: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
      --f-text: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
      --f-mono: "SF Mono", ui-monospace, "JetBrains Mono", Menlo, monospace;
    }
    .sat-lg {
      position: relative; border-radius: 24px;
      background: linear-gradient(180deg, rgba(20,24,36,.88), rgba(10,12,20,.84));
      -webkit-backdrop-filter: blur(40px) saturate(150%);
      backdrop-filter: blur(40px) saturate(150%);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.14),
        inset 0 -14px 28px rgba(0,0,0,.35),
        0 1px 2px rgba(0,0,0,.4),
        0 28px 56px -16px rgba(0,0,0,.7);
    }
    .sat-lg::before {
      content:""; position:absolute; inset:0; border-radius:inherit; padding:1px; pointer-events:none;
      background: linear-gradient(180deg, rgba(255,255,255,.24), rgba(255,255,255,.04) 60%, rgba(255,255,255,.07));
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude;
    }
    .sat-sq { border-radius: 16px; }
    .sat-stat {
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.025));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.07);
      padding: 10px 12px;
    }
    .sat-ai { position: relative; isolation: isolate; }
    .sat-ai::before {
      content:""; position:absolute; inset:-12px; z-index:-1; border-radius:26px; filter: blur(14px);
      background: radial-gradient(60% 80% at 50% 50%, rgba(10,210,235,.20), rgba(10,210,235,.05) 60%, transparent 78%);
      animation: sat-aura 6s ease-in-out infinite;
    }
    .sat-shimmer {
      background: linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.14) 50%, rgba(255,255,255,.05) 75%);
      background-size: 200% 100%;
      animation: sat-shimmer 1.6s linear infinite;
    }
    .sat-stage { perspective: 520px; }
    .sat-body { transform-style: preserve-3d; animation: sat-spin 14s linear infinite; }
    .sat-orbit-ring { animation: sat-orbit 14s linear infinite; transform-origin: 50% 50%; }
    .sat-twinkle { animation: sat-twinkle 4s ease-in-out infinite; }

    @keyframes sat-spin { from { transform: rotateX(-14deg) rotateY(0deg); } to { transform: rotateX(-14deg) rotateY(360deg); } }
    @keyframes sat-orbit { to { transform: rotate(360deg); } }
    @keyframes sat-twinkle { 0%,100% { opacity:.25 } 50% { opacity:.9 } }
    @keyframes sat-aura { 0%,100% { opacity:.7; transform:scale(1) } 50% { opacity:1; transform:scale(1.03) } }
    @keyframes sat-shimmer { to { background-position: -200% 0 } }
    @media (prefers-reduced-motion: reduce) {
      .sat-body,.sat-orbit-ring,.sat-twinkle,.sat-ai::before,.sat-shimmer { animation: none; }
    }
  `}</style>
);

/* ========================= SATELLITE SPINNER FALLBACK ========================= */
function SatelliteSpin() {
  const stars = [[12,18],[30,70],[52,12],[74,80],[88,26],[64,44],[20,48],[92,64],[44,86],[6,86]];
  return (
    <div className="relative h-full w-full overflow-hidden"
         style={{ background: 'radial-gradient(70% 90% at 50% 120%, rgba(40,110,190,.45), rgba(10,20,40,.0) 60%), #060810' }}>
      {stars.map(([x, y], i) => (
        <span key={i} className="sat-twinkle absolute h-[2px] w-[2px] rounded-full bg-white"
              style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.37}s` }} />
      ))}
      <div className="absolute -bottom-[210px] left-1/2 h-[260px] w-[560px] -translate-x-1/2 rounded-[50%]"
           style={{
             background: 'radial-gradient(closest-side, #0b1d38 78%, rgba(90,170,255,.55) 92%, transparent 100%)',
             boxShadow: '0 -8px 40px rgba(80,160,255,.25)'
           }} />
      <div className="sat-stage absolute inset-0 flex items-center justify-center">
        <svg className="sat-orbit-ring absolute h-[140px] w-[240px] opacity-40" viewBox="0 0 260 150" fill="none" aria-hidden="true">
          <ellipse cx="130" cy="75" rx="118" ry="30" stroke="white" strokeOpacity=".35" strokeDasharray="2 5" />
        </svg>
        <svg className="sat-body" width="130" height="74" viewBox="0 0 150 86"
             role="img" aria-label="Orbital satellite visualization"
             style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.55))' }}>
          <defs>
            <linearGradient id="sc-panel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3b6fd0" /><stop offset="1" stopColor="#16306b" />
            </linearGradient>
            <linearGradient id="sc-foil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f2d58a" /><stop offset="1" stopColor="#a97d2c" />
            </linearGradient>
            <pattern id="sc-grid" width="9" height="9" patternUnits="userSpaceOnUse">
              <path d="M9 0H0V9" stroke="rgba(255,255,255,.28)" strokeWidth=".6" fill="none" />
            </pattern>
          </defs>
          {[2, 98].map((x) => (
            <g key={x}>
              <rect x={x} y="22" width="50" height="42" rx="2" fill="url(#sc-panel)" />
              <rect x={x} y="22" width="50" height="42" rx="2" fill="url(#sc-grid)" stroke="rgba(255,255,255,.35)" strokeWidth=".8" />
            </g>
          ))}
          <rect x="52" y="41" width="46" height="3" fill="#8b93a3" />
          <rect x="56" y="24" width="38" height="38" rx="5" fill="url(#sc-foil)" stroke="rgba(255,255,255,.4)" strokeWidth=".8" />
          <rect x="62" y="30" width="26" height="8" rx="2" fill="rgba(0,0,0,.28)" />
          <circle cx="75" cy="51" r="4.5" fill="#12151c" stroke="#cfd4de" strokeWidth="1" />
          <path d="M75 24V12" stroke="#cfd4de" strokeWidth="1.4" />
          <path d="M65 12a10 5 0 0 1 20 0z" fill="#e4e8f0" />
        </svg>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-[inherit]"
           style={{ boxShadow: 'inset 0 2px 14px rgba(0,0,0,.55)' }} />
    </div>
  );
}

/* ========================= STAT TILE ========================= */
const Stat = ({ label, value, unit }) => (
  <div className="bg-white/5 rounded-2xl p-3">
    <div className="text-xs text-white/50 tracking-wider uppercase font-semibold" style={{ fontFamily: 'var(--f-text)' }}>{label}</div>
    <div className="mt-1 flex items-baseline gap-1">
      <span className="text-lg font-bold leading-none tracking-tight text-white tabular-nums" style={{ fontFamily: 'var(--f-mono)' }}>
        {value != null ? value : '—'}
      </span>
      {unit && <span className="text-xs text-white/50" style={{ fontFamily: 'var(--f-mono)' }}>{unit}</span>}
    </div>
  </div>
);

/* ===================== MISSION SUMMARY FALLBACK ====================== */
function getDefaultMissionSummary(name = '') {
  const n = name.toUpperCase();
  if (n.includes('VANGUARD'))   return 'Vanguard 1 was the second US satellite placed in orbit and remains the oldest human-made object still in space. It demonstrated solar cell power and geodetic measurements.';
  if (n.includes('APOLLO') || n.includes('LUNAR')) return 'The Apollo Lunar Module was the two-stage spacecraft designed for landing and returning astronauts from the lunar surface during the Apollo program.';
  if (n.includes('ACRIMSAT'))   return 'AcrimSAT monitored Total Solar Irradiance from low Earth orbit for over 14 years, contributing critical data to solar variability and global climate studies.';
  if (n.includes('HUBBLE'))     return 'The Hubble Space Telescope is a NASA/ESA astrophysics observatory studying deep space, planetary systems, and distant star formation.';
  if (n.includes('ISS') || n.includes('ZARYA')) return 'The International Space Station is a microgravity laboratory and space research facility in low Earth orbit with international crew residency.';
  if (n.includes('CHANDRA'))    return 'The Chandra X-ray Observatory detects X-ray emission from very hot regions of the Universe, including exploded stars, galaxy clusters, and matter around black holes.';
  if (n.includes('DEEP SPACE')) return 'Deep Space 1 was a NASA technology demonstration mission using ion propulsion and autonomous navigation to encounter asteroid Braille and comet Borrelly.';
  if (n.includes('FIREFLY'))    return 'Firefly is a small satellite mission designed to study transient luminous events and lightning-induced effects in the upper atmosphere.';
  return `${name} is an Earth-orbiting spacecraft conducting scientific observation and remote sensing operations in support of space research objectives.`;
}

/* ========================= SATELLITE CARD ========================= */
export default function SatelliteCard({
  satellite,
  collision,
  onClose,
  onSimulationClick,
  onTcaViewClick,
  summarize,
}) {
  const [text, setText] = useState(null);
  const [err, setErr]   = useState(false);

  const sat = satellite;

  useEffect(() => {
    if (!sat) return;
    setText(null);
    setErr(false);
    const name    = sat.name    || 'Spacecraft';
    const noradId = sat.id ?? sat.noradId ?? null;

    if (typeof summarize === 'function') {
      let active = true;
      summarize({ name, noradId })
        .then(s  => { if (active) setText(s); })
        .catch(() => { if (active) setErr(true); });
      return () => { active = false; };
    }

    setText(getDefaultMissionSummary(name));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sat?.id ?? sat?.name, summarize]);

  if (!sat) return null;

  /* ---- data extraction ---- */
  const isRealistic = !!sat.isRealistic;
  const name    = sat.name    || 'Spacecraft';
  const id      = sat.id      ?? sat.noradId ?? '—';
  const intlDes = sat.intlDes ?? null;
  const org     = sat.org     ?? sat.agency  ?? null;
  const type    = sat.type    ?? null;
  const value   = sat.value   ?? null;

  const lat = isRealistic ? sat.current?.[0] : sat.lat;
  const lng = isRealistic ? sat.current?.[1] : sat.lng;
  const alt = isRealistic ? sat.current?.[2] : (sat.alt != null ? sat.alt * 6371 : null);

  const inc     = isRealistic ? null : sat.inc;
  const raan    = isRealistic ? null : sat.raan;
  const displayPeriod  = isRealistic ? sat.orbit?.period_min  : (sat.period ?? null);
  const displayPerigee = isRealistic ? sat.orbit?.perigee_km  : null;
  const displayApogee  = isRealistic ? sat.orbit?.apogee_km   : null;

  const modelSrc  = getSatelliteModelSrc(sat);
  const formatNum = (v, d = 2) => v != null ? Number(v).toFixed(d) : '—';

  return (
    <>
      <GlassStyles />
      <Rnd
        default={{
          x: 24,
          y: 90,
          width: 384,
          height: 'auto',
        }}
        minWidth={320}
        bounds="window"
        dragHandleClassName="drag-handle"
        style={{ zIndex: 50 }}
      >
        <section
          className="relative rounded-[24px] z-40 text-slate-200 pointer-events-auto overflow-hidden w-full h-full bg-slate-950/40 backdrop-blur-3xl saturate-150 border border-t-white/20 border-x-white/10 border-b-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)]"
          aria-label={`${name} satellite telemetry`}
        >
          {/* ── HEADER ── */}
          <div className="cursor-move drag-handle flex items-start justify-between px-4 pt-4 pb-3 border-b border-white/[0.08]">
            <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold tracking-wide text-white m-0 truncate"
                  style={{ fontFamily: 'var(--f-display)' }}>
                {name}
              </h2>
              {modelSrc && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
                  3D GLB
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono uppercase tracking-wider">
              NORAD {id}
            </p>
            {!isRealistic && intlDes && (
              <p className="text-[9px] text-gray-500 mt-0.5 font-mono">{intlDes}</p>
            )}
          </div>
          {onClose && (
            <button
              className="ml-2 mt-0.5 w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-gray-400 hover:text-white text-base cursor-pointer transition-colors shrink-0"
              onClick={onClose}
              aria-label="Close satellite card"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="overflow-y-auto max-h-[calc(100vh-160px)] px-4 pb-4" style={{ scrollbarWidth: 'none' }}>

          {/* Spacecraft Visual */}
          <div className="relative w-full h-[175px] rounded-2xl overflow-hidden my-3 bg-black/50 border border-white/[0.07]">
            {modelSrc ? (
              <Satellite3DViewer
                modelSrc={modelSrc}
                name={name}
                autoRotate={true}
                interactive={true}
                onExpand={onSimulationClick}
              />
            ) : (
              <SatelliteSpin />
            )}
          </div>

          {/* FIXED CAUTION CARD LOGIC */}
          {collision && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 mt-4 mb-2 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              <h3 className="text-red-400 font-bold text-[11px] mb-2 tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                COLLISION RISK DETECTED
              </h3>
              <div className="text-[10px] space-y-1.5 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-red-400/70">Target Object:</span>
                  <span className="text-red-200">{collision.targetObjectName || collision.targetId || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-400/70">Closest Approach:</span>
                  <span className="text-red-200">{collision.tca || collision.closestApproach || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-400/70">Probability:</span>
                  <span className="text-red-200">
                    {collision.pc !== undefined ? (
                      <>
                        {Number(collision.pc).toExponential(1).split("e")[0]} &times; 10
                        <sup>{Number(collision.pc).toExponential(1).split("e")[1].replace("-", "−")}</sup>
                      </>
                    ) : collision.probability || 'Unknown'}
                  </span>
                </div>
                {collision.reason && (
                  <div className="mt-2 text-red-300/90 text-[9px] leading-relaxed border-t border-red-500/20 pt-2">
                    <span className="text-red-400/70 block mb-0.5">Reason:</span>
                    {collision.reason}
                  </div>
                )}
                {collision.assumptions && (
                  <div className="mt-1 text-red-300/70 text-[8px] leading-relaxed">
                    <span className="text-red-400/70 block mb-0.5">Assumptions:</span>
                    {collision.assumptions}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onTcaViewClick}
                className="mt-3 w-full rounded-xl bg-red-600/25 hover:bg-red-600/40 text-red-200 hover:text-white px-3 py-2.5 text-[12px] font-mono tracking-wider font-semibold border border-red-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98] backdrop-blur-md"
              >
                ENTER TCA VIEW
              </button>
            </div>
          )}

          {/* CURRENT POSITION */}
          <div className="mb-3">
            <div className="text-[9px] text-violet-400 font-semibold uppercase tracking-widest mb-2"
                 style={{ fontFamily: 'var(--f-text)' }}>
              Current Position
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Latitude"  value={formatNum(lat, 3)} unit="°" />
              <Stat label="Longitude" value={formatNum(lng, 3)} unit="°" />
              <div className="col-span-2">
                <Stat label="Altitude" value={formatNum(alt, 1)} unit="km" />
              </div>
            </div>
          </div>

          {/* ORBITAL PARAMETERS */}
          <div className="mb-3">
            <div className="text-[9px] text-violet-400 font-semibold uppercase tracking-widest mb-2"
                 style={{ fontFamily: 'var(--f-text)' }}>
              Orbital Parameters
            </div>
            <div className="grid grid-cols-2 gap-2">
              {inc              != null && <Stat label="Inclination" value={formatNum(inc, 2)}            unit="°"   />}
              {raan             != null && <Stat label="RAAN"        value={formatNum(raan, 2)}           unit="°"   />}
              {displayPeriod    != null && <Stat label="Period"      value={formatNum(displayPeriod, 1)}  unit="min" />}
              {displayPerigee   != null && <Stat label="Perigee"     value={formatNum(displayPerigee, 1)} unit="km"  />}
              {displayApogee    != null && <Stat label="Apogee"      value={formatNum(displayApogee, 1)}  unit="km"  />}
              {!isRealistic && org   && <Stat label="Operator"    value={org}   />}
              {!isRealistic && type  && <Stat label="Type"        value={type}  />}
              {!isRealistic && value && <Stat label="Asset Value" value={value} />}
            </div>
          </div>

          {/* MISSION INTELLIGENCE */}
          <div className="sat-ai mt-3.5">
            <div className="sat-sq bg-[rgba(8,24,38,.55)] px-3.5 py-3 backdrop-blur-xl ring-1 ring-inset ring-cyan-500/20">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-cyan-200/90 tracking-wider uppercase"
                   style={{ fontFamily: 'var(--f-text)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10 5.4-.6 9.4-4.6 10-10Z" />
                </svg>
                Mission Intelligence
              </div>
              {err ? (
                <p className="text-[12px] leading-relaxed text-white/60 m-0" style={{ fontFamily: 'var(--f-text)' }}>
                  Summary unavailable right now.
                </p>
              ) : text ? (
                <p className="text-[12px] leading-relaxed text-white/85 m-0" style={{ fontFamily: 'var(--f-text)' }}>
                  {text}
                </p>
              ) : (
                <div className="space-y-1.5 py-1" aria-busy="true">
                  {['100%', '90%', '65%'].map(w => (
                    <div key={w} className="sat-shimmer h-2 rounded-full" style={{ width: w }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* VIEW 3D SIMULATION BUTTON */}
          {onSimulationClick && (
            <button
              type="button"
              onClick={onSimulationClick}
              className="mt-3 w-full rounded-xl bg-violet-600/25 hover:bg-violet-600/40 text-violet-200 hover:text-white px-3 py-2.5 text-[12px] font-mono tracking-wider font-semibold border border-violet-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98]"
            >
              <svg className="w-4 h-4 text-violet-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7" />
              </svg>
              VIEW 3D SIMULATION
            </button>
          )}


        </div>
        </section>
      </Rnd>
    </>
  );
}



