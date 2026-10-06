import React from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';

export default function CameraControls({ zoomIn, zoomOut, resetView }) {
    return (
        <div className="mc-controls">
            <button className="mc-ctrl-btn" onClick={zoomIn} aria-label="Zoom In">
                <Plus size={16} />
            </button>
            <button className="mc-ctrl-btn" onClick={zoomOut} aria-label="Zoom Out">
                <Minus size={16} />
            </button>
            <button className="mc-ctrl-btn mc-ctrl-btn--gap" onClick={resetView} aria-label="Reset View">
                <RotateCcw size={14} />
            </button>
            <span className="mc-ctrl-label">RESET</span>
        </div>
    );
}
