import React, { useState, useMemo } from 'react';
import * as Cesium from 'cesium';
import satData from '../../data/satellites.json';
import realisticSatData from '../../../orbital-engine/output/satellites.json';
import EngineCesium from './EngineCesium';
import SatelliteCard from '../Satellite/SatelliteCard';
import SimulationModal from '../Satellite/SimulationModal';
import Navbar from '../Controls/Navbar';
import { calculatePosition } from '../../utils/satelliteHelpers';
import TCASimulation from '../../../TCA/simulation/TCASimulation';
import HypotheticalTCASimulation from '../../../TCA/simulation/HypotheticalTCASimulation';

const EARTH_RADIUS = 6371000;

export default function GlobeView() {
  const [selectedSatId, setSelectedSatId] = useState(null);
  const [hoveredSatId, setHoveredSatId] = useState(null);
  const [simulationSat, setSimulationSat] = useState(null);
  const [dataMode, setDataMode] = useState('normal'); // 'normal' or 'realistic' or 'tca'
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [cesiumLoading, setCesiumLoading] = useState(false);

  React.useEffect(() => {
    const onResize = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Pre-calculate satellite positions and full orbit paths
  const processedSatData = useMemo(() => {
    if (dataMode === 'realistic') {
      return realisticSatData.map(sat => {
        const currentPos = Cesium.Cartesian3 ? Cesium.Cartesian3.fromDegrees(sat.current[1], sat.current[0], sat.current[2] * 1000) : null;
        const pathCoords = Cesium.Cartesian3 ? sat.orbit.points.map(p => Cesium.Cartesian3.fromDegrees(p[1], p[0], p[2] * 1000)) : [];
        // Note: react-globe.gl uses normalized alt (alt / earth radius), so if alt is in km, we convert to alt/6371 to match normal mode's 'alt' scale, OR wait, in normal mode 'alt' is e.g. 0.08. 
        // Actually, realistic alt is ~400km, so 400 / 6371000? No, normal alt is 0.08 which means 0.08 Earth radii.
        // So realistic alt in km divided by 6378.135 km. Let's use 6371 to be consistent with EARTH_RADIUS.

        return {
          ...sat,
          lat: sat.current[0],
          lng: sat.current[1],
          alt: sat.current[2] / 6371.0, // Normalized altitude for Three.js
          currentPos: currentPos,
          pathCoords: pathCoords,
          rawPathPoints: sat.orbit.points.map(p => ({ lat: p[0], lng: p[1], alt: p[2] / 6371.0 })),
          isRealistic: true
        };
      });
    }

    // Normal mode
    return satData.map(sat => {
      let alt = sat.alt;
      // Force Vanguard to have the same altitude as Hubble so their orbits intersect
      if (sat.id === 'SAT-001') {
        alt = 0.15;
      }
      
      // Current position of the satellite
      const pos = calculatePosition(sat.inc, sat.raan, sat.theta);
      let satPosition;
      try {
        satPosition = Cesium.Cartesian3.fromDegrees(pos.lng, pos.lat, alt * EARTH_RADIUS);
        // eslint-disable-next-line no-unused-vars
      } catch (_e) {
        // Fallback if Cesium fails to load/initialize
      }

      // Generate full orbit path (360 degrees)
      const pathPositions = [];
      for (let t = 0; t <= 360; t += 5) {
        const point = calculatePosition(sat.inc, sat.raan, t);
        if (Cesium.Cartesian3) {
          pathPositions.push(Cesium.Cartesian3.fromDegrees(point.lng, point.lat, alt * EARTH_RADIUS));
        }
      }

      return {
        ...sat,
        lat: pos.lat,
        lng: pos.lng,
        currentPos: satPosition,
        pathCoords: pathPositions
      };
    });
  }, [dataMode]);

  const activeSat = useMemo(() => {
    return processedSatData.find(s => String(s.id) === String(selectedSatId || hoveredSatId)) || null;
  }, [selectedSatId, hoveredSatId, processedSatData]);

  const onModeChange = () => {
    setSelectedSatId(null);
    setHoveredSatId(null);
  };

  return (
    <div className="mc-root">

      {/* Instrument Panel */}
      <Navbar
        dataMode={dataMode}
        setDataMode={setDataMode}
        setCesiumLoading={setCesiumLoading}
        onModeChange={onModeChange}
        trackedObjectsCount={processedSatData.length}
        satellites={processedSatData}
        setSelectedSatId={setSelectedSatId}
      />

      {/* Satellite Info Card */}
      <SatelliteCard
        satellite={activeSat}
        collision={activeSat?.collision || activeSat?.risk}
        onClose={() => { setSelectedSatId(null); setHoveredSatId(null); }}
        onSimulationClick={activeSat ? () => setSimulationSat(activeSat) : undefined}
        onTcaViewClick={() => { setDataMode('tca'); onModeChange(); }}
      />


      {/* Expanded 3D Simulation View */}
      <SimulationModal
        isOpen={simulationSat !== null}
        satellite={simulationSat}
        onClose={() => setSimulationSat(null)}
      />

      {/* Engines */}
      {dataMode === 'tca' ? (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, background: '#08151d', paddingTop: '60px' }}>
          <TCASimulation />
        </div>
      ) : dataMode === 'hypothetical_tca' ? (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, background: '#08151d', paddingTop: '60px' }}>
          <HypotheticalTCASimulation />
        </div>
      ) : (
        <EngineCesium
          processedSatData={processedSatData}
          selectedSatId={selectedSatId}
          setSelectedSatId={setSelectedSatId}
          hoveredSatId={hoveredSatId}
          setHoveredSatId={setHoveredSatId}
          onReady={() => setCesiumLoading(false)}
          dataMode={dataMode}
          setDataMode={setDataMode}
        />
      )}

      {/* Floating Bottom Dashboard */}
      {dataMode !== 'tca' && dataMode !== 'hypothetical_tca' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex gap-2 p-1.5 rounded-xl bg-slate-950/40 backdrop-blur-3xl saturate-150 border border-t-white/20 border-x-white/10 border-b-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),_0_8px_32px_rgba(0,0,0,0.4)]">
            <button
                className={`w-[130px] h-9 text-xs font-mono tracking-wider transition-all duration-300 rounded-lg flex items-center justify-center whitespace-nowrap font-medium ${dataMode === 'normal' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}
                onClick={() => {
                    setDataMode('normal');
                    if (onModeChange) onModeChange();
                }}
            >
                NORMAL VIEW
            </button>
            <button
                className={`w-[130px] h-9 text-xs font-mono tracking-wider transition-all duration-300 rounded-lg flex items-center justify-center whitespace-nowrap font-medium ${dataMode === 'realistic' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}
                onClick={() => {
                    setDataMode('realistic');
                    if (onModeChange) onModeChange();
                }}
            >
                REALISTIC VIEW
            </button>
            <button
                className={`w-[130px] h-9 text-xs font-mono tracking-wider transition-all duration-300 rounded-lg flex items-center justify-center whitespace-nowrap font-medium ${dataMode === 'tca' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}
                onClick={() => {
                    setDataMode('tca');
                    if (onModeChange) onModeChange();
                }}
            >
                TCA VIEW
            </button>
        </div>
      )}

      {/* Internal Loader (e.g. for Cesium transition) */}
      <div
        className="mc-initial-loader-wrapper"
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: '#000000', display: 'flex', justifyContent: 'center', alignItems: 'center',
          flexDirection: 'column', gap: '24px', fontFamily: 'monospace', color: '#5a8fba',
          zIndex: 9999, transition: 'opacity 0.5s ease-in-out',
          opacity: cesiumLoading ? 1 : 0,
          pointerEvents: cesiumLoading ? 'all' : 'none'
        }}
      >
        <div className="mc-spinner" style={{
          width: '48px', height: '48px', border: '2px solid rgba(90, 143, 186, 0.2)',
          borderRadius: '50%', borderTopColor: '#5a8fba', borderRightColor: '#5a8fba',
          animation: 'mc-spin 1s linear infinite'
        }}></div>
        <div className="mc-loading-text" style={{
          letterSpacing: '3px', fontSize: '12px', animation: 'mc-pulse 2s ease-in-out infinite'
        }}>POWERING UP CESIUM ENGINE...</div>
      </div>

    </div>
  );
}
