/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PlacedFurniture, ViewMode, PlaneDetectionState } from '../types.ts';

export interface SceneManagerCallbacks {
  onItemSelected?: (instanceId: string | null) => void;
  onItemMoved?: (item: PlacedFurniture) => void;
  onFpsUpdate?: (fps: number) => void;
  onPlaneStateChange?: (state: PlaneDetectionState, distanceMeters: number) => void;
  onWebXRSupported?: (supported: boolean) => void;
}

// Procedural ARCore-style dotted plane texture
function createARCorePlaneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(6, 182, 212, 0.04)';
  ctx.fillRect(0, 0, 128, 128);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 128, 128);

  // ARCore circular center dot
  ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
  ctx.beginPath();
  ctx.arc(64, 64, 3.5, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class ARSceneManager {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private pmremGenerator: THREE.PMREMGenerator;

  // Lights & Environment
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private shadowPlane!: THREE.Mesh;
  private floorGrid!: THREE.GridHelper;
  private reticleGroup!: THREE.Group;
  private selectionRing!: THREE.Group;
  private featurePointsCloud!: THREE.Points;

  // ARCore-style Detected Floor Plane Visualization
  public detectedPlaneMesh!: THREE.Mesh;
  public detectedPlaneRing!: THREE.Mesh;
  public floorConfirmed: boolean = false;
  private planeScanProgress: number = 0.2; // expands as floor is scanned

  // Ground Plane Tracking
  public groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y = 0
  public planeState: PlaneDetectionState = 'scanning';
  public lastGroundHit = new THREE.Vector3(0, 0, -1.8);
  public groundDistance = 1.8;
  public floorElevation = 0;

  // Placed objects
  public placedItems: Map<string, PlacedFurniture> = new Map();
  public selectedInstanceId: string | null = null;

  // Interaction & Raycasting
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragOffset = new THREE.Vector3();
  private isDragging = false;
  private dragTarget: THREE.Group | null = null;
  private pointerDownPos = new THREE.Vector2();
  private pointerDownTime = 0;

  // AR Camera Look
  public eyeHeight = 1.45;
  private cameraLook = { yaw: 0, pitch: -0.38 };
  private isLooking = false;
  private lookStart = { x: 0, y: 0 };

  // Gyroscope / Device orientation
  public useGyroscope = false;
  private gyroEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private gyroQuat = new THREE.Quaternion();

  // WebXR ARCore Hit-Testing
  public isWebXRSupported = false;
  public isWebXRActive = false;
  private xrHitTestSource: any = null;
  private xrRefSpace: any = null;

  // Loop & Lifecycle
  private animFrameId: number | null = null;
  private callbacks: SceneManagerCallbacks;
  private isDisposed = false;
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

    // 2. Camera at eye level
    const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.05, 50);
    this.camera.position.set(0, this.eyeHeight, 0);
    this.updateCameraRotation();

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

    // Enable WebXR support on renderer
    this.renderer.xr.enabled = true;

    container.appendChild(this.renderer.domElement);

    // 4. Studio Environment
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    const envTexture = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTexture;

    // 5. Lights
    this.setupLighting();

    // 6. Ground Shadow Plane, Feature Points & ARCore Detected Plane
    this.setupGround();

    // 7. AR Holographic Reticle
    this.setupReticle();

    // 8. Selection Ring
    this.setupSelectionRing();

    // 9. Check WebXR Hardware ARCore Support
    this.checkWebXRSupport();

    // 10. Event Listeners
    this.bindEvents();

    // 11. Start Animation Loop
    this.animate();
  }

  private setupLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xfff8ed, 0x3f3f46, 0.95);
    this.hemiLight.position.set(0, 10, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff6ea, 1.4);
    this.keyLight.position.set(3, 6, 2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 20;
    const d = 5;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0006;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    const fillLight = new THREE.DirectionalLight(0xdce7f0, 0.5);
    fillLight.position.set(-3, 4, -3);
    this.scene.add(fillLight);
  }

  private setupGround(): void {
    // 1. Invisible Shadow Receiver Plane on Floor
    const shadowGeo = new THREE.PlaneGeometry(40, 40);
    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.38,
      transparent: true,
      depthWrite: false,
    });
    this.shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = this.floorElevation;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    // 2. ARCore-style Detected Floor Plane Mesh (visualizing detected physical floor polygon)
    const planeTex = createARCorePlaneTexture();
    const planeGeo = new THREE.CircleGeometry(3.6, 64);
    const planeMat = new THREE.MeshBasicMaterial({
      map: planeTex,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.detectedPlaneMesh = new THREE.Mesh(planeGeo, planeMat);
    this.detectedPlaneMesh.rotation.x = -Math.PI / 2;
    this.detectedPlaneMesh.position.set(0, this.floorElevation + 0.001, -2.0);
    this.detectedPlaneMesh.scale.setScalar(this.planeScanProgress);
    this.scene.add(this.detectedPlaneMesh);

    // 3. Glowing Perimeter Ring around detected floor boundary
    const ringGeo = new THREE.RingGeometry(3.55, 3.6, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.detectedPlaneRing = new THREE.Mesh(ringGeo, ringMat);
    this.detectedPlaneRing.rotation.x = -Math.PI / 2;
    this.detectedPlaneRing.position.set(0, this.floorElevation + 0.002, -2.0);
    this.detectedPlaneRing.scale.setScalar(this.planeScanProgress);
    this.scene.add(this.detectedPlaneRing);

    // 4. Floor Grid Helper
    this.floorGrid = new THREE.GridHelper(16, 32, 0x06b6d4, 0x3f3f46);
    this.floorGrid.position.y = this.floorElevation + 0.001;
    (this.floorGrid.material as THREE.Material).transparent = true;
    (this.floorGrid.material as THREE.Material).opacity = 0.35;
    this.scene.add(this.floorGrid);

    // 5. Ground Plane Feature Points (Simulated AR SLAM point cloud)
    const pointsCount = 200;
    const pointPositions = new Float32Array(pointsCount * 3);
    for (let i = 0; i < pointsCount; i++) {
      const radius = 0.5 + Math.random() * 4.0;
      const angle = Math.random() * Math.PI * 2;
      pointPositions[i * 3] = Math.cos(angle) * radius;
      pointPositions[i * 3 + 1] = this.floorElevation + (Math.random() - 0.5) * 0.01;
      pointPositions[i * 3 + 2] = -2.0 - Math.sin(angle) * radius;
    }
    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
    const pointMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.04,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.featurePointsCloud = new THREE.Points(pointGeo, pointMat);
    this.scene.add(this.featurePointsCloud);
  }

  private setupReticle(): void {
    this.reticleGroup = new THREE.Group();
    this.reticleGroup.name = 'AR_Ground_Reticle';

    // Outer target ring
    const ringGeo = new THREE.RingGeometry(0.22, 0.26, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    this.reticleGroup.add(ring);

    // Inner pulsating locator ring
    const innerRingGeo = new THREE.RingGeometry(0.08, 0.1, 24);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    this.reticleGroup.add(innerRing);

    // Center dot
    const dotGeo = new THREE.CircleGeometry(0.025, 16);
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

    // Four directional tick marks
    const armGeo = new THREE.PlaneGeometry(0.012, 0.09);
    const armMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((rot) => {
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.rotation.x = -Math.PI / 2;
      arm.rotation.z = rot;
      arm.position.x = Math.sin(rot) * 0.32;
      arm.position.z = Math.cos(rot) * 0.32;
      this.reticleGroup.add(arm);
    });

    this.reticleGroup.position.set(0, this.floorElevation + 0.002, -1.8);
    this.scene.add(this.reticleGroup);
  }

  private setupSelectionRing(): void {
    this.selectionRing = new THREE.Group();
    this.selectionRing.visible = false;

    const ringGeo = new THREE.RingGeometry(0.68, 0.74, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    this.selectionRing.add(ring);

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

  // Check if device supports hardware ARCore WebXR
  private async checkWebXRSupport(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'xr' in navigator && (navigator as any).xr?.isSessionSupported) {
      try {
        const supported = await (navigator as any).xr.isSessionSupported('immersive-ar');
        this.isWebXRSupported = Boolean(supported);
        this.callbacks.onWebXRSupported?.(this.isWebXRSupported);
      } catch (e) {
        console.warn('WebXR check failed:', e);
      }
    }
  }

  // Start Hardware ARCore Session with WebXR Hit Test
  public async startWebXRSession(): Promise<boolean> {
    if (!this.isWebXRSupported || typeof navigator === 'undefined' || !(navigator as any).xr) {
      return false;
    }

    try {
      const session = await (navigator as any).xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'plane-detection'],
        domOverlay: { root: document.body },
      });

      this.isWebXRActive = true;
      this.renderer.xr.setSession(session);

      this.xrRefSpace = await session.requestReferenceSpace('local');
      const viewerSpace = await session.requestReferenceSpace('viewer');
      this.xrHitTestSource = await session.requestHitTestSource({ space: viewerSpace });

      session.addEventListener('end', () => {
        this.isWebXRActive = false;
        this.xrHitTestSource = null;
        this.xrRefSpace = null;
      });

      return true;
    } catch (err) {
      console.warn('WebXR start error:', err);
      return false;
    }
  }

  // Camera look rotation
  private updateCameraRotation(): void {
    if (this.useGyroscope) {
      this.camera.quaternion.copy(this.gyroQuat);
    } else {
      this.camera.rotation.set(this.cameraLook.pitch, this.cameraLook.yaw, 0, 'YXZ');
    }
  }

  public setFloorElevation(elev: number): void {
    this.floorElevation = elev;
    this.groundPlane.set(new THREE.Vector3(0, 1, 0), -elev);
    this.shadowPlane.position.y = elev;
    this.floorGrid.position.y = elev + 0.001;
    this.detectedPlaneMesh.position.y = elev + 0.001;
    this.detectedPlaneRing.position.y = elev + 0.002;
    this.featurePointsCloud.position.y = elev;
  }

  public confirmFloor(): void {
    this.floorConfirmed = true;
    this.planeState = 'locked';
    // Center detected plane at current reticle position
    this.detectedPlaneMesh.position.x = this.reticleGroup.position.x;
    this.detectedPlaneMesh.position.z = this.reticleGroup.position.z;
    this.detectedPlaneRing.position.x = this.reticleGroup.position.x;
    this.detectedPlaneRing.position.z = this.reticleGroup.position.z;
    this.detectedPlaneMesh.scale.setScalar(1.0);
    this.detectedPlaneRing.scale.setScalar(1.0);
    this.callbacks.onPlaneStateChange?.('locked', this.groundDistance);
  }

  public rescanFloor(): void {
    this.floorConfirmed = false;
    this.planeScanProgress = 0.2;
    this.planeState = 'scanning';
    this.detectedPlaneMesh.scale.setScalar(this.planeScanProgress);
    this.detectedPlaneRing.scale.setScalar(this.planeScanProgress);
    this.callbacks.onPlaneStateChange?.('scanning', 0);
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
    this.detectedPlaneMesh.visible = visible;
    this.detectedPlaneRing.visible = visible;
    this.featurePointsCloud.visible = visible;
  }

  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    if (mode === 'studio-room') {
      this.scene.background = new THREE.Color(0x121316);
    } else {
      this.scene.background = null; // transparent for camera
    }
  }

  public setDeviceOrientation(alpha: number, beta: number, gamma: number): void {
    this.useGyroscope = true;
    const degToRad = Math.PI / 180;
    const _x = beta ? beta * degToRad : 0;
    const _y = alpha ? alpha * degToRad : 0;
    const _z = gamma ? -gamma * degToRad : 0;

    this.gyroEuler.set(_x, _y, _z, 'YXZ');
    this.gyroQuat.setFromEuler(this.gyroEuler);
    this.updateCameraRotation();
  }

  public getReticlePosition(): THREE.Vector3 {
    return this.reticleGroup.position.clone();
  }

  private updateGroundPlaneDetection(): void {
    // Cast ray from center of camera (NDC 0, -0.15)
    this.raycaster.setFromCamera(new THREE.Vector2(0, -0.15), this.camera);
    const hitPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint);

    if (hit) {
      const dist = hitPoint.distanceTo(this.camera.position);

      if (dist >= 0.4 && dist <= 7.0) {
        this.reticleGroup.visible = true;
        this.reticleGroup.position.lerp(
          new THREE.Vector3(hitPoint.x, this.floorElevation + 0.002, hitPoint.z),
          0.35
        );
        this.reticleGroup.rotation.y += 0.015;

        this.lastGroundHit.copy(this.reticleGroup.position);
        this.groundDistance = Number(dist.toFixed(1));

        // Expand detected plane as the floor is successfully scanned
        if (!this.floorConfirmed) {
          if (this.planeScanProgress < 1.0) {
            this.planeScanProgress = Math.min(1.0, this.planeScanProgress + 0.015);
            this.detectedPlaneMesh.scale.setScalar(this.planeScanProgress);
            this.detectedPlaneRing.scale.setScalar(this.planeScanProgress);
            this.detectedPlaneMesh.position.x = hitPoint.x;
            this.detectedPlaneMesh.position.z = hitPoint.z;
            this.detectedPlaneRing.position.x = hitPoint.x;
            this.detectedPlaneRing.position.z = hitPoint.z;
          }

          if (this.planeState !== 'locked') {
            this.planeState = 'locked';
            this.callbacks.onPlaneStateChange?.('locked', this.groundDistance);
          }
        }
        return;
      }
    }

    // Camera pointing away from floor
    if (!this.floorConfirmed) {
      this.reticleGroup.visible = false;
      if (this.planeState !== 'scanning') {
        this.planeState = 'scanning';
        this.callbacks.onPlaneStateChange?.('scanning', 0);
      }
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
      isLocked?: boolean;
    },
    spawnPosition?: THREE.Vector3
  ): PlacedFurniture {
    const position = spawnPosition ? spawnPosition.clone() : this.getReticlePosition();
    position.y = this.floorElevation;

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
      isLocked: itemData.isLocked ?? false,
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
      this.selectionRing.position.set(item.position.x, this.floorElevation + 0.003, item.position.z);
      this.selectionRing.rotation.y = item.rotationY;

      const maxRadius = Math.max(item.dimensions.width, item.dimensions.depth) * 0.65 * item.scale;
      this.selectionRing.scale.set(maxRadius, maxRadius, maxRadius);
    } else {
      this.selectionRing.visible = false;
    }

    this.callbacks.onItemSelected?.(instanceId);
  }

  public toggleItemLock(instanceId: string): boolean {
    const item = this.placedItems.get(instanceId);
    if (!item) return false;
    item.isLocked = !item.isLocked;
    this.callbacks.onItemMoved?.(item);
    return item.isLocked;
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

    const maxRadius = Math.max(item.dimensions.width, item.dimensions.depth) * 0.65 * scaleFactor;
    this.selectionRing.scale.set(maxRadius, maxRadius, maxRadius);

    this.callbacks.onItemMoved?.(item);
  }

  public updateSelectedItemElevation(elevation: number): void {
    if (!this.selectedInstanceId) return;
    const item = this.placedItems.get(this.selectedInstanceId);
    if (!item) return;

    item.elevation = elevation;
    item.object3D.position.y = this.floorElevation + elevation;
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
  // Pointer & Touch Events
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
    this.pointerDownTime = performance.now();

    // Raycast against placed furniture models
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objectGroups = Array.from(this.placedItems.values()).map((p) => p.object3D);
    const intersects = this.raycaster.intersectObjects(objectGroups, true);

    if (intersects.length > 0) {
      let hitObj: THREE.Object3D | null = intersects[0].object;
      while (hitObj && !hitObj.userData?.instanceId && hitObj.parent && hitObj.parent !== this.scene) {
        hitObj = hitObj.parent;
      }

      if (hitObj && hitObj.userData?.instanceId) {
        const id = hitObj.userData.instanceId;
        const item = this.placedItems.get(id);

        this.selectItem(id);

        if (item && !item.isLocked) {
          this.isDragging = true;
          this.dragTarget = hitObj as THREE.Group;
          this.dragPlane.set(new THREE.Vector3(0, 1, 0), -hitObj.position.y);

          const planeIntersect = new THREE.Vector3();
          if (this.raycaster.ray.intersectPlane(this.dragPlane, planeIntersect)) {
            this.dragOffset.copy(planeIntersect).sub(hitObj.position);
          }
        }
        return;
      }
    }

    // Dragging empty space: rotate camera view in place
    this.isLooking = true;
    this.lookStart = { x: e.clientX, y: e.clientY };
  }

  private onPointerMove(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Dragging furniture
    if (this.isDragging && this.dragTarget) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const planeIntersect = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, planeIntersect)) {
        const newPos = planeIntersect.sub(this.dragOffset);
        this.dragTarget.position.x = newPos.x;
        this.dragTarget.position.z = newPos.z;

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

    // Looking around in room
    if (this.isLooking && !this.useGyroscope) {
      const dx = e.clientX - this.lookStart.x;
      const dy = e.clientY - this.lookStart.y;
      this.lookStart = { x: e.clientX, y: e.clientY };

      this.cameraLook.yaw -= dx * 0.005;
      this.cameraLook.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.5, this.cameraLook.pitch - dy * 0.005));
      this.updateCameraRotation();
    }
  }

  private onPointerUp(e: PointerEvent): void {
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    const duration = performance.now() - this.pointerDownTime;

    if (dist < 5 && duration < 300 && !this.isDragging) {
      this.selectItem(null);
    }

    this.isDragging = false;
    this.dragTarget = null;
    this.isLooking = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.cameraLook.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.5, this.cameraLook.pitch - e.deltaY * 0.001));
    this.updateCameraRotation();
  }

  public resetCamera(): void {
    this.camera.position.set(0, this.eyeHeight, 0);
    this.cameraLook = { yaw: 0, pitch: -0.38 };
    this.useGyroscope = false;
    this.updateCameraRotation();
  }

  public captureSnapshot(videoElement?: HTMLVideoElement | null): string {
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = width;
    captureCanvas.height = height;
    const ctx = captureCanvas.getContext('2d')!;

    if (this.viewMode === 'ar-camera' && videoElement && videoElement.readyState >= 2) {
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
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#18181b');
      grad.addColorStop(1, '#09090b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(this.renderer.domElement, 0, 0, width, height);

    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(24, height - 52, 205, 36);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('Awgzo', 36, height - 28);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('WebAR Interior', 92, height - 28);

    return captureCanvas.toDataURL('image/jpeg', 0.92);
  }

  // Animation Loop with WebXR Frame Support
  private animate = (timestamp?: number, frame?: any): void => {
    if (this.isDisposed) return;

    if (this.renderer.xr.isPresenting) {
      this.renderer.setAnimationLoop(this.animate);
    } else {
      this.animFrameId = requestAnimationFrame(this.animate);
    }

    // Hardware ARCore WebXR hit testing
    if (frame && this.xrHitTestSource && this.xrRefSpace) {
      const hitTestResults = frame.getHitTestResults(this.xrHitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(this.xrRefSpace);
        if (pose) {
          this.reticleGroup.visible = true;
          this.reticleGroup.matrix.fromArray(pose.transform.matrix);
          this.reticleGroup.matrix.decompose(
            this.reticleGroup.position,
            this.reticleGroup.quaternion,
            this.reticleGroup.scale
          );
          this.planeState = 'locked';
        }
      }
    } else {
      // Sensor & camera ground plane detection
      this.updateGroundPlaneDetection();
    }

    // Selection ring pulse
    if (this.selectionRing.visible) {
      const ringMesh = this.selectionRing.children[0] as THREE.Mesh;
      if (ringMesh && (ringMesh.material as THREE.Material).opacity !== undefined) {
        (ringMesh.material as THREE.Material).opacity = 0.65 + Math.sin(performance.now() * 0.004) * 0.15;
      }
    }

    // Feature points pulse
    if (this.featurePointsCloud.visible) {
      (this.featurePointsCloud.material as THREE.PointsMaterial).opacity =
        0.4 + Math.sin(performance.now() * 0.003) * 0.15;
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

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
    this.renderer.setAnimationLoop(null);
    this.clearAllItems();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
