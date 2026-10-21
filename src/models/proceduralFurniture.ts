/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

// Procedural canvas texture generator for subtle linen / fabric weave
function createFabricTexture(baseHex: string, roughnessVal = 0.85): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle weave pattern
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 256; i += 4) {
    ctx.fillRect(i, 0, 2, 256);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let j = 0; j < 256; j += 4) {
    ctx.fillRect(0, j, 256, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural wood grain texture
function createWoodTexture(woodHex = '#b08968'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = woodHex;
  ctx.fillRect(0, 0, 512, 512);

  // Organic rings/grain
  ctx.strokeStyle = 'rgba(60, 35, 15, 0.12)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 512; i += 12) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.bezierCurveTo(150, i + 8, 350, i - 12, 512, i + 4);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Modern 3-Seater Sectional Couch (Multi-part Composite THREE.Group)
 * Dimensions: ~2.2m W x 0.92m D x 0.82m H
 */
export function createProceduralSofa(fabricColor = '#2b394a'): THREE.Group {
  const sofa = new THREE.Group();
  sofa.name = 'Procedural_Sofa';

  const fabricTex = createFabricTexture(fabricColor);
  const mainFabricMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(fabricColor),
    map: fabricTex,
    roughness: 0.82,
    metalness: 0.05,
  });

  const woodTex = createWoodTexture('#8d5b4c');
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.45,
    metalness: 0.1,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.88,
  });

  const legHeight = 0.16;
  const legGeo = new THREE.CylinderGeometry(0.025, 0.016, legHeight, 16);
  const capGeo = new THREE.CylinderGeometry(0.018, 0.016, 0.035, 16);

  // 1. Four Tapered Legs with Brass Foot Caps
  const legPositions = [
    [-0.98, legHeight / 2, 0.36],
    [0.98, legHeight / 2, 0.36],
    [-0.98, legHeight / 2, -0.36],
    [0.98, legHeight / 2, -0.36],
  ];

  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(x, y, z);
    leg.rotation.z = x > 0 ? -0.1 : 0.1;
    leg.rotation.x = z > 0 ? 0.1 : -0.1;
    leg.castShadow = true;
    leg.receiveShadow = true;
    sofa.add(leg);

    const cap = new THREE.Mesh(capGeo, brassMat);
    cap.position.set(x, 0.018, z);
    cap.castShadow = true;
    sofa.add(cap);
  });

  // 2. Base Platform Frame
  const baseGeo = new THREE.BoxGeometry(2.14, 0.12, 0.86);
  const baseMesh = new THREE.Mesh(baseGeo, mainFabricMat);
  baseMesh.position.set(0, legHeight + 0.06, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  sofa.add(baseMesh);

  // 3. Three Plush Seat Cushions
  const cushionWidth = 0.65;
  const cushionGeo = new THREE.BoxGeometry(cushionWidth, 0.16, 0.72);
  [-0.67, 0, 0.67].forEach((xPos) => {
    const cushion = new THREE.Mesh(cushionGeo, mainFabricMat);
    cushion.position.set(xPos, legHeight + 0.12 + 0.08, 0.02);
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    sofa.add(cushion);
  });

  // 4. Backrest Main Frame
  const backFrameGeo = new THREE.BoxGeometry(2.14, 0.48, 0.16);
  const backFrame = new THREE.Mesh(backFrameGeo, mainFabricMat);
  backFrame.position.set(0, legHeight + 0.12 + 0.24, -0.35);
  backFrame.castShadow = true;
  backFrame.receiveShadow = true;
  sofa.add(backFrame);

  // 5. Three Padded Back Cushions (slightly angled)
  const backCushionGeo = new THREE.BoxGeometry(0.65, 0.38, 0.14);
  [-0.67, 0, 0.67].forEach((xPos) => {
    const backCushion = new THREE.Mesh(backCushionGeo, mainFabricMat);
    backCushion.position.set(xPos, legHeight + 0.12 + 0.26, -0.22);
    backCushion.rotation.x = 0.12;
    backCushion.castShadow = true;
    backCushion.receiveShadow = true;
    sofa.add(backCushion);
  });

  // 6. Left & Right Armrests
  const armGeo = new THREE.BoxGeometry(0.16, 0.38, 0.86);
  [-1.07, 1.07].forEach((xPos) => {
    const arm = new THREE.Mesh(armGeo, mainFabricMat);
    arm.position.set(xPos, legHeight + 0.12 + 0.15, 0);
    arm.castShadow = true;
    arm.receiveShadow = true;
    sofa.add(arm);
  });

  // 7. Accent Throw Pillows
  const pillowMat = new THREE.MeshStandardMaterial({
    color: 0xdfa067,
    roughness: 0.9,
    metalness: 0.0,
  });
  const pillowGeo = new THREE.BoxGeometry(0.28, 0.26, 0.1);
  const leftPillow = new THREE.Mesh(pillowGeo, pillowMat);
  leftPillow.position.set(-0.92, legHeight + 0.32, 0.1);
  leftPillow.rotation.z = -0.3;
  leftPillow.rotation.y = 0.2;
  leftPillow.castShadow = true;
  sofa.add(leftPillow);

  const rightPillow = new THREE.Mesh(pillowGeo, pillowMat);
  rightPillow.position.set(0.92, legHeight + 0.32, 0.1);
  rightPillow.rotation.z = 0.3;
  rightPillow.rotation.y = -0.2;
  rightPillow.castShadow = true;
  sofa.add(rightPillow);

  return sofa;
}

