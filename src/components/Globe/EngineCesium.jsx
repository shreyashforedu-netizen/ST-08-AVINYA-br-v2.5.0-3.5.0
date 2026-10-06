import React, { useRef, useCallback, useEffect } from 'react';
import * as Cesium from 'cesium';
import CameraControls from '../Controls/CameraControls';

const WHITE = Cesium.Color.WHITE;
const WHITE_FAINT = Cesium.Color.fromCssColorString('#686262ff');
const VIOLET = Cesium.Color.fromCssColorString('#8b5cf6');
const VIOLET_BRIGHT = Cesium.Color.fromCssColorString('#8b5cf6').withAlpha(0.9);
const VIOLET_DIM = Cesium.Color.fromCssColorString('#8b5cf6').withAlpha(0.5);

const getHomeView = () => {
    const isMobile = window.innerWidth < 768;
    return Cesium.Cartesian3.fromDegrees(80, 23.5, isMobile ? 38000000 : 20000000);
};

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

function styleEntity(entity, isSelected, isHovered) {
    const active = isSelected || isHovered;
    if (entity.point) {
        entity.point.pixelSize = isSelected ? 11 : isHovered ? 9 : 6;
        entity.point.color = active ? VIOLET : WHITE;
    }
    if (entity.polyline) {
        entity.polyline.width = isSelected ? 3 : isHovered ? 2 : 1;
        entity.polyline.material = new Cesium.ColorMaterialProperty(
            isSelected ? VIOLET_BRIGHT : isHovered ? VIOLET_DIM : WHITE_FAINT
        );
    }
}

