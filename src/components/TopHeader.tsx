/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Camera,
  RefreshCw,
  HelpCircle,
  Upload,
  Zap,
  ZapOff,
  Eye,
  SlidersHorizontal,
  Layers,
  Box,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { ViewMode } from '../types.ts';
import { CameraStatus } from '../hooks/useCamera.ts';

interface TopHeaderProps {
  viewMode: ViewMode;
  cameraStatus: CameraStatus;
  itemsCount: number;
  fps: number;
  hasTorch: boolean;
  isTorchOn: boolean;
  onToggleTorch: () => void;
  onToggleFacingMode: () => void;
  onOpenGlbModal: () => void;
  onOpenMobileQr: () => void;
  onCaptureSnapshot: () => void;
  onOpenGuide: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  viewMode,
  cameraStatus,
  itemsCount,
  fps,
  hasTorch,
  isTorchOn,
  onToggleTorch,
  onToggleFacingMode,
  onOpenGlbModal,
  onOpenMobileQr,
  onCaptureSnapshot,
  onOpenGuide,
}) => {
  return (
    <header className="fixed top-0 inset-x-0 z-30 pointer-events-none select-none p-3 sm:p-4 flex items-center justify-between gap-2">
      {/* 1. Brand Mark & Subtitle */}
      <div className="pointer-events-auto flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl px-3.5 py-2 backdrop-blur-md shadow-lg">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
          <Box className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-tight text-white uppercase font-sans">
              Awgzo
            </span>
            <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 uppercase">
              WebAR
            </span>
          </div>
          <div className="text-[10px] text-zinc-400 font-medium">Interior Visualizer</div>
        </div>
      </div>

      {/* 2. Center Status Badges (Static, clean indicators) */}
      <div className="hidden md:flex items-center gap-2 pointer-events-auto">
        {/* Mode badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-[11px] font-medium text-zinc-300 backdrop-blur-md">
          {viewMode === 'ar-camera' && cameraStatus === 'active' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Camera AR Active</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>3D Room Studio</span>
            </>
          )}
        </div>

        {/* Tracking status */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-[11px] font-medium text-zinc-300 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span>Surface Plane Locked</span>
        </div>

        {/* Item count */}
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-[11px] font-medium text-zinc-300 backdrop-blur-md">
          <span className="text-zinc-100 font-bold">{itemsCount}</span>
          <span className="text-zinc-400">placed</span>
        </div>

        {/* FPS */}
        <div className="px-2.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 backdrop-blur-md">
          {fps || 60} fps
        </div>
      </div>

      {/* 3. Action Buttons Right */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        {/* Flip camera (mobile only) */}
        {viewMode === 'ar-camera' && cameraStatus === 'active' && (
          <button
            onClick={onToggleFacingMode}
            title="Switch front/back camera"
            className="p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white transition-colors cursor-pointer shadow-md backdrop-blur-md"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Torch toggle */}
        {hasTorch && viewMode === 'ar-camera' && (
          <button
            onClick={onToggleTorch}
            title={isTorchOn ? 'Turn Flash Off' : 'Turn Flash On'}
            className={`p-2 rounded-xl border border-zinc-800/80 transition-colors cursor-pointer shadow-md backdrop-blur-md ${
              isTorchOn ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          </button>
        )}

        {/* Test on Phone button */}
        <button
          onClick={onOpenMobileQr}
          title="Test on Phone via QR code or Vercel"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-cyan-300 font-medium text-xs shadow-md backdrop-blur-md transition-all cursor-pointer"
        >
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Test on Phone</span>
        </button>

        {/* Snapshot / Photo capture button */}
        <button
          onClick={onCaptureSnapshot}
          title="Take High-Res AR Photo"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">Snapshot</span>
        </button>

        {/* Guide / Instructions button */}
        <button
          onClick={onOpenGuide}
          title="Workflow & Guide"
          className="p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white transition-colors cursor-pointer shadow-md backdrop-blur-md"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
