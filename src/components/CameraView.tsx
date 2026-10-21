/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, RefreshCw, AlertCircle, Eye } from 'lucide-react';
import { CameraStatus } from '../hooks/useCamera.ts';
import { ViewMode } from '../types.ts';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraStatus: CameraStatus;
  errorMessage: string | null;
  facingMode: 'environment' | 'user';
  viewMode: ViewMode;
  onRetryCamera: () => void;
  onSwitchToStudio: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  cameraStatus,
  errorMessage,
  facingMode,
  viewMode,
  onRetryCamera,
  onSwitchToStudio,
}) => {
  const isUserFacing = facingMode === 'user';
  const isCameraMode = viewMode === 'ar-camera';

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-zinc-950 pointer-events-none select-none">
      {/* 1. Camera Video Element */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isCameraMode && cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
        } ${isUserFacing ? 'scale-x-[-1]' : ''}`}
      />

      {/* 2. Simulated Studio Room Backdrop (Active when camera is off/denied or studio mode selected) */}
      {(!isCameraMode || cameraStatus !== 'active') && (
        <div className="absolute inset-0 flex flex-col justify-end bg-radial-[at_50%_40%] from-zinc-800 via-zinc-900 to-zinc-950">
          {/* Subtle architectural wall-floor horizon line */}
          <div className="w-full h-1/2 bg-gradient-to-t from-zinc-900/90 via-zinc-950/60 to-transparent relative border-t border-zinc-800/40">
            {/* Perspective room floor guidelines */}
            <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#52525b_1px,transparent_1px),linear-gradient(to_bottom,#52525b_1px,transparent_1px)] bg-[size:4rem_4rem] [transform:perspective(600px)_rotateX(60deg)_scale(2)] origin-bottom" />
          </div>
        </div>
      )}

      {/* 3. Camera Requesting State Banner */}
      {isCameraMode && cameraStatus === 'requesting' && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-auto bg-zinc-900/90 border border-zinc-700/80 rounded-full px-4 py-2 flex items-center gap-2.5 text-xs text-zinc-300 backdrop-blur-md shadow-xl animate-pulse">
          <Camera className="w-4 h-4 text-cyan-400" />
          <span>Accessing live camera stream...</span>
        </div>
      )}

      {/* 4. Permission Denied / Error Overlay */}
      {isCameraMode && (cameraStatus === 'denied' || cameraStatus === 'unsupported') && (
        <div className="absolute top-20 inset-x-4 max-w-md mx-auto pointer-events-auto bg-zinc-900/95 border border-zinc-700 rounded-2xl p-4 shadow-2xl backdrop-blur-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-zinc-100">Camera Feed Unavailable</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {errorMessage || 'Camera access was blocked or denied by browser security. You can retry permission or continue in 3D Studio mode.'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={onRetryCamera}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Access
                </button>
                <button
                  onClick={onSwitchToStudio}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Use 3D Studio Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
