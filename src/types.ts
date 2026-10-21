/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export type FurnitureCategory = 'seating' | 'tables' | 'lighting' | 'plants' | 'custom';

export interface FurnitureModelDef {
  id: string;
  name: string;
  category: FurnitureCategory;
  description: string;
  defaultDimensions: { width: number; depth: number; height: number }; // in meters
  thumbnailIcon?: string;
  colors?: { name: string; hex: string }[];
  isCustomGlb?: boolean;
  glbUrl?: string;
  glbBlob?: Blob;
}

export interface PlacedFurniture {
  instanceId: string;
  modelId: string;
  name: string;
  object3D: THREE.Group;
  position: THREE.Vector3;
  rotationY: number;
  scale: number;
  elevation: number;
  colorHex?: string;
  dimensions: { width: number; depth: number; height: number };
  isCustomGlb?: boolean;
  isLocked?: boolean; // When locked, cannot be dragged
}

export type ViewMode = 'ar-camera' | 'studio-room';

export type PlaneDetectionState = 'scanning' | 'detected' | 'locked';

export type ActiveTab = 'catalog' | 'edit' | 'environment';
