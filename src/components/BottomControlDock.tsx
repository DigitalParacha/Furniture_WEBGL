/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Armchair,
  Layers,
  RotateCw,
  Sliders,
  Trash2,
  Copy,
  Plus,
  Compass,
  Sun,
  Grid,
  ChevronDown,
  ChevronUp,
  X,
  Palette,
  Maximize2,
  Box,
  Eye,
  Camera,
  Lock,
  Unlock,
  Target,
  CheckCircle2,
} from 'lucide-react';
import {
  FurnitureModelDef,
  PlacedFurniture,
  ViewMode,
  ActiveTab,
  FurnitureCategory,
  PlaneDetectionState,
} from '../types.ts';
import { COLOR_PALETTES } from '../models/catalog.ts';

interface BottomControlDockProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  catalog: FurnitureModelDef[];
  selectedItem: PlacedFurniture | null;
  viewMode: ViewMode;
  showGrid: boolean;
  lightIntensity: number;
  planeState: PlaneDetectionState;
  groundDistance: number;
  floorElevation: number;
  activeCatalogModel: FurnitureModelDef | null;
  onSelectItemToSpawn: (modelDef: FurnitureModelDef) => void;
  onPlaceAtReticle: () => void;
  onOpenGlbModal: () => void;
  onRotateDegrees: (degrees: number) => void;
  onSetRotationRadians: (radians: number) => void;
  onScaleChange: (scale: number) => void;
  onElevationChange: (elevation: number) => void;
  onFloorElevationChange: (elevation: number) => void;
  onColorChange: (colorHex: string) => void;
  onDuplicateItem: () => void;
  onDeleteItem: () => void;
  onDeselectItem: () => void;
  onToggleLockItem: () => void;
  onToggleViewMode: () => void;
  onToggleGrid: () => void;
  onLightIntensityChange: (intensity: number) => void;
  onResetCamera: () => void;
  onClearAll: () => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  activeTab,
  setActiveTab,
  catalog,
  selectedItem,
  viewMode,
  showGrid,
  lightIntensity,
  planeState,
  groundDistance,
  floorElevation,
  activeCatalogModel,
  onSelectItemToSpawn,
  onPlaceAtReticle,
  onOpenGlbModal,
  onRotateDegrees,
  onSetRotationRadians,
  onScaleChange,
  onElevationChange,
  onFloorElevationChange,
  onColorChange,
  onDuplicateItem,
  onDeleteItem,
  onDeselectItem,
  onToggleLockItem,
  onToggleViewMode,
  onToggleGrid,
  onLightIntensityChange,
  onResetCamera,
  onClearAll,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | FurnitureCategory>('all');

  const filteredCatalog = catalog.filter((item) => {
    if (categoryFilter === 'all') return true;
    return item.category === categoryFilter;
  });

  // Convert radians to degrees for rotation slider (0 to 360)
  const currentRotationDeg = selectedItem
    ? Math.round((((selectedItem.rotationY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI))
    : 0;

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-30 w-full transition-transform duration-300 ease-out pointer-events-none select-none flex flex-col items-center ${
        isCollapsed ? 'translate-y-[calc(100%-42px)]' : 'translate-y-0'
      }`}
      style={{
        bottom: '16px',
        maxWidth: 'min(920px, 95vw)',
      }}
    >
      {/* 0. Ground Plane Detection Indicator & Place at Reticle CTA Button */}
      <div className="pointer-events-auto mb-2 flex items-center gap-2">
        {planeState === 'locked' ? (
          <button
            onClick={onPlaceAtReticle}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-xl shadow-cyan-500/25 transition-all cursor-pointer border border-cyan-300/40 active:scale-95"
          >
            <Target className="w-4 h-4 text-cyan-100" />
            <span>Place {activeCatalogModel?.name || 'Selected Furniture'} Here</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 text-cyan-200 font-mono">
              {groundDistance}m
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 text-zinc-300 text-xs border border-zinc-700/80 shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Aim phone towards floor to detect ground surface</span>
          </div>
        )}
      </div>

      {/* 1. Collapse / Expand Drawer Toggle Tab */}
      <div className="pointer-events-auto mb-1">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 shadow-lg text-[11px] font-medium backdrop-blur-md transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Main Glassmorphic Dock Container */}
      <div className="pointer-events-auto w-full bg-zinc-900/95 border border-zinc-800/90 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Armchair className="w-3.5 h-3.5" />
              <span>Catalog</span>
            </button>

            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer relative ${
                activeTab === 'edit'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Transform & Lock</span>
              {selectedItem && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('environment')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'environment'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Ground & AR</span>
            </button>
          </div>

          {/* Quick upload GLB trigger shortcut */}
          <button
            onClick={onOpenGlbModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 text-cyan-400" />
            <span>Add Custom GLB</span>
          </button>
        </div>

        {/* Tab 1: Furniture Catalog Content */}
        {activeTab === 'catalog' && (
          <div className="p-3">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 pb-2.5 overflow-x-auto text-[11px]">
              {(
                [
                  { id: 'all', label: 'All Items' },
                  { id: 'seating', label: 'Couches & Chairs' },
                  { id: 'tables', label: 'Tables' },
                  { id: 'lighting', label: 'Lighting' },
                  { id: 'plants', label: 'Botanicals' },
                  { id: 'custom', label: 'Custom GLBs' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-zinc-200 text-zinc-950 font-semibold'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Horizontal Scrollable Card Deck */}
            <div className="flex items-stretch gap-2.5 overflow-x-auto py-1 scroll-smooth">
              {/* + Add Custom GLB Card */}
              <button
                onClick={onOpenGlbModal}
                className="shrink-0 w-36 rounded-xl border border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 p-3 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 group-hover:scale-105 flex items-center justify-center mb-2 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-cyan-300">
                  Import GLB
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Upload 3D model</span>
              </button>

              {/* Catalog Items */}
              {filteredCatalog.map((item) => {
                const isSelectedForSpawn = activeCatalogModel?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectItemToSpawn(item)}
                    className={`shrink-0 w-44 rounded-xl border p-2.5 flex flex-col text-left transition-all cursor-pointer group ${
                      isSelectedForSpawn
                        ? 'border-cyan-400 bg-cyan-950/30'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {item.category}
                      </span>
                      {isSelectedForSpawn && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500 text-zinc-950">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                      {item.defaultDimensions.width}m × {item.defaultDimensions.depth}m
                    </div>
                    <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-cyan-400 font-medium">
                      <span>Place on floor</span>
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Transform & Edit Content */}
        {activeTab === 'edit' && (
          <div className="p-3">
            {!selectedItem ? (
              <div className="py-4 px-3 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-1.5">
                <Box className="w-6 h-6 text-zinc-600" />
                <p>No furniture item selected.</p>
                <p className="text-[11px] text-zinc-500">
                  Tap any 3D model on the floor to adjust rotation, scale, lock its position, or drag it.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Selected Item Title & Actions Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-xs font-bold text-zinc-100">{selectedItem.name}</span>
                    <span className="text-[11px] text-zinc-400">
                      ({selectedItem.dimensions.width}m × {selectedItem.dimensions.depth}m)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Position Lock Toggle Button */}
                    <button
                      onClick={onToggleLockItem}
                      title={selectedItem.isLocked ? 'Position is locked. Click to allow dragging.' : 'Position is unlocked. Click to freeze.'}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                        selectedItem.isLocked
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {selectedItem.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>{selectedItem.isLocked ? 'Position Locked' : 'Unlocked (Can Drag)'}</span>
                    </button>

                    <button
                      onClick={onDuplicateItem}
                      title="Duplicate item"
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Duplicate</span>
                    </button>
                    <button
                      onClick={onDeleteItem}
                      title="Delete item"
                      className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                    <button
                      onClick={onDeselectItem}
                      title="Deselect"
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Controls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Rotation Control */}
                  <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <RotateCw className="w-3 h-3 text-cyan-400" /> Rotate
                      </span>
                      <span className="font-mono text-zinc-200 font-semibold">{currentRotationDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={currentRotationDeg}
                      onChange={(e) => onSetRotationRadians((Number(e.target.value) * Math.PI) / 180)}
                      className="w-full accent-cyan-400 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1 mt-2">
                      <button
                        onClick={() => onRotateDegrees(-45)}
                        className="flex-1 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors cursor-pointer"
                      >
                        -45°
                      </button>
                      <button
                        onClick={() => onRotateDegrees(45)}
                        className="flex-1 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors cursor-pointer"
                      >
                        +45°
                      </button>
                      <button
                        onClick={() => onRotateDegrees(180)}
                        className="flex-1 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors cursor-pointer"
                      >
                        180°
                      </button>
                    </div>
                  </div>

                  {/* Scale & Elevation */}
                  <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Maximize2 className="w-3 h-3 text-cyan-400" /> Scale
                        </span>
                        <span className="font-mono text-zinc-200 font-semibold">{selectedItem.scale.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={selectedItem.scale}
                        onChange={(e) => onScaleChange(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-400">Elevation</span>
                        <span className="font-mono text-zinc-200 font-semibold">{selectedItem.elevation.toFixed(2)}m</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1.2"
                        step="0.02"
                        value={selectedItem.elevation}
                        onChange={(e) => onElevationChange(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Color / Fabric Swatches */}
                  <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center gap-1 text-xs text-zinc-400 mb-2">
                      <Palette className="w-3 h-3 text-cyan-400" />
                      <span>Fabric & Finish Color</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_PALETTES.map((palette) => (
                        <button
                          key={palette.hex}
                          onClick={() => onColorChange(palette.hex)}
                          title={palette.name}
                          className="h-7 rounded-lg border border-zinc-700/80 hover:scale-105 transition-transform flex items-center justify-center cursor-pointer relative"
                          style={{ backgroundColor: palette.hex }}
                        >
                          {selectedItem.colorHex === palette.hex && (
                            <span className="w-2 h-2 rounded-full bg-white shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Environment & AR Settings */}
        {activeTab === 'environment' && (
          <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* View Mode & Surface Calibration */}
            <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-200 block mb-1">Visualization Mode</span>
                <span className="text-[11px] text-zinc-400 block mb-2">
                  Switch between real-time camera AR or simulated 3D room.
                </span>
              </div>
              <button
                onClick={onToggleViewMode}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  viewMode === 'ar-camera'
                    ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                {viewMode === 'ar-camera' ? (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Using Camera AR</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>3D Studio Room Mode</span>
                  </>
                )}
              </button>
            </div>

            {/* Floor Plane Height Calibration & Lighting */}
            <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 space-y-2">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-cyan-400" /> Floor Level Offset
                  </span>
                  <span className="font-mono text-zinc-300">{floorElevation.toFixed(2)}m</span>
                </div>
                <input
                  type="range"
                  min="-0.4"
                  max="0.4"
                  step="0.02"
                  value={floorElevation}
                  onChange={(e) => onFloorElevationChange(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Sun className="w-3 h-3 text-cyan-400" /> Room Lighting
                  </span>
                  <span className="font-mono text-zinc-300">{Math.round(lightIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.0"
                  step="0.1"
                  value={lightIntensity}
                  onChange={(e) => onLightIntensityChange(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Room Reset & Clear */}
            <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 flex flex-col justify-between gap-2">
              <button
                onClick={onResetCamera}
                className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Reset Camera Perspective
              </button>
              <button
                onClick={onClearAll}
                className="w-full py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors cursor-pointer"
              >
                Clear All Placed Models
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
