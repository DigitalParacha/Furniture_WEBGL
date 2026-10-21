/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export interface LoadedGlbResult {
  group: THREE.Group;
  dimensions: { width: number; depth: number; height: number };
  originalBoundingBox: THREE.Box3;
}

/**
 * Normalizes, grounds to Y=0, centers, and configures shadows for a GLTF scene
 */
export function normalizeGlbModel(
  gltfScene: THREE.Group | THREE.Object3D,
  targetMaxWidthOrDepth: number = 1.8 // default ~1.8m furniture scale
): LoadedGlbResult {
  const root = new THREE.Group();
  root.name = 'GLB_Furniture_Root';

  // Clone scene to avoid reusing shared buffers
  const model = gltfScene.clone(true) as THREE.Group;
  root.add(model);

  // Compute original bounding box
  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const center = new THREE.Vector3();
  bbox.getCenter(center);

  // Auto scale if model is abnormally small (< 0.1m) or huge (> 10m)
  const maxDim = Math.max(size.x, size.z, 0.01);
  let scaleFactor = 1.0;
  if (maxDim > 5.0 || maxDim < 0.2) {
    scaleFactor = targetMaxWidthOrDepth / maxDim;
  }
  model.scale.setScalar(scaleFactor);

  // Recalculate bbox after scaling
  const scaledBbox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  const scaledSize = new THREE.Vector3();
  scaledBbox.getCenter(scaledCenter);
  scaledBbox.getSize(scaledSize);

  // Center horizontally and ground to Y=0
  model.position.x = -scaledCenter.x;
  model.position.z = -scaledCenter.z;
  model.position.y = -scaledBbox.min.y;

  // Configure shadows and PBR properties
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Ensure materials respond properly to lights
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            mat.needsUpdate = true;
            if ('roughness' in mat && (mat as THREE.MeshStandardMaterial).roughness === undefined) {
              (mat as THREE.MeshStandardMaterial).roughness = 0.5;
            }
          });
        } else {
          mesh.material.needsUpdate = true;
        }
      }
    }
  });

  return {
    group: root,
    dimensions: {
      width: Number(scaledSize.x.toFixed(2)),
      depth: Number(scaledSize.z.toFixed(2)),
      height: Number(scaledSize.y.toFixed(2)),
    },
    originalBoundingBox: scaledBbox,
  };
}

/**
 * Load GLB from an ArrayBuffer (e.g. from file upload)
 */
export async function loadGlbFromArrayBuffer(
  buffer: ArrayBuffer,
  targetMaxDim: number = 1.8
): Promise<LoadedGlbResult> {
  return new Promise((resolve, reject) => {
    loader.parse(
      buffer,
      '',
      (gltf) => {
        try {
          const result = normalizeGlbModel(gltf.scene, targetMaxDim);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      },
      (err) => reject(err)
    );
  });
}

/**
 * Load GLB from a URL
 */
export async function loadGlbFromUrl(
  url: string,
  targetMaxDim: number = 1.8
): Promise<LoadedGlbResult> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        try {
          const result = normalizeGlbModel(gltf.scene, targetMaxDim);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      },
      undefined,
      (err) => reject(err)
    );
  });
}

/**
 * Apply custom tint or color to meshes in the model
 */
export function applyColorToModel(group: THREE.Group, hexColor: string): void {
  const targetColor = new THREE.Color(hexColor);
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      // If it's a primary fabric or top material, update color
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if ('color' in mat && !(mat.name && mat.name.toLowerCase().includes('metal') || mat.name?.toLowerCase().includes('leg'))) {
              (mat as THREE.MeshStandardMaterial).color.copy(targetColor);
            }
          });
        } else {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if ('color' in mat && !(mat.name && mat.name.toLowerCase().includes('metal') || mat.name?.toLowerCase().includes('leg'))) {
            mat.color.copy(targetColor);
          }
        }
      }
    }
  });
}
