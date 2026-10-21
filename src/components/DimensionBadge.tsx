/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Ruler, Maximize } from 'lucide-react';
import { PlacedFurniture } from '../types.ts';

interface DimensionBadgeProps {
  selectedItem: PlacedFurniture | null;
}

export const DimensionBadge: React.FC<DimensionBadgeProps> = ({ selectedItem }) => {
  if (!selectedItem) return null;

  const w = (selectedItem.dimensions.width * selectedItem.scale).toFixed(2);
  const d = (selectedItem.dimensions.depth * selectedItem.scale).toFixed(2);
  const h = (selectedItem.dimensions.height * selectedItem.scale).toFixed(2);

  // Convert meters to approximate feet & inches
  const toFeetInches = (m: number) => {
    const totalInches = Math.round(m * 39.3701);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}' ${inches}"`;
  };

  return (
    <div className="fixed top-18 right-3 sm:right-4 z-20 pointer-events-none select-none max-w-xs animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="bg-zinc-900/90 border border-zinc-700/80 rounded-2xl p-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold mb-1">
          <Ruler className="w-3.5 h-3.5" />
          <span>Real-world Footprint</span>
        </div>

        <div className="text-[11px] font-medium text-zinc-100 flex items-center gap-1">
          <span>{selectedItem.name}</span>
          <span className="text-[10px] text-zinc-400">({selectedItem.scale.toFixed(2)}x)</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-zinc-800 text-center font-mono">
          <div className="bg-zinc-950/70 p-1.5 rounded-lg border border-zinc-800/80">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-sans">Width</div>
            <div className="text-xs font-bold text-zinc-200">{w}m</div>
            <div className="text-[9px] text-zinc-500 font-sans">{toFeetInches(Number(w))}</div>
          </div>

          <div className="bg-zinc-950/70 p-1.5 rounded-lg border border-zinc-800/80">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-sans">Depth</div>
            <div className="text-xs font-bold text-zinc-200">{d}m</div>
            <div className="text-[9px] text-zinc-500 font-sans">{toFeetInches(Number(d))}</div>
          </div>

          <div className="bg-zinc-950/70 p-1.5 rounded-lg border border-zinc-800/80">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-sans">Height</div>
            <div className="text-xs font-bold text-zinc-200">{h}m</div>
            <div className="text-[9px] text-zinc-500 font-sans">{toFeetInches(Number(h))}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
