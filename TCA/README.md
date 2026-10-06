# TCA (Time of Closest Approach) Module

This module isolates the Time of Closest Approach (TCA) subsystem from the main orbital engine and 3D visualization.

## Architecture

1. **`engine/`**: Contains the mathematical simulation and adapters. It reads the satellite orbital elements (TLEs) provided by the orbital engine, propagates them at synchronized time steps using SGP4, and computes close approach events.
2. **`adapters/`**: Adapts data between the Orbital Engine (satellites.json) and the TCA Engine, ensuring coordinate and unit consistency.
3. **`simulation/`**: Contains the visual React components (provided externally) that render the specific conjunction events. It has been integrated cleanly without polluting the main application logic.
4. **`outputs/`**: Stores generated TCA events (`tca_events.json`).
5. **`models/`**: Data models (if necessary) for strict schema definition.

## Data Flow
`Orbital Engine (TLE)` -> `TCA Adapter` -> `TCA Engine (SGP4 Propagation & Distance Minimization)` -> `tca_events.json` -> `TCA Simulation (UI)` -> `Main GlobeView (Frontend)`

## Scientific Constraints
- Orbital states are propagated to exact matching epochs before distance comparison.
- TEME (True Equator, Mean Equinox) coordinates are used for absolute distance and relative velocity calculations.
- Separation distances are calculated strictly at matching timestamps.

## Running the Simulation
To generate TCA events:
```bash
python TCA/engine/tca_calculator.py
```
This reads from `orbital-engine/output/satellites.json` and outputs to `TCA/outputs/tca_events.json`.

The frontend automatically consumes this output and visualizes it inside the "Conjunctions" panel.
