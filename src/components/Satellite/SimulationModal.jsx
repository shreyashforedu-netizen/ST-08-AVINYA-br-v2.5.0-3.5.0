import React, { useEffect } from 'react';
import Satellite3DViewer from './Satellite3DViewer';
import { getSatelliteModelSrc } from '../../utils/satelliteModels';

/**
 * SimulationModal
 * 
 * Expanded full-fidelity 3D spacecraft simulation view.
 * Utilizes the EXACT same Satellite3DViewer component without duplicating Three.js code,
 * providing comprehensive telemetry overlays, collision metrics (if applicable), and full orbit inspection.
 */
export default function SimulationModal({
  isOpen,
  satellite,
  collision,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !satellite) return null;

  const modelSrc = getSatelliteModelSrc(satellite);
  const name = satellite.name || 'Spacecraft';
  const id = satellite.id || satellite.noradId || 'UNKNOWN';
  const intlDes = satellite.intlDes || '—';
  const org = satellite.org || satellite.agency || 'NASA';
  const type = satellite.type || 'Scientific';

  const lat = satellite.isRealistic ? satellite.current?.[0] : satellite.lat;
  const lng = satellite.isRealistic ? satellite.current?.[1] : satellite.lng;
  const alt = satellite.isRealistic ? satellite.current?.[2] : (satellite.alt != null ? satellite.alt * 6371 : null);

  const formatNum = (val, dec = 2) => (val != null ? Number(val).toFixed(dec) : '—');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} 3D Spacecraft Simulation`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl animate-fade-in"
    >
      <div className="relative w-full max-w-5xl h-[85vh] max-h-[820px] rounded-3xl border border-white/15 bg-gradient-to-b from-[#0c1222]/95 to-[#060913]/95 shadow-[0_25px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        {/* Header HUD */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-white m-0">
                  {name}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  3D SIMULATION
                </span>
                {modelSrc ? (
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    REAL GLB MODEL
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    ORBITAL TELEMETRY VIEW
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                NORAD {id} · {intlDes} · OPERATOR: {org}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xl leading-none"
            aria-label="Close 3D simulation"
          >
            ✕
          </button>
        </div>

        {/* 3D Viewer Area */}
        <div className="relative flex-1 w-full min-h-0">
          <Satellite3DViewer
            modelSrc={modelSrc}
            name={name}
            autoRotate={true}
            interactive={true}
            showControlsHint={true}
            className="w-full h-full"
          />

          {/* Telemetry HUD Overlay in Top Left of Simulation */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-2 max-w-xs">
            <div className="px-3 py-2 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md text-[11px] font-mono text-white/80 space-y-1">
              <div className="text-[9px] uppercase tracking-wider text-violet-300 font-semibold">
                Live Flight Telemetry
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">LATITUDE</span>
                <span className="text-white">{formatNum(lat, 3)}°</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">LONGITUDE</span>
                <span className="text-white">{formatNum(lng, 3)}°</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">ALTITUDE</span>
                <span className="text-emerald-400">{formatNum(alt, 1)} km</span>
              </div>
              {satellite.inc != null && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">INCLINATION</span>
                  <span className="text-white">{formatNum(satellite.inc, 2)}°</span>
                </div>
              )}
            </div>

            {/* Collision Risk alert if active */}
            {collision && (
              <div className="px-3 py-2 rounded-xl border border-red-500/40 bg-red-950/60 backdrop-blur-md text-[11px] font-mono text-red-200 space-y-1">
                <div className="flex items-center gap-1.5 text-red-400 font-bold text-[10px]">
                  <span>⚠</span> CONJUNCTION ASSESSMENT
                </div>
                <div>Target: {collision.target}</div>
                <div>Probability: {(collision.probability * 100).toFixed(2)}%</div>
                <div>Approach: {collision.tca} ({collision.tcaIn})</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 border-t border-white/10 bg-[#040710]/80 text-[11px] font-mono text-gray-400">
          <div className="flex items-center gap-4">
            <span>TYPE: <strong className="text-gray-200">{type}</strong></span>
            {satellite.value && <span>ASSET: <strong className="text-gray-200">{satellite.value}</strong></span>}
            {satellite.orbit?.period_min && <span>PERIOD: <strong className="text-gray-200">{formatNum(satellite.orbit.period_min, 1)}m</strong></span>}
          </div>
          <div className="text-gray-500">
            Use Left-Click to Orbit · Scroll to Zoom · Right-Click to Pan
          </div>
        </div>
      </div>
    </div>
  );
}