/**
 * Scandinavian Dining Table (Solid oak with chamfers)
 * Dimensions: ~1.8m W x 0.9m D x 0.76m H
 */
export function createProceduralDiningTable(woodColor = '#c99a6b'): THREE.Group {
  const table = new THREE.Group();
  table.name = 'Procedural_Dining_Table';

  const woodTex = createWoodTexture(woodColor);
  const tableMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(woodColor),
    map: woodTex,
    roughness: 0.38,
    metalness: 0.08,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.22,
    metalness: 0.92,
  });

  const tableHeight = 0.76;
  const topThickness = 0.045;

  // 1. Tabletop
  const topGeo = new THREE.BoxGeometry(1.8, topThickness, 0.9);
  const top = new THREE.Mesh(topGeo, tableMat);
  top.position.set(0, tableHeight - topThickness / 2, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  table.add(top);

  // 2. Apron / Underside sub-frame
  const apronLongGeo = new THREE.BoxGeometry(1.56, 0.06, 0.03);
  const apronShortGeo = new THREE.BoxGeometry(0.03, 0.06, 0.68);

  const apronFront = new THREE.Mesh(apronLongGeo, tableMat);
  apronFront.position.set(0, tableHeight - topThickness - 0.03, 0.34);
  apronFront.castShadow = true;
  table.add(apronFront);

  const apronBack = new THREE.Mesh(apronLongGeo, tableMat);
  apronBack.position.set(0, tableHeight - topThickness - 0.03, -0.34);
  apronBack.castShadow = true;
  table.add(apronBack);

  const apronLeft = new THREE.Mesh(apronShortGeo, tableMat);
  apronLeft.position.set(-0.78, tableHeight - topThickness - 0.03, 0);
  apronLeft.castShadow = true;
  table.add(apronLeft);

  const apronRight = new THREE.Mesh(apronShortGeo, tableMat);
  apronRight.position.set(0.78, tableHeight - topThickness - 0.03, 0);
  apronRight.castShadow = true;
  table.add(apronRight);

  // 3. Four Splayed Tapered Legs with Brass Tips
  const legH = tableHeight - topThickness;
  const legGeo = new THREE.CylinderGeometry(0.034, 0.02, legH, 16);
  const tipGeo = new THREE.CylinderGeometry(0.023, 0.02, 0.06, 16);

  const legCorners = [
    [-0.78, 0.34],
    [0.78, 0.34],
    [-0.78, -0.34],
    [0.78, -0.34],
  ];

  legCorners.forEach(([cx, cz]) => {
    const leg = new THREE.Mesh(legGeo, tableMat);
    leg.position.set(cx, legH / 2, cz);
    leg.rotation.z = cx > 0 ? -0.06 : 0.06;
    leg.rotation.x = cz > 0 ? 0.06 : -0.06;
    leg.castShadow = true;
    leg.receiveShadow = true;
    table.add(leg);

    const tip = new THREE.Mesh(tipGeo, brassMat);
    tip.position.set(cx, 0.03, cz);
    tip.castShadow = true;
    table.add(tip);
  });

  return table;
}

/**
 * Minimalist Oval / Rounded Coffee Table (Calacatta / Glass top + Walnut base)
 * Dimensions: ~1.15m W x 0.65m D x 0.44m H
 */
