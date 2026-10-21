/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Camera, Move, RotateCw, Box, Upload, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    {
      icon: <Camera className="w-5 h-5 text-cyan-400" />,
      title: '1. Scan Your Room Floor',
      desc: 'Point your camera toward an open floor space. The cyan holographic reticle automatically locks onto the ground plane at eye level.',
    },
    {
      icon: <Box className="w-5 h-5 text-cyan-400" />,
      title: '2. Select or Import Furniture',
      desc: 'Choose from modern 3-seater sofas, dining tables, lounge chairs, or click "+ Add Custom GLB" to upload your own 3D model.',
    },
    {
      icon: <Move className="w-5 h-5 text-cyan-400" />,
      title: '3. Drag & Drop on Floor',
      desc: 'Touch or click any placed furniture and drag it across your room in real time. It glides smoothly along the physical floor with contact shadows.',
    },
    {
      icon: <RotateCw className="w-5 h-5 text-cyan-400" />,
      title: '4. Rotate, Scale & Customize Colors',
      desc: 'Use the rotation slider or quick -45°/+45° buttons to align furniture with walls. Pick velvet, linen, leather, and wood finishes.',
    },
    {
      icon: <Upload className="w-5 h-5 text-cyan-400" />,
      title: '5. Custom GLB 3D Model Support',
      desc: 'Drop your own .glb files or paste remote URLs. The engine automatically normalizes scale, grounds the base, and computes exact dimensions.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Awgzo WebAR Workflow Guide</h3>
              <p className="text-xs text-zinc-400">Real-time interior layout visualization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80"
              >
                <div className="p-2 rounded-lg bg-zinc-900 shrink-0 border border-zinc-800">
                  {step.icon}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-100">{step.title}</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-zinc-300">
              <span className="font-semibold text-emerald-400">Privacy Guaranteed: </span>
              Camera frames are processed entirely on-device inside your browser. No camera video is ever stored or uploaded to remote servers.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Got it, Start Visualizing
          </button>
        </div>
      </div>
    </div>
  );
};
