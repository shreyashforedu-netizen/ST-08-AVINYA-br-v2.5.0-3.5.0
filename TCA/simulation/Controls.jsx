import { mmss, ZOOM_MIN, ZOOM_MAX, MONO, T_MAX } from './constants';

export default function Controls({ 
  playing, 
  setPlaying, 
  t, 
  onScrub, 
  speed, 
  setSpeed, 
  sec, 
  zoom, 
  zoomBy, 
  resetView, 
  shapeMode, 
  setShapeMode
}) {
  return (
    <div className="cw-controls">
      <button type="button" onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
      <input
        type="range" min={-T_MAX} max={T_MAX} step="0.01" value={t}
        onChange={onScrub} aria-label="Time relative to closest approach"
      />
      <select value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} aria-label="Playback speed">
        <option value="0.5">0.5x</option>
        <option value="1">1x</option>
        <option value="2">2x</option>
      </select>
      <select value={shapeMode} onChange={(e) => setShapeMode(e.target.value)} aria-label="Shape mode">
        <option value="ellipsoid">Ellipsoid</option>
        <option value="cuboid">Cuboid</option>
      </select>
      <span className="cw-clock">{t < 0 ? "T-" : "T+"}{mmss(sec)}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <button
          type="button" aria-label="Zoom out" title="Zoom out"
          disabled={zoom <= ZOOM_MIN + 0.001} onClick={() => zoomBy(1 / 1.25)}
        >−</button>
        <span style={{ fontFamily: MONO, fontSize: 12, minWidth: 42, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button" aria-label="Zoom in" title="Zoom in"
          disabled={zoom >= ZOOM_MAX - 0.001} onClick={() => zoomBy(1.25)}
        >+</button>
        <button type="button" aria-label="Reset view" title="Reset zoom and rotation" onClick={resetView}>Reset</button>
      </span>
    </div>
  );
}
