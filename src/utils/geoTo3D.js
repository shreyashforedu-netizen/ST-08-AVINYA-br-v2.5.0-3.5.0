import * as THREE from 'three';

const GLOBE_RADIUS = 100; // Internal radius of react-globe.gl's sphere

// Convert lat/lng/alt to Three.js 3D coordinates.
// This must match react-globe.gl's internal polar2Cartesian conversion exactly.
export function geoTo3D(lat, lng, alt) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (90 + lng) * (Math.PI / 180);
    const r = GLOBE_RADIUS * (1 + alt);
    return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
    );
}