export function createProceduralCoffeeTable(surfaceColor = '#f5f5f7'): THREE.Group {
  const table = new THREE.Group();
  table.name = 'Procedural_Coffee_Table';

  const topMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(surfaceColor),
    roughness: 0.18,
    metalness: 0.12,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.35,
    metalness: 0.85,
  });

  const shelfMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.55,
    metalness: 0.05,
  });

  const height = 0.44;

  // 1. Rounded Oval-like Top
  const topGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.03, 36);
  topGeo.scale(1.2, 1, 0.7); // ellipse
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(0, height - 0.015, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  table.add(top);

  // 2. Lower slatted magazine shelf
  const shelfGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.015, 36);
  shelfGeo.scale(1.15, 1, 0.65);
  const shelf = new THREE.Mesh(shelfGeo, shelfMat);
  shelf.position.set(0, 0.16, 0);
  shelf.castShadow = true;
  shelf.receiveShadow = true;
  table.add(shelf);

  // 3. Triangular Cross-frame Legs
  const legH = height - 0.03;
  const legGeo = new THREE.CylinderGeometry(0.016, 0.014, legH, 16);
  const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

  angles.forEach((angle) => {
    const rx = Math.cos(angle) * 0.42;
    const rz = Math.sin(angle) * 0.28;
    const leg = new THREE.Mesh(legGeo, frameMat);
    leg.position.set(rx, legH / 2, rz);
    leg.castShadow = true;
    leg.receiveShadow = true;
    table.add(leg);
  });

  return table;
}

/**
 * Mid-Century Accent Lounge Chair
 * Dimensions: ~0.82m W x 0.84m D x 0.80m H
 */
export function createProceduralAccentChair(upholsteryColor = '#1f4e38'): THREE.Group {
  const chair = new THREE.Group();
  chair.name = 'Procedural_Accent_Chair';

  const fabricTex = createFabricTexture(upholsteryColor);
  const seatMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(upholsteryColor),
    map: fabricTex,
    roughness: 0.78,
    metalness: 0.05,
  });

  const blackMetalMat = new THREE.MeshStandardMaterial({
    color: 0x222225,
    roughness: 0.35,
    metalness: 0.85,
  });

  const seatH = 0.42;

  // 1. Deep Contoured Seat Base
  const seatGeo = new THREE.BoxGeometry(0.66, 0.14, 0.62);
  const seat = new THREE.Mesh(seatGeo, seatMat);
  seat.position.set(0, seatH, 0);
  seat.castShadow = true;
  seat.receiveShadow = true;
  chair.add(seat);

  // 2. High Angled Wingback Cushion
  const backGeo = new THREE.BoxGeometry(0.64, 0.52, 0.12);
  const back = new THREE.Mesh(backGeo, seatMat);
  back.position.set(0, seatH + 0.28, -0.26);
  back.rotation.x = 0.22;
  back.castShadow = true;
  back.receiveShadow = true;
  chair.add(back);

  // 3. Ergonomic Side Wings / Arms
  const wingGeo = new THREE.BoxGeometry(0.1, 0.32, 0.54);
  [-0.34, 0.34].forEach((xPos) => {
    const wing = new THREE.Mesh(wingGeo, seatMat);
    wing.position.set(xPos, seatH + 0.16, -0.04);
    wing.rotation.y = xPos > 0 ? -0.06 : 0.06;
    wing.castShadow = true;
    wing.receiveShadow = true;
    chair.add(wing);
  });

  // 4. Splayed Steel Spindle Legs with cross-brace
  const legH = seatH - 0.07;
  const legGeo = new THREE.CylinderGeometry(0.016, 0.011, legH, 16);
  const legPositions = [
    [-0.28, 0.24],
    [0.28, 0.24],
    [-0.26, -0.24],
    [0.26, -0.24],
  ];

  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, blackMetalMat);
    leg.position.set(lx, legH / 2, lz);
    leg.rotation.z = lx > 0 ? -0.12 : 0.12;
    leg.rotation.x = lz > 0 ? 0.12 : -0.12;
    leg.castShadow = true;
    leg.receiveShadow = true;
    chair.add(leg);
  });

  // Center hub
  const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
  const hub = new THREE.Mesh(hubGeo, blackMetalMat);
  hub.position.set(0, seatH - 0.08, 0);
  chair.add(hub);

  return chair;
}

/**
 * Minimalist Arc Floor Lamp with Shade
 * Dimensions: ~0.55m W x 0.85m D x 1.78m H
 */
