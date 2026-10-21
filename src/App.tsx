/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useCamera } from './hooks/useCamera.ts';
import { ARSceneManager } from './engine/ARSceneManager.ts';
import { CameraView } from './components/CameraView.tsx';
import { TopHeader } from './components/TopHeader.tsx';
import { BottomControlDock } from './components/BottomControlDock.tsx';
import { DimensionBadge } from './components/DimensionBadge.tsx';
import { CustomGlbModal } from './components/CustomGlbModal.tsx';
import { SnapshotModal } from './components/SnapshotModal.tsx';
import { GuideModal } from './components/GuideModal.tsx';
import { MobileQrModal } from './components/MobileQrModal.tsx';
import { FloorScannerOverlay } from './components/FloorScannerOverlay.tsx';
import { INITIAL_CATALOG, instantiateModel } from './models/catalog.ts';
import { FurnitureModelDef, PlacedFurniture, ViewMode, ActiveTab, PlaneDetectionState } from './types.ts';
import { applyColorToModel } from './models/glbLoader.ts';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneManagerRef = useRef<ARSceneManager | null>(null);
  const customGlbCacheRef = useRef<Map<string, THREE.Group>>(new Map());

  // Camera Hook
  const {
    videoRef,
    status: cameraStatus,
    errorMessage: cameraError,
    facingMode,
    hasTorch,
    isTorchOn,
    startCamera,
    toggleFacingMode,
    toggleTorch,
  } = useCamera();

  // App State
  const [catalog, setCatalog] = useState<FurnitureModelDef[]>(INITIAL_CATALOG);
  const [activeCatalogModel, setActiveCatalogModel] = useState<FurnitureModelDef | null>(INITIAL_CATALOG[0]);
  const [placedItemsCount, setPlacedItemsCount] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<PlacedFurniture | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('ar-camera');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [lightIntensity, setLightIntensity] = useState<number>(1.0);
  const [floorElevation, setFloorElevation] = useState<number>(0);
  const [planeState, setPlaneState] = useState<PlaneDetectionState>('scanning');
  const [groundDistance, setGroundDistance] = useState<number>(1.8);
  const [floorConfirmed, setFloorConfirmed] = useState<boolean>(false);
  const [isWebXRSupported, setIsWebXRSupported] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');

  // Modals
  const [isGlbModalOpen, setIsGlbModalOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isMobileQrOpen, setIsMobileQrOpen] = useState<boolean>(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  // Initialize Three.js AR Scene
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const manager = new ARSceneManager(canvasMountRef.current, {
      onItemSelected: (instanceId) => {
        if (instanceId && manager.placedItems.has(instanceId)) {
          setSelectedItem({ ...manager.placedItems.get(instanceId)! });
          setActiveTab('edit');
        } else {
          setSelectedItem(null);
        }
      },
      onItemMoved: (item) => {
        setSelectedItem({ ...item });
      },
      onPlaneStateChange: (state, dist) => {
        setPlaneState(state);
        setGroundDistance(dist);
      },
      onWebXRSupported: (supported) => {
        setIsWebXRSupported(supported);
      },
      onFpsUpdate: (currentFps) => {
        setFps(currentFps);
      },
    });

    sceneManagerRef.current = manager;

    // Listen to device motion/gyroscope if available
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        manager.setDeviceOrientation(e.alpha, e.beta, e.gamma);
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);

    // Window resize
    const handleResize = () => {
      manager.updateDimensions();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('resize', handleResize);
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // Keyboard Shortcuts (Zen mode, Delete, Rotate, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteItem();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRotateDegrees(45);
      } else if (e.key === 'd' || e.key === 'D') {
        handleDuplicateItem();
      } else if (e.key === 'Escape') {
        handleDeselectItem();
        setIsGlbModalOpen(false);
        setIsGuideOpen(false);
        setIsMobileQrOpen(false);
        setSnapshotUrl(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  // Furniture Action Handlers
  const handleSelectCatalogItem = useCallback((modelDef: FurnitureModelDef) => {
    setActiveCatalogModel(modelDef);
  }, []);

  // Floor Confirmation Handlers
  const handleConfirmFloor = useCallback(() => {
    sceneManagerRef.current?.confirmFloor();
    setFloorConfirmed(true);
    setActiveTab('catalog');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(50);
    }
  }, []);

  const handleRescanFloor = useCallback(() => {
    sceneManagerRef.current?.rescanFloor();
    setFloorConfirmed(false);
  }, []);

  // Place model at currently detected ground plane reticle
  const handlePlaceAtReticle = useCallback(() => {
    if (!sceneManagerRef.current || !activeCatalogModel) return;

    // Ensure floor is confirmed upon placing
    if (!floorConfirmed) {
      handleConfirmFloor();
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(35);
    }

    const cachedObj = customGlbCacheRef.current.get(activeCatalogModel.id);
    const instance = instantiateModel(activeCatalogModel, cachedObj);

    // Add to floor at reticle (fixed world position)
    const placed = sceneManagerRef.current.addFurniture({
      instanceId: `${activeCatalogModel.id}-${Date.now()}`,
      modelId: activeCatalogModel.id,
      name: activeCatalogModel.name,
      object3D: instance.object3D,
      dimensions: instance.dimensions,
      colorHex: activeCatalogModel.colors?.[0]?.hex,
      isCustomGlb: activeCatalogModel.isCustomGlb,
      isLocked: false,
    });

    setPlacedItemsCount(sceneManagerRef.current.placedItems.size);
    setSelectedItem({ ...placed });
    setActiveTab('edit');
  }, [activeCatalogModel, floorConfirmed, handleConfirmFloor]);

  const handleCustomGlbLoaded = useCallback(
    (modelDef: FurnitureModelDef, object3D: THREE.Group) => {
      customGlbCacheRef.current.set(modelDef.id, object3D);

      setCatalog((prev) => [modelDef, ...prev]);
      setActiveCatalogModel(modelDef);

      if (!floorConfirmed) {
        handleConfirmFloor();
      }

      if (sceneManagerRef.current) {
        const instance = instantiateModel(modelDef, object3D);
        const placed = sceneManagerRef.current.addFurniture({
          instanceId: `${modelDef.id}-${Date.now()}`,
          modelId: modelDef.id,
          name: modelDef.name,
          object3D: instance.object3D,
          dimensions: instance.dimensions,
          colorHex: modelDef.colors?.[0]?.hex,
          isCustomGlb: true,
          isLocked: false,
        });

        setPlacedItemsCount(sceneManagerRef.current.placedItems.size);
        setSelectedItem({ ...placed });
        setActiveTab('edit');
      }
    },
    [floorConfirmed, handleConfirmFloor]
  );

  const handleRotateDegrees = useCallback((deg: number) => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.rotateSelectedItemBy(deg);
  }, []);

  const handleSetRotationRadians = useCallback((rad: number) => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.updateSelectedItemRotation(rad);
  }, []);

  const handleScaleChange = useCallback((scale: number) => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.updateSelectedItemScale(scale);
  }, []);

  const handleElevationChange = useCallback((elevation: number) => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.updateSelectedItemElevation(elevation);
  }, []);

  const handleFloorElevationChange = useCallback((elev: number) => {
    setFloorElevation(elev);
    sceneManagerRef.current?.setFloorElevation(elev);
  }, []);

  const handleColorChange = useCallback((colorHex: string) => {
    if (!sceneManagerRef.current || !selectedItem) return;
    const item = sceneManagerRef.current.placedItems.get(selectedItem.instanceId);
    if (!item) return;

    item.colorHex = colorHex;
    applyColorToModel(item.object3D, colorHex);
    setSelectedItem({ ...item });
  }, [selectedItem]);

  const handleToggleLockItem = useCallback(() => {
    if (!sceneManagerRef.current || !selectedItem) return;
    const newLockState = sceneManagerRef.current.toggleItemLock(selectedItem.instanceId);
    setSelectedItem((prev) => (prev ? { ...prev, isLocked: newLockState } : null));
  }, [selectedItem]);

  const handleDuplicateItem = useCallback(() => {
    if (!sceneManagerRef.current || !selectedItem) return;
    const modelDef = catalog.find((m) => m.id === selectedItem.modelId);
    if (!modelDef) return;

    const cachedObj = customGlbCacheRef.current.get(modelDef.id);
    const instance = instantiateModel(modelDef, cachedObj, selectedItem.colorHex);

    const offsetPos = selectedItem.position.clone().add(new THREE.Vector3(0.4, 0, 0.4));

    const placed = sceneManagerRef.current.addFurniture(
      {
        instanceId: `${modelDef.id}-${Date.now()}`,
        modelId: modelDef.id,
        name: modelDef.name,
        object3D: instance.object3D,
        dimensions: instance.dimensions,
        colorHex: selectedItem.colorHex,
        isCustomGlb: modelDef.isCustomGlb,
        isLocked: false,
      },
      offsetPos
    );

    sceneManagerRef.current.updateSelectedItemRotation(selectedItem.rotationY);
    sceneManagerRef.current.updateSelectedItemScale(selectedItem.scale);

    setPlacedItemsCount(sceneManagerRef.current.placedItems.size);
    setSelectedItem({ ...placed });
  }, [catalog, selectedItem]);

  const handleDeleteItem = useCallback(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.removeSelectedItem();
    setPlacedItemsCount(sceneManagerRef.current.placedItems.size);
    setSelectedItem(null);
  }, []);

  const handleDeselectItem = useCallback(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.selectItem(null);
    setSelectedItem(null);
  }, []);

  const handleClearAll = useCallback(() => {
    if (!sceneManagerRef.current) return;
    if (window.confirm('Clear all placed furniture from the AR scene?')) {
      sceneManagerRef.current.clearAllItems();
      setPlacedItemsCount(0);
      setSelectedItem(null);
    }
  }, []);

  // View Mode & Environment
  const handleToggleViewMode = useCallback(() => {
    const nextMode = viewMode === 'ar-camera' ? 'studio-room' : 'ar-camera';
    setViewMode(nextMode);
    sceneManagerRef.current?.setViewMode(nextMode);
    if (nextMode === 'ar-camera') {
      if (cameraStatus !== 'active') startCamera();
      setFloorConfirmed(false);
    } else {
      setFloorConfirmed(true);
    }
  }, [cameraStatus, startCamera, viewMode]);

  const handleToggleGrid = useCallback(() => {
    const nextGrid = !showGrid;
    setShowGrid(nextGrid);
    sceneManagerRef.current?.setGridVisible(nextGrid);
  }, [showGrid]);

  const handleLightIntensityChange = useCallback((val: number) => {
    setLightIntensity(val);
    sceneManagerRef.current?.setLightIntensity(val);
  }, []);

  const handleResetCamera = useCallback(() => {
    sceneManagerRef.current?.resetCamera();
  }, []);

  // Snapshot Capture
  const handleCaptureSnapshot = useCallback(() => {
    if (!sceneManagerRef.current) return;
    const dataUrl = sceneManagerRef.current.captureSnapshot(videoRef.current);
    setSnapshotUrl(dataUrl);
  }, [videoRef]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* 1. Camera Video Feed / Simulated Room (Background Layer) */}
      <CameraView
        videoRef={videoRef}
        cameraStatus={cameraStatus}
        errorMessage={cameraError}
        facingMode={facingMode}
        viewMode={viewMode}
        onRetryCamera={() => startCamera()}
        onSwitchToStudio={() => {
          setViewMode('studio-room');
          sceneManagerRef.current?.setViewMode('studio-room');
          setFloorConfirmed(true);
        }}
      />

      {/* 2. WebGL 3D Canvas Mount (Transparent layer over camera) */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 z-10 w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
      />

      {/* 3. Top Header Overlay */}
      <TopHeader
        viewMode={viewMode}
        cameraStatus={cameraStatus}
        itemsCount={placedItemsCount}
        fps={fps}
        planeState={planeState}
        groundDistance={groundDistance}
        hasTorch={hasTorch}
        isTorchOn={isTorchOn}
        onToggleTorch={toggleTorch}
        onToggleFacingMode={toggleFacingMode}
        onOpenGlbModal={() => setIsGlbModalOpen(true)}
        onOpenMobileQr={() => setIsMobileQrOpen(true)}
        onCaptureSnapshot={handleCaptureSnapshot}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* 4. Floor Detection Scanning Workflow Overlay (ARCore-style Step 1) */}
      {viewMode === 'ar-camera' && (
        <FloorScannerOverlay
          planeState={planeState}
          groundDistance={groundDistance}
          floorConfirmed={floorConfirmed}
          onConfirmFloor={handleConfirmFloor}
          onRescanFloor={handleRescanFloor}
        />
      )}

      {/* 5. Real-time Dimension Overlay for Selected Furniture */}
      <DimensionBadge selectedItem={selectedItem} />

      {/* 6. Collapsible Bottom Control Dock with Ground Detection & Instant Place Button */}
      {floorConfirmed && (
        <BottomControlDock
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          catalog={catalog}
          selectedItem={selectedItem}
          viewMode={viewMode}
          showGrid={showGrid}
          lightIntensity={lightIntensity}
          planeState={planeState}
          groundDistance={groundDistance}
          floorElevation={floorElevation}
          activeCatalogModel={activeCatalogModel}
          onSelectItemToSpawn={handleSelectCatalogItem}
          onPlaceAtReticle={handlePlaceAtReticle}
          onOpenGlbModal={() => setIsGlbModalOpen(true)}
          onRotateDegrees={handleRotateDegrees}
          onSetRotationRadians={handleSetRotationRadians}
          onScaleChange={handleScaleChange}
          onElevationChange={handleElevationChange}
          onFloorElevationChange={handleFloorElevationChange}
          onColorChange={handleColorChange}
          onDuplicateItem={handleDuplicateItem}
          onDeleteItem={handleDeleteItem}
          onDeselectItem={handleDeselectItem}
          onToggleLockItem={handleToggleLockItem}
          onToggleViewMode={handleToggleViewMode}
          onToggleGrid={handleToggleGrid}
          onLightIntensityChange={handleLightIntensityChange}
          onResetCamera={handleResetCamera}
          onClearAll={handleClearAll}
        />
      )}

      {/* 7. Custom GLB Upload Modal */}
      <CustomGlbModal
        isOpen={isGlbModalOpen}
        onClose={() => setIsGlbModalOpen(false)}
        onModelLoaded={handleCustomGlbLoaded}
      />

      {/* 8. Snapshot Photo Modal */}
      <SnapshotModal
        imageUrl={snapshotUrl}
        onClose={() => setSnapshotUrl(null)}
      />

      {/* 9. Workflow & Instructions Guide Modal */}
      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* 10. Test on Mobile & Vercel Guide Modal */}
      <MobileQrModal
        isOpen={isMobileQrOpen}
        onClose={() => setIsMobileQrOpen(false)}
      />
    </div>
  );
}
