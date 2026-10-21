/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PlacedFurniture, ViewMode } from '../types.ts';

export interface SceneManagerCallbacks {
  onItemSelected?: (instanceId: string | null) => void;
  onItemMoved?: (item: PlacedFurniture) => void;
  onFpsUpdate?: (fps: number) => void;
}

export class ARSceneManager {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private pmremGenerator: THREE.PMREMGenerator;

  // Scene elements
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private shadowPlane!: THREE.Mesh;
  private floorGrid!: THREE.GridHelper;
  private reticleGroup!: THREE.Group;
  private selectionRing!: THREE.Group;

  // Placed objects
  public placedItems: Map<string, PlacedFurniture> = new Map();
  public selectedInstanceId: string | null = null;

  // Interaction & Raycasting
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragOffset = new THREE.Vector3();
  private isDragging = false;
  private dragTarget: THREE.Group | null = null;
  private pointerDownPos = new THREE.Vector2();

  // Camera Orbit / Navigation
  private isOrbiting = false;
  private orbitStart = { x: 0, y: 0 };
  private cameraSpherical = { radius: 3.2, theta: 0, phi: Math.PI / 4 }; // spherical coords around target
  private cameraTarget = new THREE.Vector3(0, 0.4, 0);

  // Device orientation AR offset
  private deviceOrientation = { alpha: 0, beta: 0, gamma: 0, enabled: false };

  // Loop & Lifecycle
  private animFrameId: number | null = null;
  private callbacks: SceneManagerCallbacks;
  private isDisposed = false;
  private lastTime = performance.now();
  private frameCount = 0;
  private fpsTimer = performance.now();

  // Settings
  public viewMode: ViewMode = 'ar-camera';
  public showGrid: boolean = true;
  public lightIntensity: number = 1.0;

  constructor(container: HTMLElement, callbacks: SceneManagerCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera (standard mobile/desktop AR perspective)
    const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(56, aspect, 0.05, 50);
    this.updateCameraTransform();

    // 3. Renderer with transparent background for camera pass-through
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Studio Environment for crisp reflections
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    const envTexture = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTexture;

    // 5. Lights
    this.setupLighting();

    // 6. Ground Shadow Plane & Grid
    this.setupGround();

    // 7. Reticle (AR Target Indicator)
    this.setupReticle();

    // 8. Selection Ring Gizmo
    this.setupSelectionRing();

    // 9. Event Listeners
    this.bindEvents();

    // 10. Start Animation Loop
    this.animate();
  }

