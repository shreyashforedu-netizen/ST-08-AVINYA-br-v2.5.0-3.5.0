# SUDHARSHAN CHAKRA 3D — SPACE ATC MISSION CONTROL

> **Autonomous Satellite Tracking & Orbital Trajectory 3D Visualization Platform**  
> *Architectural Reference, Component Hierarchy & AI Agent Handoff Guide*

---

## 🛰️ 1. Project Overview & Mission

**SUDHARSHAN CHAKRA 3D** is a specialized aerospace and satellite surveillance web application designed as an interactive 3D **Space Air Traffic Control (Space ATC) Mission Control**.

The application renders real-time satellite positions and their complete 360-degree orbital pathways around Earth using a **Dual-Engine Visualization Architecture**:
1. **React Engine (`EngineReact.jsx`)**: Powered by `react-globe.gl` and `Three.js`. Provides ultra-lightweight, high-FPS (60+ FPS) orbital tracking with interactive Three.js raycasting for satellite selection, hover state scaling, and camera animation.
2. **Cesium Engine (`EngineCesium.jsx`)**: Powered by `cesium` (raw API, without Resium). Delivers aerospace-grade geospatial fidelity, realistic Earth terrain/imagery, and precise Cartesian coordinate plotting.

Users can toggle seamlessly between both engines in real-time via the Mission Control Instrument Panel while maintaining active selection, telemetry readouts, and camera orientation.

---

## 🚀 2. TCA (Time of Closest Approach) Subsystem Integration

The platform now features a dedicated **Conjunction Watch (TCA)** subsystem to predict and visualize high-risk orbital collision events. This subsystem is fully decoupled into the `TCA/` directory and features its own robust Python engine and React visualization dashboard.

1. **Python Mathematical Engine (`TCA/engine/tca_calculator.py`)**: 
   - A standalone Python script that leverages the `orbital-engine` propagating logic.
   - It performs $O(N^2)$ pairwise proximity checks across the CelesTrak satellite database.
   - Refines initial coarse searches down to 10-second intervals to precisely calculate TCA (Time of Closest Approach), relative velocities, and exact miss distances. 
   - Outputs highly-detailed conjunction geometry to `src/data/tca_events.json`.
   - Filters out physically attached objects (e.g. ISS modules) using a strictly enforced `0.001 km/s` relative velocity threshold.

2. **React Covariance Simulation (`TCA/simulation/TCASimulation.jsx`)**:
   - A hyper-realistic 3D rendering dashboard providing a local, orthographic view of the conjunction geometry at the moment of closest approach.
   - Renders 3D covariance bounding volumes (toggleable between **Dotted Mesh Ellipsoids** and **Wireframe Cuboids**) over a premium glassmorphic, space-themed dark mode UI (`tca-styles.css`).
   - Features timeline scrubbing, playback speed controls, and interactive 3D scene rotation.

---

## 📂 3. Complete File & Directory Architecture

```text
Project-S-main/
├── index.html                   # HTML entry point with inline Mission Control preloader (#mc-loader-wrapper)
├── package.json                 # Project dependencies (React 19, Cesium, Three.js, react-globe.gl, Tailwind)
├── vite.config.js               # Vite configuration with @tailwindcss/vite, @vitejs/plugin-react, and vite-plugin-cesium
├── README.md                    # This document (AI Agent handoff and architectural specification)
├── public/                      # Static assets (favicons, SVG icons)
│
├── orbital-engine/              # Python backend for LIVE CelesTrak SGP4 orbital propagation
│   ├── main.py                  # CLI entry point to fetch TLEs and generate realistic orbital paths
│   └── requirements.txt         # Python dependencies (astropy, sgp4, skyfield)
│
├── TCA/                         # Time of Closest Approach Subsystem
│   ├── engine/
│   │   └── tca_calculator.py    # Python engine to calculate collision risks and miss distances
│   └── simulation/              # React frontend for the Conjunction Watch dashboard
│       ├── TCASimulation.jsx    # Main orchestration component and view switcher
│       ├── SimulationCanvas.jsx # 3D HTML5 Canvas wrapper
│       ├── Controls.jsx         # Playback, scrubbing, and bounding-volume toggle controls
│       ├── Sidebar.jsx          # Scrollable list of conjunction events
│       ├── Stats.jsx            # Telemetry readout panels
│       ├── draw.js              # Pure JS/Canvas orthographic 3D rendering engine
│       ├── constants.js         # TCA physics helpers and geometry builder (`buildScene`)
│       └── tca-styles.css       # Premium glassmorphic styling, animations, and deep-space gradients
│
└── src/                         # Core React Application
    ├── main.jsx                 # React root renderer (mounts App to #root)
    ├── App.jsx                  # Application entry point; orchestrates preloader fade-out & mounts GlobeView
    ├── App.css                  # Unified Mission Control HUD styling (glassmorphism, radar widgets, panels)
    ├── index.css                # Base stylesheet with Tailwind v4 imports
    │
    ├── data/
    │   ├── satellites.json      # Mock satellite telemetry dataset
    │   └── tca_events.json      # Output dataset from the TCA Python engine
    │
    ├── utils/
    │   ├── satelliteHelpers.js  # Orbital mathematics: calculates lat/lng from inclination, RAAN, and theta
    │   ├── geoTo3D.js           # Coordinate transformation: converts (lat, lng, alt) to Three.js Cartesian Vector3
    │   └── orbitSegments.js     # Hook for orbit trajectory segmentation & interpolation
    │
    └── components/
        ├── Globe/
        │   ├── GlobeView.jsx            # Orchestrator & State Hub: controls engine state, data preparation, HUD
        │   ├── EngineReact.jsx          # React-Globe.gl + Three.js 3D rendering engine
        │   └── EngineCesium.jsx         # Raw Cesium geospatial 3D rendering engine
        │
        ├── Controls/
        │   ├── VisualizationMode.jsx    # HUD engine toggle switch (REACT vs CESIUM)
        │   └── CameraControls.jsx       # Floating camera controls (Zoom In, Zoom Out, Reset View)
        │
        └── Satellite/
            ├── SatelliteCard.jsx        # Glassmorphic HUD overlay displaying detailed satellite telemetry
            ├── SatellitePoint.jsx       # Decoupled satellite mesh rendering logic
            └── SatelliteOrbit.jsx       # Decoupled orbital pathway rendering logic
```

