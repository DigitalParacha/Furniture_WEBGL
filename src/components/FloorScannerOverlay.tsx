/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Scan, CheckCircle2, RotateCcw, ArrowDown, Sparkles, Smartphone } from 'lucide-react';
import { PlaneDetectionState } from '../types.ts';

interface FloorScannerOverlayProps {
  planeState: PlaneDetectionState;
  groundDistance: number;
  floorConfirmed: boolean;
  onConfirmFloor: () => void;
  onRescanFloor: () => void;
}

export const FloorScannerOverlay: React.FC<FloorScannerOverlayProps> = ({
  planeState,
  groundDistance,
  floorConfirmed,
  onConfirmFloor,
  onRescanFloor,
}) => {
  // If floor has already been confirmed, show minimal re-scan button or nothing
  if (floorConfirmed) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <button
          onClick={onRescanFloor}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white text-[11px] font-medium shadow-lg backdrop-blur-md transition-all cursor-pointer"
        >
          <RotateCcw className="w-3 h-3 text-cyan-400" />
          <span>Floor Locked ({groundDistance}m) • Tap to Re-scan</span>
        </button>
      </div>
    );
  }

  // FLOOR DETECTION ONBOARDING (ARCore Style)
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Banner: Step 1 Indicator */}
      <div className="w-full max-w-md mx-auto pt-16 pointer-events-auto">
        <div className="bg-zinc-900/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Scan className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                  Step 1 of 2 • Plane Detection
                </span>
                <h3 className="text-sm font-bold text-zinc-100">
                  {planeState === 'locked' ? 'Floor Surface Detected!' : 'Scanning Floor Plane...'}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-zinc-400 block font-mono">ARCore Mode</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  planeState === 'locked'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {planeState === 'locked' ? 'Surface Ready' : 'Searching'}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed">
            {planeState === 'locked'
              ? `A flat floor surface has been detected ~${groundDistance}m in front of you. Confirm this plane to begin placing furniture.`
              : 'Point your camera down towards the floor at a 45° angle and pan slowly side to side until the cyan plane grid appears.'}
          </p>
        </div>
      </div>

      {/* Center Reticle Visual Guide (when scanning) */}
      {planeState !== 'locked' && (
        <div className="my-auto mx-auto text-center pointer-events-none flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-cyan-400/60 flex items-center justify-center animate-pulse bg-cyan-500/5">
            <ArrowDown className="w-8 h-8 text-cyan-400 animate-bounce" />
          </div>
          <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1 rounded-full mt-3 backdrop-blur-sm">
            Aim camera at floor
          </span>
        </div>
      )}

      {/* Bottom Action: Confirm Detected Floor Plane */}
      <div className="w-full max-w-sm mx-auto pb-24 pointer-events-auto flex flex-col items-center gap-2">
        {planeState === 'locked' ? (
          <button
            onClick={onConfirmFloor}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 font-bold text-sm shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 animate-bounce"
            style={{ animationDuration: '2s' }}
          >
            <CheckCircle2 className="w-5 h-5 text-zinc-950" />
            <span>Confirm Floor & Open Furniture Catalogue</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/70 text-zinc-300 text-xs backdrop-blur-md border border-zinc-800">
            <Smartphone className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Move phone slowly to map floor surface</span>
          </div>
        )}
      </div>
    </div>
  );
};
