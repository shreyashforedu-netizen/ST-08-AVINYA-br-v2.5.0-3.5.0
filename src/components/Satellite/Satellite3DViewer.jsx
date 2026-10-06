import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Satellite3DViewer
 * 
 * High-fidelity, reusable 3D spacecraft viewer built with Three.js, GLTFLoader,
 * and OrbitControls. Features automatic bounding box framing, studio aerospace lighting,
 * smooth interaction damping, and clean resource disposal.
 */
export default function Satellite3DViewer({
  modelSrc,
  name = 'Spacecraft',
  autoRotate = true,
  interactive = true,
  showControlsHint = true,
  className = '',
  style = {},
  onExpand = null,
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    if (!modelSrc) {
      // eslint-disable-next-line
      setLoading(false);
      return undefined;
    }

    const container = containerRef.current;
    if (!container) return undefined;

    setLoading(true);
    setError(null);

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 200;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 1000);
    camera.position.set(3, 2, 4);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-label', `${name} 3D interactive model`);
    container.appendChild(canvas);

    // 3. Professional Aerospace Lighting Setup
    // Soft deep-space ambient / hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xdce7ff, 0x0c1220, 2.2);
    scene.add(hemiLight);

    // Key directional light (sunlight in space)
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.0);
    keyLight.position.set(6, 8, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Fill directional light (soft blue Earth-reflected bounce)
    const fillLight = new THREE.DirectionalLight(0x7599e0, 1.8);
    fillLight.position.set(-6, 2, -5);
    scene.add(fillLight);

    // Subtle violet rim light (accent lighting matching application styling)
    const rimLight = new THREE.DirectionalLight(0x9d71ea, 1.4);
    rimLight.position.set(0, -6, 5);
    scene.add(rimLight);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enabled = interactive;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = true;
    controls.enableZoom = true;

    // Reduced motion support
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotate = autoRotate && !prefersReducedMotion;
    controls.autoRotateSpeed = 0.75; // very slow, elegant rotation

    controls.addEventListener('start', () => setIsInteracting(true));
    controls.addEventListener('end', () => setIsInteracting(false));

    // 5. GLTF Model Loading, Caching, and Automatic Model Framing
    let currentModel = null;
    let animId = null;
    let isDisposed = false;
    let fallbackAttemptIndex = 0;

    const setupModel = (sourceScene) => {
      if (isDisposed) return;
      
      const model = sourceScene.clone();
      currentModel = model;

      // Traverse to enable shadows and preserve materials
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = child.material.roughness ?? 0.5;
            // Note: Since we are cloning the scene, materials are shared.
            // In a strict environment, if you modify material per instance, you'd clone materials too.
            // For just viewing, shared materials are highly performant.
          }
        }
      });

      // Step 1: Calculate bounding box
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Step 2 & 3: Center the model at origin
      model.position.sub(center);

      // Step 4 & 5: Determine dimensions and calculate appropriate camera distance
      const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      const cameraDistance = Math.abs(maxDim / (2 * Math.tan(fovRad / 2))) * 1.65;

      // Step 6: Position camera automatically at an aerospace hero angle
      camera.position.set(
        cameraDistance * 0.85,
        cameraDistance * 0.55,
        cameraDistance * 1.15
      );

      // Step 7: Set OrbitControls target and limits
      controls.target.set(0, 0, 0);
      controls.minDistance = cameraDistance * 0.35;
      controls.maxDistance = cameraDistance * 3.5;

      // Step 8 & 9: Near/far clipping planes based on model size
      camera.near = Math.max(0.01, cameraDistance / 100);
      camera.far = Math.max(100, cameraDistance * 50);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      controls.update();

      scene.add(model);
      setLoading(false);
    };

    const tryLoad = (src) => {
      if (isDisposed) return;

      if (window.__SATELLITE_MODEL_CACHE?.has(src)) {
        setupModel(window.__SATELLITE_MODEL_CACHE.get(src));
        return;
      }

      const loader = new GLTFLoader();
      loader.load(
        src,
        (gltf) => {
          if (!window.__SATELLITE_MODEL_CACHE) {
            window.__SATELLITE_MODEL_CACHE = new Map();
          }
          window.__SATELLITE_MODEL_CACHE.set(src, gltf.scene);
          setupModel(gltf.scene);
        },
        undefined,
        (err) => {
          console.warn(`[Satellite3DViewer] Failed to load "${src}". Trying fallback.`, err);
          
          import('../../utils/satelliteModels.js').then(({ AVAILABLE_RANDOM_MODELS }) => {
            if (isDisposed) return;
            if (fallbackAttemptIndex < AVAILABLE_RANDOM_MODELS.length) {
              const nextSrc = AVAILABLE_RANDOM_MODELS[fallbackAttemptIndex];
              fallbackAttemptIndex++;
              tryLoad(nextSrc);
            } else {
              setError('Spacecraft 3D model could not be loaded.');
              setLoading(false);
            }
          }).catch(() => {
            setError('Spacecraft 3D model could not be loaded.');
            setLoading(false);
          });
        }
      );
    };

    tryLoad(modelSrc);

    // 6. Responsive Handling with ResizeObserver (Requirement 18)
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const w = entry.contentRect.width || container.clientWidth;
      const h = entry.contentRect.height || container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // 7. Render Animation Loop
    const animate = () => {
      if (isDisposed) return;
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resource Cleanup (Requirement 17)
    return () => {
      isDisposed = true;
      if (animId) cancelAnimationFrame(animId);
      resizeObserver.disconnect();

      controls.dispose();

      if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => {
                  Object.keys(mat).forEach((prop) => {
                    if (mat[prop] && mat[prop].isTexture) mat[prop].dispose();
                  });
                  mat.dispose();
                });
              } else {
                Object.keys(child.material).forEach((prop) => {
                  if (child.material[prop] && child.material[prop].isTexture) {
                    child.material[prop].dispose();
                  }
                });
                child.material.dispose();
              }
            }
          }
        });
      }

      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [modelSrc, name, autoRotate, interactive]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      style={{
        background: 'radial-gradient(ellipse at 50% 35%, #131c33 0%, #090e1c 50%, #040711 100%)',
        ...style,
      }}
    >
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Loading State (Requirement 15) */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#070b16]/80 backdrop-blur-sm pointer-events-none transition-opacity duration-300">
          <div className="relative flex items-center justify-center">
            {/* Outer radar pulse ring */}
            <div className="w-10 h-10 rounded-full border border-violet-500/30 animate-ping absolute" />
            {/* Inner spinning tech reticle */}
            <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-violet-400 border-r-cyan-400 animate-spin" />
            <div className="w-2 h-2 rounded-full bg-violet-400" />
          </div>
          <span className="mt-3 text-[10px] font-mono tracking-widest text-violet-300/80 uppercase">
            INITIALIZING 3D MODEL...
          </span>
        </div>
      )}

      {/* Error Fallback (Requirement 16) */}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <svg className="w-6 h-6 text-amber-400/80 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-[11px] font-mono text-gray-300/90">3D model unavailable</span>
          <span className="text-[9px] font-mono text-gray-500 mt-0.5">Telemetry remains active</span>
        </div>
      )}

      {/* Interactive Controls Hint Pill */}
      {showControlsHint && !loading && !error && (
        <div
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md text-[10px] font-mono text-white/70 pointer-events-none transition-opacity duration-300 ${
            isInteracting ? 'opacity-30' : 'opacity-85'
          }`}
        >
          Drag ↔ rotate · Scroll ⇕ zoom
        </div>
      )}

      {/* Optional Expand / Simulation trigger */}
      {onExpand && !loading && !error && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-lg border border-white/15 bg-black/40 hover:bg-violet-600/30 text-white/70 hover:text-white backdrop-blur-md transition-all cursor-pointer"
          title="Expand 3D Spacecraft Simulation"
          aria-label="Expand 3D Simulation"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7" />
          </svg>
        </button>
      )}

      {/* Glass edge shadow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      />
    </div>
  );
}