*(Note: During recent refactoring, several unused dependencies (`resium`), obsolete stubs (`OperationalGlobe.jsx`), and redundant folders (`SIMULATION/`) were permanently stripped out to strictly optimize the codebase.)*

---

## 🔄 4. Data Flow & Mathematical Pipeline

### A. Satellite Telemetry Schema (`src/data/satellites.json`)
Each satellite object in `satellites.json` contains:
```json
{
  "id": "SAT-001",
  "name": "Cartosat-3",
  "type": "Earth Observation",
  "operator": "ISRO",
  "country": "India",
  "launchDate": "2019-11-27",
  "value": "$75M",
  "status": "Operational",
  "inc": 97.5,      // Orbit inclination (degrees)
  "raan": 45.0,     // Right Ascension of the Ascending Node (degrees)
  "alt": 0.08,      // Normalized orbital altitude relative to Earth radius
  "theta": 120.0    // Current orbital true anomaly angle (degrees: 0 to 360)
}
```

### B. Mathematical Transformations

#### 1. Orbital Coordinate Calculation (`src/utils/satelliteHelpers.js`)
Given inclination ($i$), RAAN ($\Omega$), and true anomaly ($\theta$):
```javascript
export function calculatePosition(inc, raan, theta) {
  const iRad = (inc * Math.PI) / 180;
  const rRad = (raan * Math.PI) / 180;
  const tRad = (theta * Math.PI) / 180;

  const x = Math.cos(tRad) * Math.cos(rRad) - Math.sin(tRad) * Math.cos(iRad) * Math.sin(rRad);
  const y = Math.cos(tRad) * Math.sin(rRad) + Math.sin(tRad) * Math.cos(iRad) * Math.cos(rRad);
  const z = Math.sin(tRad) * Math.sin(iRad);

  const lat = Math.asin(z) * (180 / Math.PI);
  const lng = Math.atan2(y, x) * (180 / Math.PI);
  return { lat, lng };
}
```

#### 2. Three.js Cartesian Transformation (`src/utils/geoTo3D.js`)
Converts spherical `(lat, lng, alt)` to Three.js Cartesian space matching `react-globe.gl`'s internal radius (`GLOBE_RADIUS = 100`):
$$\phi = (90 - \text{lat}) \times \frac{\pi}{180}, \quad \theta = (90 + \text{lng}) \times \frac{\pi}{180}, \quad r = 100 \times (1 + \text{alt})$$
$$X = r \sin\phi \cos\theta, \quad Y = r \cos\phi, \quad Z = r \sin\phi \sin\theta$$

#### 3. Cesium Cartesian3 Transformation (`src/components/Globe/GlobeView.jsx`)
Converts degrees to WGS84 Cartesian coordinates:
$$\text{Cartesian3.fromDegrees}(\text{lng}, \text{lat}, \text{alt} \times 6371000)$$

---

## ⚠️ 5. Important Notes & Troubleshooting for the Next Agent

### Globe Texture Visibility in `EngineReact.jsx`
- `EngineReact` uses `react-globe.gl` which fetches its Earth texture from:
  - Globe image: `https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg`
  - Bump map: `https://unpkg.com/three-globe/example/img/earth-topology.png`
  - Background: `https://unpkg.com/three-globe/example/img/night-sky.png`
- **If the React Earth globe sphere appears pitch black**:
  1. **Network / CDN Block**: Ensure `https://` is explicitly included (protocol-relative `//unpkg.com/...` will fail or get blocked by CORS/mixed-content in modern browsers when running on `http://localhost`).
  2. **WebGL Context Loss**: Vite Hot Module Replacement (HMR) can invalidate the WebGL context when modifying Three.js files. **Perform a full hard refresh (`Ctrl + Shift + R` or `Cmd + Shift + R`)**.
  3. **Local Fallback**: For completely offline or air-gapped environments, download the textures into `public/textures/` and reference `/textures/earth-blue-marble.jpg`.

### Running & Building
```bash
# Install dependencies
npm install

# Start Vite dev server (runs on http://localhost:5173 by default)
npm run dev

# Build production bundle
npm run build

# Run linter
npm run lint
```

---

## 📜 6. Architectural Rules for Future Implementations

1. **Preserve Dual-Engine Parity**: Any new telemetry field or satellite attribute added to the React engine must also be reflected in the Cesium engine.
2. **Do Not Mutate Coordinate Math Directly in UI Components**: All orbital calculations belong in `src/utils/`. Components should only consume computed coordinates.
3. **Keep HUD Decoupled**: The Mission Control HUD (`GlobeView.jsx`, `CameraControls.jsx`, `SatelliteCard.jsx`, `VisualizationMode.jsx`) is engine-agnostic and should never directly import Three.js or Cesium internals.