function EngineCesium({ processedSatData, selectedSatId, setSelectedSatId, hoveredSatId, setHoveredSatId, onReady, dataMode, setDataMode }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);          // the real Cesium.Viewer
    const entityMapRef = useRef(new Map());  // String(sat.id) -> Cesium entity
    const pausedRef = useRef(false);         // auto-rotate paused while hovering a satellite

    // Always-latest selection values for use inside Cesium callbacks
    const selectedRef = useRef(selectedSatId);
    const hoveredRef = useRef(hoveredSatId);

    useEffect(() => {
        selectedRef.current = selectedSatId;
    }, [selectedSatId]);

    useEffect(() => {
        hoveredRef.current = hoveredSatId;
    }, [hoveredSatId]);

    const getViewer = useCallback(() => {
        const v = viewerRef.current;
        return v && !v.isDestroyed() ? v : null;
    }, []);

    const applyStyles = useCallback(() => {
        entityMapRef.current.forEach((entity, key) => {
            styleEntity(entity, sameId(key, selectedRef.current), sameId(key, hoveredRef.current));
        });
    }, []);

    // Create the viewer + satellites + handlers once, destroy on cleanup.
    useEffect(() => {
        if (!containerRef.current) return undefined;

        const viewer = new Cesium.Viewer(containerRef.current, {
            animation: false,
            timeline: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: true,   // Enabled to allow 2D/3D switching
            baseLayerPicker: true,   // Enabled to let the user select different map styles (Aerial, Dark, etc)
            navigationHelpButton: false,
            infoBox: false,
            selectionIndicator: false,
            fullscreenButton: false,
            msaaSamples: 4,          // 4x Anti-aliasing for smooth orbit lines and dots
            creditContainer: document.createElement('div'), // hides credit text
        });

        // Use device pixel ratio for super crisp rendering on high-DPI displays (cap at 2 for performance)
        viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2);
        viewerRef.current = viewer;

        viewer.camera.setView({ destination: getHomeView() });

        // ---- Satellites + orbits ----
        const entityMap = new Map();
        const entityIdToSatId = new Map();
        try {
            processedSatData.forEach((sat, i) => {
                if (!sat.currentPos) return;
                const entity = viewer.entities.add({
                    id: `sat-${i}`,
                    name: sat.name,
                    position: sat.currentPos,
                    point: {
                        pixelSize: 6,
                        color: WHITE,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 1,
                    },
                    polyline: {
                        positions: sat.pathCoords,
                        width: 1,
                        material: WHITE_FAINT,
                        arcType: Cesium.ArcType.NONE,
                    },
                });
                entityMap.set(String(sat.id), entity);
                entityIdToSatId.set(entity.id, sat.id);
            });

            // HYPOTHETICAL COLLISION SCENARIO (Only in Normal View)
            if (dataMode === 'normal') {
                const hubble = processedSatData.find(s => s.id === 'SAT-002');
                const vanguard = processedSatData.find(s => s.id === 'SAT-001');

                if (hubble && vanguard && hubble.currentPos && vanguard.currentPos) {
                    
                    // 1. Find exact path intersection
                    let encounterPoint = hubble.currentPos;
                    let minDist = Infinity;
                    if (hubble.pathCoords && vanguard.pathCoords) {
                        for (const p1 of hubble.pathCoords) {
                            for (const p2 of vanguard.pathCoords) {
                                const d = Cesium.Cartesian3.distance(p1, p2);
                                if (d < minDist) {
                                    minDist = d;
                                    encounterPoint = p1;
                                }
                            }
                        }
                    }

                    // 2. Add the collision marker at the exact intersection
                    const markerEntity = viewer.entities.add({
                        id: 'hypothetical-marker',
                        name: 'Hypothetical Encounter Point',
                        position: encounterPoint,
                        point: {
                            pixelSize: 15,
                            color: new Cesium.CallbackProperty((time, result) => {
                                const s = Math.abs(Math.sin(Date.now() / 300));
                                return Cesium.Color.RED.withAlpha(0.6 + 0.4 * s);
                            }, false),
                            outlineColor: Cesium.Color.YELLOW,
                            outlineWidth: 2,
                        },
                        label: {
                            text: 'WARNING: HYPOTHETICAL IMPACT\\n(CLICK HERE TO SIMULATE)',
                            font: '12pt monospace',
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            fillColor: Cesium.Color.RED,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                            pixelOffset: new Cesium.Cartesian2(0, -15),
                        }
                    });

                    // 3. Make Vanguard and Hubble blink/pulse!
                    const hubbleEnt = entityMap.get(String(hubble.id));
                    const vanguardEnt = entityMap.get(String(vanguard.id));
                    const blinkColor = new Cesium.CallbackProperty((time, result) => {
                        const active = (selectedSatId === 'SAT-001' || selectedSatId === 'SAT-002') ? false : true;
                        if (!active) return WHITE;
                        const s = Math.abs(Math.sin(Date.now() / 200));
                        return Cesium.Color.RED.withAlpha(0.3 + 0.7 * s);
                    }, false);

                    if (hubbleEnt && hubbleEnt.point) {
                        hubbleEnt.point.color = blinkColor;
                        hubbleEnt.point.pixelSize = 10;
                    }
                    if (vanguardEnt && vanguardEnt.point) {
                        vanguardEnt.point.color = blinkColor;
                        vanguardEnt.point.pixelSize = 10;
                    }
                }
            }
        } catch (err) {
            console.error('[EngineCesium] failed creating satellites:', err);
        }
        entityMapRef.current = entityMap;
        applyStyles();

        // ---- Auto-rotate (pauses while hovering a satellite) ----
        const onTick = () => {
            if (!pausedRef.current) {
                viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.001);
            }
        };
        viewer.clock.onTick.addEventListener(onTick);

        // Remove Cesium's built-in click selection / double-click tracking
        viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        // ---- Hover + click ----
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        let currentHovered = null;

        const pickSatId = (position) => {
            // Look at everything under the cursor (forgiving 10x10 px area) and
            // only accept satellite DOTS; orbit lines are ignored.
            const hits = viewer.scene.drillPick(position, 8, 10, 10);
            for (let i = 0; i < hits.length; i++) {
                const hit = hits[i];
                if (
                    hit &&
                    hit.primitive instanceof Cesium.PointPrimitive &&
                    hit.id &&
                    hit.id.id !== undefined
                ) {
                    const satId = entityIdToSatId.get(hit.id.id);
                    if (satId !== undefined) return satId;
                }
            }
            return null;
        };

        handler.setInputAction((movement) => {
            const satId = pickSatId(movement.endPosition);
            if (satId !== null) {
                pausedRef.current = true;
                if (satId !== currentHovered) {
                    currentHovered = satId;
                    setHoveredSatId(satId);
                    document.body.style.cursor = 'pointer';
                }
            } else {
                pausedRef.current = false;
                if (currentHovered !== null) {
                    currentHovered = null;
                    setHoveredSatId(null);
                    document.body.style.cursor = 'grab';
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        handler.setInputAction((click) => {
            const hits = viewer.scene.drillPick(click.position, 8, 10, 10);
            for (let i = 0; i < hits.length; i++) {
                const hit = hits[i];
                if (hit && hit.id && hit.id.id === 'hypothetical-marker') {
                    if (setDataMode) setDataMode('hypothetical_tca');
                    return;
                }
            }
            
            const satId = pickSatId(click.position);
            console.log('[EngineCesium] click ->', satId);
            if (satId !== null) {
                setSelectedSatId(satId);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        console.log('[EngineCesium] viewer created, satellites:', entityMap.size);

        if (onReady) {
            // Wait a few seconds to allow Cesium tiles to download and buffer fully
            // before removing the loading screen.
            setTimeout(() => {
                onReady();
            }, 3500);
        }

        return () => {
            pausedRef.current = false;
            document.body.style.cursor = 'default';
            if (!handler.isDestroyed()) handler.destroy();
            if (!viewer.isDestroyed()) {
                viewer.clock.onTick.removeEventListener(onTick);
                viewer.destroy();
            }
            viewerRef.current = null;
            entityMapRef.current = new Map();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processedSatData, setHoveredSatId, setSelectedSatId, applyStyles, dataMode, setDataMode]);

    // Re-style whenever selection / hover changes
    useEffect(() => {
        applyStyles();

        const viewer = getViewer();
        if (viewer && selectedSatId) {
            const sat = processedSatData.find(s => String(s.id) === String(selectedSatId));
            if (sat && sat.currentPos) {
                // Create a bounding sphere only around the satellite's current position
                // This prevents Cesium from zooming out to fit the entire orbit polyline
                const boundingSphere = new Cesium.BoundingSphere(sat.currentPos, 0);
                viewer.camera.flyToBoundingSphere(boundingSphere, {
                    duration: 1,
                    offset: new Cesium.HeadingPitchRange(0, -Cesium.Math.PI_OVER_TWO, 8000000)
                });
            }
        }
    }, [selectedSatId, hoveredSatId, applyStyles, processedSatData, getViewer]);

    const zoomIn = () => {
        const viewer = getViewer();
        if (viewer) viewer.camera.zoomIn(2000000);
    };

    const zoomOut = () => {
        const viewer = getViewer();
        if (viewer) viewer.camera.zoomOut(2000000);
    };

    const resetView = () => {
        const viewer = getViewer();
        if (viewer) {
            viewer.camera.flyTo({ destination: getHomeView(), duration: 1 });
            setSelectedSatId(null);
            setHoveredSatId(null);
        }
    };

    return (
        <>
            <div className="mc-globe">
                <div
                    ref={containerRef}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
            </div>



            <CameraControls zoomIn={zoomIn} zoomOut={zoomOut} resetView={resetView} />
        </>
    );
}

export default React.memo(EngineCesium);