export function createProceduralFloorLamp(): THREE.Group {
  const lamp = new THREE.Group();
  lamp.name = 'Procedural_Floor_Lamp';

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.88,
  });

  const shadeMat = new THREE.MeshStandardMaterial({
    color: 0xfdfdfd,
    roughness: 0.85,
    metalness: 0.05,
    emissive: 0xfff4e0,
    emissiveIntensity: 0.25,
  });

  const bulbMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c2,
  });

  // 1. Heavy Marble/Brass Weighted Base
  const baseGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 32);
  const base = new THREE.Mesh(baseGeo, brassMat);
  base.position.set(0, 0.02, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  lamp.add(base);

  // 2. Vertical Stem
  const stemGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.25, 16);
  const stem = new THREE.Mesh(stemGeo, brassMat);
  stem.position.set(0, 0.04 + 1.25 / 2, 0);
  stem.castShadow = true;
  lamp.add(stem);

  // 3. Arched Tube Overhang
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 1.29, 0),
    new THREE.Vector3(0, 1.82, 0.2),
    new THREE.Vector3(0, 1.65, 0.55)
  );
  const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.014, 8, false);
  const tube = new THREE.Mesh(tubeGeo, brassMat);
  tube.castShadow = true;
  lamp.add(tube);

  // 4. Cylindrical Drum Shade
  const shadeGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.24, 32, 1, true);
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  shade.position.set(0, 1.56, 0.55);
  shade.castShadow = true;
  lamp.add(shade);

  // 5. Glowing Bulb inside
  const bulbGeo = new THREE.SphereGeometry(0.05, 16, 16);
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(0, 1.56, 0.55);
  lamp.add(bulb);

  return lamp;
}

/**
 * Potted Fiddle Leaf Fig Indoor Plant
 * Dimensions: ~0.65m W x 0.65m D x 1.25m H
 */
export function createProceduralPlant(): THREE.Group {
  const plant = new THREE.Group();
  plant.name = 'Procedural_Indoor_Plant';

  const potMat = new THREE.MeshStandardMaterial({
    color: 0xdf6e4f, // terracotta
    roughness: 0.72,
    metalness: 0.05,
  });

  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x2e2017,
    roughness: 0.95,
    metalness: 0.0,
  });

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2e6f40,
    roughness: 0.45,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const standMat = new THREE.MeshStandardMaterial({
    color: 0xa87c4f,
    roughness: 0.6,
    metalness: 0.1,
  });

  // 1. Wooden Stand with 4 legs
  const standH = 0.24;
  const standLegGeo = new THREE.CylinderGeometry(0.015, 0.015, standH, 12);
  [
    [-0.15, -0.15],
    [0.15, -0.15],
    [-0.15, 0.15],
    [0.15, 0.15],
  ].forEach(([sx, sz]) => {
    const leg = new THREE.Mesh(standLegGeo, standMat);
    leg.position.set(sx, standH / 2, sz);
    leg.castShadow = true;
    plant.add(leg);
  });

  // 2. Ceramic Pot
  const potGeo = new THREE.CylinderGeometry(0.18, 0.13, 0.32, 24);
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.set(0, standH / 2 + 0.2, 0);
  pot.castShadow = true;
  pot.receiveShadow = true;
  plant.add(pot);

  // 3. Dark soil surface
  const soilGeo = new THREE.CircleGeometry(0.17, 24);
  const soil = new THREE.Mesh(soilGeo, soilMat);
  soil.rotation.x = -Math.PI / 2;
  soil.position.set(0, standH / 2 + 0.34, 0);
  plant.add(soil);

  // 4. Stalks & Graceful Broad Leaves
  const stemGeo = new THREE.CylinderGeometry(0.01, 0.014, 0.85, 12);
  const stem = new THREE.Mesh(stemGeo, standMat);
  stem.position.set(0, standH / 2 + 0.32 + 0.42, 0);
  stem.castShadow = true;
  plant.add(stem);

  // 6 Broad stylized leaves radiating outwards
  const leafGeo = new THREE.SphereGeometry(0.16, 12, 12);
  leafGeo.scale(1.4, 0.12, 0.7);

  const leafConfigs = [
    { y: 0.55, rotY: 0.3, rotZ: 0.45 },
    { y: 0.68, rotY: 1.8, rotZ: 0.42 },
    { y: 0.82, rotY: 3.2, rotZ: 0.48 },
    { y: 0.95, rotY: 4.6, rotZ: 0.44 },
    { y: 1.08, rotY: 1.1, rotZ: 0.5 },
    { y: 1.18, rotY: 2.7, rotZ: 0.38 },
  ];

  leafConfigs.forEach((cfg) => {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(0, standH / 2 + cfg.y, 0);
    leaf.rotation.y = cfg.rotY;
    leaf.rotation.z = cfg.rotZ;
    leaf.position.x += Math.sin(cfg.rotY) * 0.14;
    leaf.position.z += Math.cos(cfg.rotY) * 0.14;
    leaf.castShadow = true;
    plant.add(leaf);
  });

  return plant;
}