  private setupLighting(): void {
    // Hemisphere ambient light (warm ceiling + cool ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0xfff8ed, 0x3f3f46, 0.95);
    this.hemiLight.position.set(0, 10, 0);
    this.scene.add(this.hemiLight);

    // Key directional light with soft shadow mapping
    this.keyLight = new THREE.DirectionalLight(0xfff6ea, 1.4);
    this.keyLight.position.set(2.5, 5, 2.5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 15;
    const d = 3.5;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0006;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    // Subtle fill light from opposite angle
    const fillLight = new THREE.DirectionalLight(0xdce7f0, 0.5);
    fillLight.position.set(-3, 3, -2);
    this.scene.add(fillLight);
  }

  private setupGround(): void {
    // Shadow receiver plane on the floor (Y=0)
    const shadowGeo = new THREE.PlaneGeometry(30, 30);
    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.35,
      transparent: true,
      depthWrite: false,
    });
    this.shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = 0;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    // Visual grid helper for measuring / studio mode
    this.floorGrid = new THREE.GridHelper(10, 20, 0x06b6d4, 0x3f3f46);
    this.floorGrid.position.y = 0.001;
    (this.floorGrid.material as THREE.Material).transparent = true;
    (this.floorGrid.material as THREE.Material).opacity = 0.45;
    this.scene.add(this.floorGrid);
  }

  private setupReticle(): void {
    this.reticleGroup = new THREE.Group();
    this.reticleGroup.name = 'AR_Reticle';

    // Outer target ring
    const ringGeo = new THREE.RingGeometry(0.18, 0.22, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    this.reticleGroup.add(ring);

    // Center locator dot
    const dotGeo = new THREE.CircleGeometry(0.04, 16);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.rotation.x = -Math.PI / 2;
    this.reticleGroup.add(dot);

    // 4 crosshairs
    const armGeo = new THREE.PlaneGeometry(0.015, 0.08);
    const armMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((rot) => {
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.rotation.x = -Math.PI / 2;
      arm.rotation.z = rot;
      arm.position.x = Math.sin(rot) * 0.28;
      arm.position.z = Math.cos(rot) * 0.28;
      this.reticleGroup.add(arm);
    });

    this.reticleGroup.position.set(0, 0.002, 0);
    this.scene.add(this.reticleGroup);
  }

  private setupSelectionRing(): void {
    this.selectionRing = new THREE.Group();
    this.selectionRing.visible = false;

    // Glowing selection ring
    const ringGeo = new THREE.RingGeometry(0.7, 0.76, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    this.selectionRing.add(ring);

    // Small direction indicator arrow at front of object
    const arrowGeo = new THREE.ConeGeometry(0.08, 0.16, 16);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
    });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0.01, 0.85);
    this.selectionRing.add(arrow);

    this.scene.add(this.selectionRing);
  }

  // Camera calculations
  private updateCameraTransform(): void {
    const { radius, theta, phi } = this.cameraSpherical;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    this.camera.position.x = this.cameraTarget.x + radius * sinPhi * sinTheta;
    this.camera.position.y = this.cameraTarget.y + radius * cosPhi;
    this.camera.position.z = this.cameraTarget.z + radius * sinPhi * cosTheta;

    this.camera.lookAt(this.cameraTarget);
  }

  public setDeviceOrientation(alpha: number, beta: number, gamma: number): void {
    this.deviceOrientation = { alpha, beta, gamma, enabled: true };
  }

  public updateDimensions(): void {
    if (!this.container || this.isDisposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setLightIntensity(factor: number): void {
    this.lightIntensity = factor;
    this.keyLight.intensity = 1.4 * factor;
    this.hemiLight.intensity = 0.95 * factor;
  }

  public setGridVisible(visible: boolean): void {
    this.showGrid = visible;
    this.floorGrid.visible = visible;
  }

  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    if (mode === 'studio-room') {
      this.scene.background = new THREE.Color(0x121316);
    } else {
      this.scene.background = null; // transparent to show camera
    }
  }

  // Reticle positioning: projects center of camera to floor
  public getReticlePosition(): THREE.Vector3 {
    return this.reticleGroup.position.clone();
  }

  private updateReticle(): void {
    // Cast ray from center of screen (0, 0) to ground plane (Y=0)
    this.raycaster.setFromCamera(new THREE.Vector2(0, -0.15), this.camera);
    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
    if (hit) {
      // Smoothly damp reticle towards target
      this.reticleGroup.position.lerp(new THREE.Vector3(intersection.x, 0.002, intersection.z), 0.25);
      this.reticleGroup.rotation.y += 0.015; // slow idle spin
    }
  }

  // ----------------------------------------------------
  // Furniture Management (Add, Select, Drag, Rotate, Scale)
  // ----------------------------------------------------

  public addFurniture(
    itemData: {
      instanceId: string;
      modelId: string;
      name: string;
      object3D: THREE.Group;
      dimensions: { width: number; depth: number; height: number };
      colorHex?: string;
      isCustomGlb?: boolean;
    },
    spawnPosition?: THREE.Vector3
  ): PlacedFurniture {
    const position = spawnPosition ? spawnPosition.clone() : this.getReticlePosition();
    position.y = 0; // grounded to floor

    const group = itemData.object3D;
    group.position.copy(position);
    group.rotation.y = 0;
    group.userData = { instanceId: itemData.instanceId };

    this.scene.add(group);

    const placed: PlacedFurniture = {
      instanceId: itemData.instanceId,
      modelId: itemData.modelId,
      name: itemData.name,
      object3D: group,
      position: position,
      rotationY: 0,
      scale: 1.0,
      elevation: 0,
      colorHex: itemData.colorHex,
      dimensions: itemData.dimensions,
      isCustomGlb: itemData.isCustomGlb,
    };

    this.placedItems.set(itemData.instanceId, placed);
    this.selectItem(itemData.instanceId);

    return placed;
  }

  public selectItem(instanceId: string | null): void {
    this.selectedInstanceId = instanceId;

    if (instanceId && this.placedItems.has(instanceId)) {
      const item = this.placedItems.get(instanceId)!;
      this.selectionRing.visible = true;
      this.selectionRing.position.set(item.position.x, 0.003, item.position.z);
      this.selectionRing.rotation.y = item.rotationY;

      // Adjust ring radius according to model size
      const maxRadius = Math.max(item.dimensions.width, item.dimensions.depth) * 0.65 * item.scale;
      this.selectionRing.scale.set(maxRadius, maxRadius, maxRadius);
    } else {
      this.selectionRing.visible = false;
    }

    this.callbacks.onItemSelected?.(instanceId);
  }

  public updateSelectedItemRotation(radians: number): void {
    if (!this.selectedInstanceId) return;
    const item = this.placedItems.get(this.selectedInstanceId);
    if (!item) return;

    item.rotationY = radians;
    item.object3D.rotation.y = radians;
    this.selectionRing.rotation.y = radians;
    this.callbacks.onItemMoved?.(item);
  }

  public rotateSelectedItemBy(degrees: number): void {
    if (!this.selectedInstanceId) return;
    const item = this.placedItems.get(this.selectedInstanceId);
    if (!item) return;

    const radDelta = THREE.MathUtils.degToRad(degrees);
    item.rotationY = (item.rotationY + radDelta) % (Math.PI * 2);
    item.object3D.rotation.y = item.rotationY;
    this.selectionRing.rotation.y = item.rotationY;
    this.callbacks.onItemMoved?.(item);
  }

  public updateSelectedItemScale(scaleFactor: number): void {
    if (!this.selectedInstanceId) return;
    const item = this.placedItems.get(this.selectedInstanceId);
    if (!item) return;

    item.scale = scaleFactor;
    item.object3D.scale.setScalar(scaleFactor);

    // Update ring size
    const maxRadius = Math.max(item.dimensions.width, item.dimensions.depth) * 0.65 * scaleFactor;
    this.selectionRing.scale.set(maxRadius, maxRadius, maxRadius);

    this.callbacks.onItemMoved?.(item);
  }

  public updateSelectedItemElevation(elevation: number): void {
    if (!this.selectedInstanceId) return;
    const item = this.placedItems.get(this.selectedInstanceId);
    if (!item) return;

    item.elevation = elevation;
    item.object3D.position.y = elevation;
    this.callbacks.onItemMoved?.(item);
  }

  public removeSelectedItem(): void {
    if (!this.selectedInstanceId) return;
    const item = this.placedItems.get(this.selectedInstanceId);
    if (item) {
      this.scene.remove(item.object3D);
      this.placedItems.delete(this.selectedInstanceId);
    }
    this.selectItem(null);
  }

  public clearAllItems(): void {
    this.placedItems.forEach((item) => {
      this.scene.remove(item.object3D);
    });
    this.placedItems.clear();
    this.selectItem(null);
  }

  // ----------------------------------------------------
  // Pointer & Touch Events (Drag on Floor & Orbit Camera)
  // ----------------------------------------------------

  private bindEvents(): void {
    const el = this.renderer.domElement;

    el.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    el.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private onPointerDown(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointerDownPos.set(e.clientX, e.clientY);

    // Raycast against placed objects
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objectGroups = Array.from(this.placedItems.values()).map((p) => p.object3D);
    const intersects = this.raycaster.intersectObjects(objectGroups, true);

    if (intersects.length > 0) {
      // Find top-level group
      let hitObj: THREE.Object3D | null = intersects[0].object;
      while (hitObj && !hitObj.userData?.instanceId && hitObj.parent && hitObj.parent !== this.scene) {
        hitObj = hitObj.parent;
      }

      if (hitObj && hitObj.userData?.instanceId) {
        const id = hitObj.userData.instanceId;
        this.selectItem(id);

        // Prepare dragging on floor
        this.isDragging = true;
        this.dragTarget = hitObj as THREE.Group;
        this.dragPlane.set(new THREE.Vector3(0, 1, 0), -hitObj.position.y);

        const planeIntersect = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, planeIntersect)) {
          this.dragOffset.copy(planeIntersect).sub(hitObj.position);
        }
        return;
      }
    }

    // Clicked empty space: start camera orbit / rotation
    this.isOrbiting = true;
    this.orbitStart = { x: e.clientX, y: e.clientY };
  }

  private onPointerMove(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging && this.dragTarget) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const planeIntersect = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, planeIntersect)) {
        const newPos = planeIntersect.sub(this.dragOffset);
        this.dragTarget.position.x = newPos.x;
        this.dragTarget.position.z = newPos.z;

        // Keep selection ring aligned
        this.selectionRing.position.x = newPos.x;
        this.selectionRing.position.z = newPos.z;

        const id = this.dragTarget.userData.instanceId;
        const item = this.placedItems.get(id);
        if (item) {
          item.position.x = newPos.x;
          item.position.z = newPos.z;
          this.callbacks.onItemMoved?.(item);
        }
      }
      return;
    }

    if (this.isOrbiting) {
      const dx = e.clientX - this.orbitStart.x;
      const dy = e.clientY - this.orbitStart.y;
      this.orbitStart = { x: e.clientX, y: e.clientY };

      this.cameraSpherical.theta -= dx * 0.006;
      this.cameraSpherical.phi = Math.max(0.15, Math.min(Math.PI / 2.05, this.cameraSpherical.phi - dy * 0.006));
      this.updateCameraTransform();
    }
  }

  private onPointerUp(e: PointerEvent): void {
    // If it was a quick tap with little movement on empty space, deselect
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist < 4 && !this.isDragging && this.isOrbiting) {
      this.selectItem(null);
    }

    this.isDragging = false;
    this.dragTarget = null;
    this.isOrbiting = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.cameraSpherical.radius = Math.max(1.2, Math.min(8.0, this.cameraSpherical.radius + e.deltaY * 0.003));
    this.updateCameraTransform();
  }

  // Reset camera to standard human eye perspective
  public resetCamera(): void {
    this.cameraSpherical = { radius: 3.2, theta: 0, phi: Math.PI / 4 };
    this.cameraTarget.set(0, 0.4, 0);
    this.updateCameraTransform();
  }

  // Composite snapshot capture: draws video frame (if any) then 3D canvas
  public captureSnapshot(videoElement?: HTMLVideoElement | null): string {
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = width;
    captureCanvas.height = height;
    const ctx = captureCanvas.getContext('2d')!;

    // 1. If camera video is active, draw camera frame
    if (this.viewMode === 'ar-camera' && videoElement && videoElement.readyState >= 2) {
      // Scale video to cover canvas while maintaining aspect ratio
      const vRatio = videoElement.videoWidth / videoElement.videoHeight;
      const cRatio = width / height;
      let sWidth = width;
      let sHeight = height;
      let sx = 0;
      let sy = 0;

      if (cRatio > vRatio) {
        sHeight = width / vRatio;
        sy = (height - sHeight) / 2;
      } else {
        sWidth = height * vRatio;
        sx = (width - sWidth) / 2;
      }

      ctx.drawImage(videoElement, sx, sy, sWidth, sHeight);
    } else {
      // Studio room background
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#18181b');
      grad.addColorStop(1, '#09090b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Render 3D canvas onto composite
    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(this.renderer.domElement, 0, 0, width, height);

    // 3. Watermark badge "Awgzo WebAR"
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(24, height - 52, 190, 36);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('Awgzo', 36, height - 28);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('WebAR Interior', 92, height - 28);

    return captureCanvas.toDataURL('image/jpeg', 0.92);
  }

  // Main Render Loop
  private animate = (): void => {
    if (this.isDisposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    // Update reticle position on floor
    this.updateReticle();

    // Pulse selection ring opacity slightly
    if (this.selectionRing.visible) {
      const ringMesh = this.selectionRing.children[0] as THREE.Mesh;
      if (ringMesh && (ringMesh.material as THREE.Material).opacity !== undefined) {
        (ringMesh.material as THREE.Material).opacity = 0.65 + Math.sin(performance.now() * 0.004) * 0.15;
      }
    }

    // Render 3D scene
    this.renderer.render(this.scene, this.camera);

    // FPS counter calculation
    this.frameCount++;
    const now = performance.now();
    if (now - this.fpsTimer >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
      this.callbacks.onFpsUpdate?.(fps);
      this.frameCount = 0;
      this.fpsTimer = now;
    }
  };

  public dispose(): void {
    this.isDisposed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.clearAllItems();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
