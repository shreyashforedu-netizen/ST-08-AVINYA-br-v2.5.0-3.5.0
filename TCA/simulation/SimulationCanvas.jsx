import React from 'react';
import Controls from './Controls';

export default function SimulationCanvas({ 
  stageRef, 
  cvRef, 
  onDown, 
  onMove, 
  onUp, 
  isFullscreen, 
  toggleFullscreen, 
  controlsProps 
}) {
  return (
    <div
      className={`cw-stage ${isFullscreen ? 'cw-stage--fullscreen' : ''}`}
      ref={stageRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <canvas ref={cvRef} />

      {/* Top-right Fullscreen Button on the Simulation Window */}
      {toggleFullscreen && (
        <button
          type="button"
          className="cw-fs-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen Simulation"}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Simulation Window"}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isFullscreen ? (
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            ) : (
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            )}
          </svg>
          <span>{isFullscreen ? "Exit" : "Fullscreen"}</span>
        </button>
      )}

      {/* Floating HUD controls bar when simulation window is expanded to fullscreen */}
      {isFullscreen && controlsProps && (
        <div 
          className="cw-fs-hud" 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => e.stopPropagation()}
        >
          <Controls {...controlsProps} isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />
        </div>
      )}
    </div>
  );
}
