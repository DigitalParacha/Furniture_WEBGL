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
import { INITIAL_CATALOG, instantiateModel } from './models/catalog.ts';
import { FurnitureModelDef, PlacedFurniture, ViewMode, ActiveTab } from './types.ts';
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
  const [placedItemsCount, setPlacedItemsCount] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<PlacedFurniture | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('ar-camera');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [lightIntensity, setLightIntensity] = useState<number>(1.0);
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
      onFpsUpdate: (currentFps) => {
        setFps(currentFps);
      },
    });

    sceneManagerRef.current = manager;

    // Spawn an initial demo couch and coffee table layout so the user immediately has a working interactive demo!
    const defaultSofaDef = INITIAL_CATALOG.find((m) => m.id === 'sofa-modern-3seat')!;
    const sofaInstance = instantiateModel(defaultSofaDef);
    manager.addFurniture(
      {
        instanceId: `sofa-${Date.now()}`,
        modelId: defaultSofaDef.id,
        name: defaultSofaDef.name,
        object3D: sofaInstance.object3D,
        dimensions: sofaInstance.dimensions,
        colorHex: '#262a30',
      },
      new THREE.Vector3(0, 0, -0.4)
    );

    const defaultTableDef = INITIAL_CATALOG.find((m) => m.id === 'table-oval-coffee')!;
    const tableInstance = instantiateModel(defaultTableDef);
    manager.addFurniture(
      {
        instanceId: `coffee-table-${Date.now() + 1}`,
        modelId: defaultTableDef.id,
        name: defaultTableDef.name,
        object3D: tableInstance.object3D,
        dimensions: tableInstance.dimensions,
        colorHex: '#f4f4f5',
      },
      new THREE.Vector3(0, 0, 0.7)
    );

    setPlacedItemsCount(manager.placedItems.size);

    // Resize listener
    const handleResize = () => {
      manager.updateDimensions();
    };
    window.addEventListener('resize', handleResize);

    return () => {
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
        setSnapshotUrl(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  // Furniture Action Handlers
  const handleSpawnModel = useCallback((modelDef: FurnitureModelDef) => {
    if (!sceneManagerRef.current) return;
    const cachedObj = customGlbCacheRef.current.get(modelDef.id);
    const instance = instantiateModel(modelDef, cachedObj);

    const placed = sceneManagerRef.current.addFurniture({
      instanceId: `${modelDef.id}-${Date.now()}`,
      modelId: modelDef.id,
      name: modelDef.name,
      object3D: instance.object3D,
      dimensions: instance.dimensions,
      colorHex: modelDef.colors?.[0]?.hex,
      isCustomGlb: modelDef.isCustomGlb,
    });

    setPlacedItemsCount(sceneManagerRef.current.placedItems.size);
    setSelectedItem({ ...placed });
    setActiveTab('edit');
  }, []);

  const handleCustomGlbLoaded = useCallback((modelDef: FurnitureModelDef, object3D: THREE.Group) => {
    // Cache the root template group for future cloning
    customGlbCacheRef.current.set(modelDef.id, object3D);

    // Add to local catalog state
    setCatalog((prev) => [modelDef, ...prev]);

    // Place into current scene immediately
    handleSpawnModel(modelDef);
  }, [handleSpawnModel]);

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

  const handleColorChange = useCallback((colorHex: string) => {
    if (!sceneManagerRef.current || !selectedItem) return;
    const item = sceneManagerRef.current.placedItems.get(selectedItem.instanceId);
    if (!item) return;

    item.colorHex = colorHex;
    applyColorToModel(item.object3D, colorHex);
    setSelectedItem({ ...item });
  }, [selectedItem]);

  const handleDuplicateItem = useCallback(() => {
    if (!sceneManagerRef.current || !selectedItem) return;
    const modelDef = catalog.find((m) => m.id === selectedItem.modelId);
    if (!modelDef) return;

    const cachedObj = customGlbCacheRef.current.get(modelDef.id);
    const instance = instantiateModel(modelDef, cachedObj, selectedItem.colorHex);

    // Offset slightly from original position
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
      },
      offsetPos
    );

    // Match rotation and scale
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
    if (nextMode === 'ar-camera' && cameraStatus !== 'active') {
      startCamera();
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
        hasTorch={hasTorch}
        isTorchOn={isTorchOn}
        onToggleTorch={toggleTorch}
        onToggleFacingMode={toggleFacingMode}
        onOpenGlbModal={() => setIsGlbModalOpen(true)}
        onOpenMobileQr={() => setIsMobileQrOpen(true)}
        onCaptureSnapshot={handleCaptureSnapshot}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* 4. Real-time Dimension Overlay for Selected Furniture */}
      <DimensionBadge selectedItem={selectedItem} />

      {/* 5. Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <BottomControlDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        catalog={catalog}
        selectedItem={selectedItem}
        viewMode={viewMode}
        showGrid={showGrid}
        lightIntensity={lightIntensity}
        onSelectItemToSpawn={handleSpawnModel}
        onOpenGlbModal={() => setIsGlbModalOpen(true)}
        onRotateDegrees={handleRotateDegrees}
        onSetRotationRadians={handleSetRotationRadians}
        onScaleChange={handleScaleChange}
        onElevationChange={handleElevationChange}
        onColorChange={handleColorChange}
        onDuplicateItem={handleDuplicateItem}
        onDeleteItem={handleDeleteItem}
        onDeselectItem={handleDeselectItem}
        onToggleViewMode={handleToggleViewMode}
        onToggleGrid={handleToggleGrid}
        onLightIntensityChange={handleLightIntensityChange}
        onResetCamera={handleResetCamera}
        onClearAll={handleClearAll}
      />

      {/* 6. Custom GLB Upload Modal */}
      <CustomGlbModal
        isOpen={isGlbModalOpen}
        onClose={() => setIsGlbModalOpen(false)}
        onModelLoaded={handleCustomGlbLoaded}
      />

      {/* 7. Snapshot Photo Modal */}
      <SnapshotModal
        imageUrl={snapshotUrl}
        onClose={() => setSnapshotUrl(null)}
      />

      {/* 8. Workflow & Instructions Guide Modal */}
      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* 9. Test on Mobile & Vercel Guide Modal */}
      <MobileQrModal
        isOpen={isMobileQrOpen}
        onClose={() => setIsMobileQrOpen(false)}
      />
    </div>
  );
}
