/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { FurnitureModelDef, PlacedFurniture } from '../types.ts';
import {
  createProceduralSofa,
  createProceduralDiningTable,
  createProceduralCoffeeTable,
  createProceduralAccentChair,
  createProceduralFloorLamp,
  createProceduralPlant,
} from './proceduralFurniture.ts';
import { normalizeGlbModel, applyColorToModel } from './glbLoader.ts';

export const COLOR_PALETTES = [
  { name: 'Nordic Charcoal', hex: '#262a30' },
  { name: 'Emerald Velvet', hex: '#1b4332' },
  { name: 'Cognac Leather', hex: '#945228' },
  { name: 'Warm Cream', hex: '#e8dec8' },
  { name: 'Dusty Indigo', hex: '#2c3e50' },
  { name: 'Scandinavian Oak', hex: '#c99a6b' },
  { name: 'Matte Onyx', hex: '#18181b' },
];

export const INITIAL_CATALOG: FurnitureModelDef[] = [
  {
    id: 'sofa-modern-3seat',
    name: 'Modern 3-Seat Sofa',
    category: 'seating',
    description: 'Contemporary deep-cushioned sectional sofa with tapered wooden legs and brass ferrules.',
    defaultDimensions: { width: 2.2, depth: 0.95, height: 0.82 },
    colors: [
      { name: 'Nordic Charcoal', hex: '#262a30' },
      { name: 'Emerald Velvet', hex: '#1b4332' },
      { name: 'Dusty Indigo', hex: '#2c3e50' },
      { name: 'Warm Cream', hex: '#d9cdb8' },
    ],
  },
  {
    id: 'table-scandi-dining',
    name: 'Scandinavian Dining Table',
    category: 'tables',
    description: 'Solid chamfered timber dining table with angled legs and brushed brass caps.',
    defaultDimensions: { width: 1.8, depth: 0.9, height: 0.76 },
    colors: [
      { name: 'Natural Oak', hex: '#c99a6b' },
      { name: 'Dark Walnut', hex: '#5c3a21' },
      { name: 'Bleached Ash', hex: '#e3d2be' },
    ],
  },
  {
    id: 'table-oval-coffee',
    name: 'Calacatta Coffee Table',
    category: 'tables',
    description: 'Minimalist oval coffee table with matte steel architectural base and lower shelf.',
    defaultDimensions: { width: 1.15, depth: 0.65, height: 0.44 },
    colors: [
      { name: 'Pure Marble', hex: '#f4f4f5' },
      { name: 'Nero Marquina', hex: '#27272a' },
      { name: 'Smoked Amber', hex: '#a16207' },
    ],
  },
  {
    id: 'chair-accent-lounge',
    name: 'Curved Lounge Chair',
    category: 'seating',
    description: 'Sculptural mid-century accent armchair with tailored upholstery and steel splayed legs.',
    defaultDimensions: { width: 0.82, depth: 0.84, height: 0.8 },
    colors: [
      { name: 'Forest Green', hex: '#1b4332' },
      { name: 'Burnt Ochre', hex: '#b45309' },
      { name: 'Midnight', hex: '#1e293b' },
      { name: 'Sand Bouclé', hex: '#e2d9cc' },
    ],
  },
  {
    id: 'lighting-arc-lamp',
    name: 'Minimalist Arc Floor Lamp',
    category: 'lighting',
    description: 'Overarching brass floor lamp with cylindrical shade and ambient room illumination.',
    defaultDimensions: { width: 0.55, depth: 0.85, height: 1.78 },
  },
  {
    id: 'plant-fiddle-leaf',
    name: 'Potted Fiddle Leaf Fig',
    category: 'plants',
    description: 'Natural indoor botanical accent in a ribbed ceramic planter with oak tripod base.',
    defaultDimensions: { width: 0.65, depth: 0.65, height: 1.25 },
  },
];

// Sample public GLB models for instant testing of custom GLB imports
export const SAMPLE_ONLINE_GLBS = [
  {
    name: 'Sheen Chair (Khronos Sample)',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF-Binary/SheenChair.glb',
    dimensions: { width: 0.8, depth: 0.8, height: 0.85 },
  },
  {
    name: 'Bar Stool (Khronos Sample)',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/GlamVelvetSofa/glTF-Binary/GlamVelvetSofa.glb',
    dimensions: { width: 2.1, depth: 0.9, height: 0.8 },
  },
];

/**
 * Instantiates a 3D Object for a given catalog model
 */
export function instantiateModel(
  modelDef: FurnitureModelDef,
  customCachedObject?: THREE.Group,
  colorOverride?: string
): { object3D: THREE.Group; dimensions: { width: number; depth: number; height: number } } {
  // If it's a custom GLB model
  if (modelDef.isCustomGlb && customCachedObject) {
    const clone = customCachedObject.clone(true);
    if (colorOverride) {
      applyColorToModel(clone, colorOverride);
    }
    return {
      object3D: clone,
      dimensions: modelDef.defaultDimensions,
    };
  }

  // Procedural models
  const initialColor = colorOverride || modelDef.colors?.[0]?.hex;
  let group: THREE.Group;

  switch (modelDef.id) {
    case 'sofa-modern-3seat':
      group = createProceduralSofa(initialColor || '#262a30');
      break;
    case 'table-scandi-dining':
      group = createProceduralDiningTable(initialColor || '#c99a6b');
      break;
    case 'table-oval-coffee':
      group = createProceduralCoffeeTable(initialColor || '#f4f4f5');
      break;
    case 'chair-accent-lounge':
      group = createProceduralAccentChair(initialColor || '#1b4332');
      break;
    case 'lighting-arc-lamp':
      group = createProceduralFloorLamp();
      break;
    case 'plant-fiddle-leaf':
      group = createProceduralPlant();
      break;
    default:
      if (customCachedObject) {
        group = customCachedObject.clone(true);
      } else {
        group = createProceduralSofa(initialColor || '#262a30');
      }
      break;
  }

  return {
    object3D: group,
    dimensions: modelDef.defaultDimensions,
  };
}
