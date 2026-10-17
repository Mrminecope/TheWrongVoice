import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CreatureState,
  GameSettings,
  GameState,
  InteractVerb,
  InteractableDef,
  ItemId,
  MissionProgressState,
  NoiseEvent,
} from '../game/types.ts';
import {
  HIDING_SPOTS,
  INITIAL_DOORS,
  INITIAL_INTERACTABLES,
  INITIAL_WALLS,
  PLAYER_SPAWN,
  getRoomNameAt,
} from '../game/levelData.ts';
import {
  findBestInteractable,
  getDoorColliders,
  resolveCollision,
} from '../game/rules.ts';
import {
  CreatureRuntime,
  createInitialCreature,
  stepCreatureAI,
} from '../game/creatureAI.ts';
import {
  buildHandheldFlashlightMesh,
  buildHidingLockerMesh,
  buildListeningConsoleMesh,
  buildPickupMesh,
  buildRadioWorkbenchMesh,
  buildReceiverCreatureMesh,
  buildRelayTowerMesh,
  createGrimeBumpTexture,
} from '../game/ProceduralProps.ts';
import { audioManager } from '../game/AudioManager.ts';

interface GameCanvasProps {
  gameState: GameState;
  progress: MissionProgressState;
  settings: GameSettings;
  isCrouching: boolean;
  isHiding: boolean;
  activeHidingSpotId: string | null;
  isModalOpen: boolean;
  moveInputRef: React.MutableRefObject<{ x: number; y: number; sprinting: boolean }>;
  lookDeltaRef: React.MutableRefObject<{ dx: number; dy: number }>;
  playerTransformRef: React.MutableRefObject<{ x: number; z: number; yaw: number; pitch: number }>;
  decoyTriggerRef: React.MutableRefObject<number>;
  noiseQueueRef: React.MutableRefObject<NoiseEvent[]>;
  onPromptChange: (
    prompt: {
      target: InteractableDef;
      verb: InteractVerb;
      label: string;
      canExecute: boolean;
      blockedReason?: string;
    } | null,
  ) => void;
  onTapInteractTarget: (targetId: string) => void;
  onRoomChange: (room: string) => void;
  onCreatureUpdate: (
    state: CreatureState,
    distance: number,
    mimicQuote: { text: string; isImitation: boolean } | null,
    survivedHunt: boolean,
  ) => void;
  onPlayerCaught: () => void;
  onBatteryTick: (newBattery: number) => void;
  onDecoyLanded: (x: number, z: number) => void;
}

// Pre-allocated module-scope math objects (Zero-GC render loop)
const _camDir = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _dummyMat = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyScale = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyColor = new THREE.Color();

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  progress,
  settings,
  isCrouching,
  isHiding,
  activeHidingSpotId,
  isModalOpen,
  moveInputRef,
  lookDeltaRef,
  playerTransformRef,
  decoyTriggerRef,
  noiseQueueRef,
  onPromptChange,
  onTapInteractTarget,
  onRoomChange,
  onCreatureUpdate,
  onPlayerCaught,
  onBatteryTick,
  onDecoyLanded,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Store latest props in refs so the 60fps loop never tears down the WebGL context
  const latestRef = useRef({
    gameState,
    progress,
    settings,
    isCrouching,
    isHiding,
    activeHidingSpotId,
    isModalOpen,
    onPromptChange,
    onTapInteractTarget,
    onRoomChange,
    onCreatureUpdate,
    onPlayerCaught,
    onBatteryTick,
    onDecoyLanded,
  });

  useEffect(() => {
    latestRef.current = {
      gameState,
      progress,
      settings,
      isCrouching,
      isHiding,
      activeHidingSpotId,
      isModalOpen,
      onPromptChange,
      onTapInteractTarget,
      onRoomChange,
      onCreatureUpdate,
      onPlayerCaught,
      onBatteryTick,
      onDecoyLanded,
    };
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isHeadless && latestRef.current.settings.quality !== 'low',
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL is disabled or unavailable on this browser.');
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const initialQuality = latestRef.current.settings.quality;
    const maxDpr = isHeadless ? 1 : initialQuality === 'low' ? 1 : initialQuality === 'medium' ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.shadowMap.enabled = !isHeadless && initialQuality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.dataset.testid = 'game-canvas';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const fogColor = new THREE.Color(0x0b1017);
    scene.background = fogColor;
    scene.fog = new THREE.FogExp2(0x0b1017, 0.036);

    // Studio PBR Environment Reflection via RoomEnvironment + PMREMGenerator
    if (!isHeadless) {
      try {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        pmremGenerator.dispose();
      } catch {
        // Fallback if PMREM fails
      }
    }

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 95);
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    // 1. Balanced Studio & Horror Lighting Rig
    // Cool HemisphereLight fill paired with warm directional moonlight/porch key light
    const hemiLight = new THREE.HemisphereLight(0x4a6282, 0x241d18, 0.92);
    scene.add(hemiLight);

    const moonKeyLight = new THREE.DirectionalLight(0x9cb8dc, 1.35);
    moonKeyLight.position.set(12, 26, 20);
    if (!isHeadless && initialQuality !== 'low') {
      moonKeyLight.castShadow = true;
      moonKeyLight.shadow.mapSize.set(1024, 1024);
      moonKeyLight.shadow.camera.near = 1;
      moonKeyLight.shadow.camera.far = 55;
      const d = 16;
      moonKeyLight.shadow.camera.left = -d;
      moonKeyLight.shadow.camera.right = d;
      moonKeyLight.shadow.camera.top = d;
      moonKeyLight.shadow.camera.bottom = -d;
      moonKeyLight.shadow.bias = -0.0005;
    }
    scene.add(moonKeyLight);

    // Player First-Person Flashlight (SpotLight + soft close fill light + handheld 3D prop REF_11/12)
    const flashlightSpot = new THREE.SpotLight(0xfff2d6, 7.5, 25, Math.PI / 3.8, 0.52, 1.35);
    flashlightSpot.position.set(0.18, -0.14, 0);
    flashlightSpot.target.position.set(0, -0.04, -6);
    camera.add(flashlightSpot);
    camera.add(flashlightSpot.target);

    const flashlightBounce = new THREE.PointLight(0xdbe4f0, 0.85, 8.5, 1.6);
    camera.add(flashlightBounce);

    const handheldMesh = buildHandheldFlashlightMesh();
    handheldMesh.position.set(0.26, -0.24, -0.42);
    camera.add(handheldMesh);

    // 2. Procedural Textures & Materials
    const woodTex = createGrimeBumpTexture('wood');
    const concreteTex = createGrimeBumpTexture('concrete');
    const metalTex = createGrimeBumpTexture('metal');
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    woodTex.anisotropy = maxAniso;
    concreteTex.anisotropy = maxAniso;
    metalTex.anisotropy = maxAniso;

    const floorWoodMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodTex,
      bumpMap: woodTex,
      bumpScale: 0.02,
      roughness: 0.82,
      metalness: 0.08,
    });
    const wallConcreteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: concreteTex,
      bumpMap: concreteTex,
      bumpScale: 0.03,
      roughness: 0.86,
      metalness: 0.12,
    });
    const wallWoodMat = new THREE.MeshStandardMaterial({
      color: 0xd8cbb8,
      map: woodTex,
      bumpMap: woodTex,
      bumpScale: 0.025,
      roughness: 0.8,
      metalness: 0.1,
    });
    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x3b4248,
      map: metalTex,
      roughness: 0.55,
      metalness: 0.72,
    });

    // 3. Floors, Ceiling, Outdoor Forest Terrain & Landmark Relay Tower (REF_09)
    const outdoorGround = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ color: 0x121613, roughness: 0.95, metalness: 0.05 }),
    );
    outdoorGround.rotation.x = -Math.PI / 2;
    outdoorGround.position.y = -0.02;
    scene.add(outdoorGround);

    // Station Indoor Floor (offset at y = 0)
    const stationFloor = new THREE.Mesh(new THREE.PlaneGeometry(22.5, 21), floorWoodMat);
    stationFloor.rotation.x = -Math.PI / 2;
    stationFloor.position.set(0, 0, -2.2);
    stationFloor.receiveShadow = true;
    scene.add(stationFloor);

    // Porch Wooden Deck (offset at y = 0.01)
    const porchDeck = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 4.2), floorWoodMat);
    porchDeck.rotation.x = -Math.PI / 2;
    porchDeck.position.set(0, 0.01, 9.5);
    scene.add(porchDeck);

    // Station Indoor Ceiling (y = 3.6)
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(22.5, 20.5),
      new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.9 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 3.6, -2.5);
    scene.add(ceiling);

    // Iconic Relay Tower Landmark in Forest behind Station (REF_09)
    const relayTower = buildRelayTowerMesh();
    relayTower.position.set(0, 0, -22);
    scene.add(relayTower);

    // InstancedMesh Forest Pine Trees framing the exterior perimeter (>20 instances)
    const treeCount = 48;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 4.5, 7);
    trunkGeo.translate(0, 2.25, 0);
    const canopyGeo = new THREE.ConeGeometry(1.9, 6.5, 7);
    canopyGeo.translate(0, 6.2, 0);

    const trunkInst = new THREE.InstancedMesh(
      trunkGeo,
      new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.9 }),
      treeCount,
    );
    const canopyInst = new THREE.InstancedMesh(
      canopyGeo,
      new THREE.MeshStandardMaterial({ color: 0x122118, roughness: 0.85 }),
      treeCount,
    );

    let tIdx = 0;
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 19 + (i % 5) * 4.2;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius + 2;
      const s = 0.85 + (i % 4) * 0.12;
      _dummyPos.set(tx, 0, tz);
      _dummyQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.1);
      _dummyScale.set(s, s, s);
      _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
      trunkInst.setMatrixAt(tIdx, _dummyMat);
      canopyInst.setMatrixAt(tIdx, _dummyMat);
      _dummyColor.setHSL(0.38, 0.28, 0.08 + (i % 3) * 0.02);
      canopyInst.setColorAt(tIdx, _dummyColor);
      tIdx++;
    }
    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    canopyInst.computeBoundingSphere();
    scene.add(trunkInst, canopyInst);

    // 4. Build Station Walls & Architectural Props from INITIAL_WALLS
    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    for (const w of INITIAL_WALLS) {
      if (w.id.startsWith('prop_')) continue; // Handled by custom composite prop builders below
      const sx = w.maxX - w.minX;
      const sz = w.maxZ - w.minZ;
      const sy = w.height ?? 3.6;
      const mat =
        w.material === 'wood'
          ? wallWoodMat
          : w.material === 'fence'
            ? fenceMat
            : wallConcreteMat;
      const mesh = new THREE.Mesh(wallGeo, mat);
      mesh.scale.set(sx, sy, sz);
      mesh.position.set((w.minX + w.maxX) / 2, sy / 2, (w.minZ + w.maxZ) / 2);
      mesh.castShadow = !isHeadless;
      mesh.receiveShadow = !isHeadless;
      scene.add(mesh);
    }

    // 5. Architectural Ceiling Rafters, Baseboards & Collapsed Wooden Planks (REF_01, REF_11, REF_15)
    for (let z = 6.5; z >= -10.5; z -= 2.4) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 0.24), wallWoodMat);
      beam.position.set(0, 3.48, z);
      scene.add(beam);
    }

    // Splintered wall framing & collapsed diagonal planks in Entry Corridor (REF_01)
    for (let i = 0; i < 6; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.55, 0.08), wallWoodMat);
      const side = i % 2 === 0 ? -1.92 : 1.92;
      plank.position.set(side, 1.25, 6.4 - i * 1.15);
      plank.rotation.z = (i % 2 === 0 ? -1 : 1) * (0.11 + (i % 3) * 0.05);
      plank.rotation.x = (i - 2.5) * 0.06;
      scene.add(plank);
    }

    // Wall Conduits & Junction Boxes along Corridor
    for (const side of [-1.96, 1.96]) {
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 9.0, 8), fenceMat);
      conduit.rotation.x = Math.PI / 2;
      conduit.position.set(side, 2.75, 2.5);
      scene.add(conduit);
    }

    // Reception Desk on Right Side of Entry Corridor (x = 1.15, z = 5.0)
    const receptionDesk = new THREE.Group();
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 1.15), wallWoodMat);
    deskTop.position.y = 0.86;
    const deskBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.84, 1.05), wallConcreteMat);
    deskBase.position.y = 0.42;
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.28, 8), fenceMat);
    lampStem.position.set(0.22, 1.0, -0.28);
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.16, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffe4a0,
        emissive: 0xffb84d,
        emissiveIntensity: 2.2,
      }),
    );
    lampShade.position.set(0.22, 1.15, -0.28);
    receptionDesk.add(deskTop, deskBase, lampStem, lampShade);
    receptionDesk.position.set(1.15, 0, 5.0);
    scene.add(receptionDesk);

    // Abandoned Bedroom Iron Bed & utility props (REF_04)
    const bedGroup = new THREE.Group();
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.28, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x5c5346, roughness: 0.9 }),
    );
    mattress.position.y = 0.45;
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 1.85), fenceMat);
    headboard.position.set(-0.98, 0.55, 0);
    bedGroup.add(mattress, headboard);
    bedGroup.position.set(-8.7, 0, 5.6);
    scene.add(bedGroup);

    // Kitchen Open Refrigerator with Cold Light & Table (REF_04)
    const kitchenTable = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 1.6), wallWoodMat);
    kitchenTable.position.set(6.3, 0.425, 3.7);
    scene.add(kitchenTable);

    // Disjoint-depth patterned rug in Kitchen (offset y = 0.02 so it never Z-fights)
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x3b2824, roughness: 0.92 }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(6.3, 0.02, 3.7);
    scene.add(rug);

    const fridgeBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.95, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.5, metalness: 0.6 }),
    );
    fridgeBody.position.set(9.4, 0.975, 5.8);
    scene.add(fridgeBody);

    // Basement Fuse Box (REF_21)
    const fuseBoxGroup = new THREE.Group();
    const fuseCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.25), fenceMat);
    const fuseIndicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xff2b2b,
        emissive: 0xff1e1e,
        emissiveIntensity: 2.0,
      }),
    );
    fuseIndicator.position.set(0.22, 0.32, 0.14);
    fuseBoxGroup.add(fuseCabinet, fuseIndicator);
    fuseBoxGroup.position.set(-7.5, 1.35, -11.65);
    scene.add(fuseBoxGroup);

    // Emergency Radio Workbench (REF_03)
    const { group: radioBenchGroup, oscilloscopeLight } = buildRadioWorkbenchMesh();
    radioBenchGroup.position.set(0, 0, -10.85);
    scene.add(radioBenchGroup);

    // Secret Listening Chamber Console & Winch (REF_16)
    const {
      group: listeningConsoleGroup,
      servicePlate,
      statusLight: consoleStatusLight,
    } = buildListeningConsoleMesh();
    listeningConsoleGroup.position.set(8.2, 0, -10.8);
    scene.add(listeningConsoleGroup);

    // Exterior Exit Gate (REF_20)
    const exitGateGroup = new THREE.Group();
    for (let i = -3; i <= 3; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), fenceMat);
      bar.position.set(i * 0.28, 1.3, 0);
      exitGateGroup.add(bar);
    }
    const gateSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.35, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.4 }),
    );
    gateSign.position.set(0, 1.6, -0.05);
    exitGateGroup.add(gateSign);
    exitGateGroup.position.set(-4.5, 0, 16.9);
    scene.add(exitGateGroup);

    // 6. Station Ambient Corridor PointLights (capped at 4 lights for mobile performance)
    const porchLight = new THREE.PointLight(0xffb86c, 2.2, 12, 1.6);
    porchLight.position.set(0, 2.9, 8.6);
    scene.add(porchLight);

    const corridorLight = new THREE.PointLight(0xd4e8c8, 1.65, 13, 1.6);
    corridorLight.position.set(0, 3.1, 3.2);
    scene.add(corridorLight);

    const crossHallLight = new THREE.PointLight(0xff4b3a, 1.25, 14, 1.6);
    crossHallLight.position.set(0, 3.1, -2.8);
    scene.add(crossHallLight);

    // 7. Hinged Doors (REF_15) with Transom Headers
    const doorPivots = new Map<string, { pivot: THREE.Group; currentAngle: number; axis: 'x' | 'z' }>();
    const clickableProxies: THREE.Object3D[] = [];

    for (const d of INITIAL_DOORS) {
      const frameGroup = new THREE.Group();
      frameGroup.position.set(d.x, 0, d.z);
      if (d.axis === 'z') {
        frameGroup.rotation.y = Math.PI / 2;
      }

      // Door transom header & vertical side jambs (REF_15)
      const transom = new THREE.Mesh(
        new THREE.BoxGeometry(d.width + 0.24, 0.9, 0.3),
        wallWoodMat,
      );
      transom.position.set(0, 3.15, 0);
      frameGroup.add(transom);

      for (const jSide of [-1, 1]) {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.75, 0.32), wallWoodMat);
        jamb.position.set(jSide * (d.width / 2 + 0.05), 1.375, 0);
        frameGroup.add(jamb);
      }

      // Hinged door leaf pivoted at left jamb (-d.width / 2)
      const pivot = new THREE.Group();
      pivot.position.set(-d.width / 2, 0, 0);

      const leafMat = new THREE.MeshStandardMaterial({
        color: d.lockedByItem ? 0x5c4233 : 0x7a6654,
        map: woodTex,
        bumpMap: woodTex,
        bumpScale: 0.018,
        roughness: 0.76,
        metalness: 0.12,
      });
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(d.width, 2.68, 0.1), leafMat);
      leaf.position.set(d.width / 2, 1.34, 0);

      // Recessed door panels (upper & lower molding)
      for (const py of [0.68, 1.92]) {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(d.width * 0.72, 0.78, 0.125),
          wallWoodMat,
        );
        panel.position.set(d.width / 2, py, 0);
        leaf.add(panel);
      }

      // Brass Door Handle & Escutcheon Plate
      const handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xc99b52, roughness: 0.28, metalness: 0.88 }),
      );
      handle.position.set(d.width - 0.18, 1.15, 0.085);
      leaf.add(handle);

      const handleBack = handle.clone();
      handleBack.position.z = -0.085;
      leaf.add(handleBack);

      leaf.userData.interactableId = `int_${d.id}`;
      clickableProxies.push(leaf);

      pivot.add(leaf);
      frameGroup.add(pivot);
      scene.add(frameGroup);

      doorPivots.set(d.id, { pivot, currentAngle: 0, axis: d.axis });
    }

    // 8. Hiding Lockers
    for (const spot of HIDING_SPOTS) {
      const locker = buildHidingLockerMesh();
      locker.position.set(spot.x, 0, spot.z);
      locker.rotation.y = spot.facingYaw;
      locker.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.interactableId = `int_${spot.id}`;
          clickableProxies.push(child);
        }
      });
      scene.add(locker);
    }

    // 9. Pickup Meshes (REF_02..REF_21)
    const pickupMeshes = new Map<ItemId, THREE.Group>();
    for (const item of INITIAL_INTERACTABLES) {
      if (item.type === 'pickup' && item.itemId) {
        const meshGroup = buildPickupMesh(item.itemId);
        meshGroup.position.set(item.x, item.y, item.z);

        // Add subtle table/pedestal beneath floor-floating pickups that aren't on existing desks
        if (
          item.id !== 'pickup_theo_cassette_1' &&
          item.id !== 'pickup_freq_note' &&
          item.id !== 'pickup_listening_key'
        ) {
          const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, item.y, 0.65),
            wallWoodMat,
          );
          crate.position.set(item.x, item.y / 2, item.z);
          scene.add(crate);
        }

        meshGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.userData.interactableId = item.id;
            clickableProxies.push(child);
          }
        });
        scene.add(meshGroup);
        pickupMeshes.set(item.itemId, meshGroup);
      } else if (
        item.type === 'fuse_box' ||
        item.type === 'radio_workbench' ||
        item.type === 'shutdown_console' ||
        item.type === 'exit_gate'
      ) {
        // Invisible generous raycast box for tapping directly on puzzle stations
        const proxy = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.6, 1.4),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        proxy.position.set(item.x, item.y, item.z);
        proxy.userData.interactableId = item.id;
        clickableProxies.push(proxy);
        scene.add(proxy);
      }
    }

    // 10. Thrown Decoy Tin Projectile Mesh
    const activeDecoyMesh = buildPickupMesh('noise_decoy_1');
    activeDecoyMesh.visible = false;
    scene.add(activeDecoyMesh);
    let decoyFlight: {
      active: boolean;
      startX: number;
      startZ: number;
      endX: number;
      endZ: number;
      t: number;
    } = { active: false, startX: 0, startZ: 0, endX: 0, endZ: 0, t: 0 };
    let lastHandledDecoyTrigger = decoyTriggerRef.current;

    // 11. THE RECEIVER Creature Model (REF_08)
    const receiverParts = buildReceiverCreatureMesh();
    scene.add(receiverParts.group);
    let creatureStateRef: CreatureRuntime = createInitialCreature();

    // 12. Rain Streaks Particle System outside Porch
    const rainCount = isHeadless ? 40 : 180;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 26;
      rainPositions[i * 3 + 1] = Math.random() * 14;
      rainPositions[i * 3 + 2] = 7.5 + Math.random() * 14;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainPoints = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({
        color: 0x8ea6c4,
        size: 0.08,
        transparent: true,
        opacity: 0.45,
      }),
    );
    scene.add(rainPoints);

    // Pre-compile shaders once
    renderer.compile(scene, camera);

    // Tap-on-object support (tapping visible doors/pickups directly in addition to thumb button)
    let pointerDownPos = { x: 0, y: 0, time: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY, time: performance.now() };
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (latestRef.current.gameState !== 'playing' || latestRef.current.isModalOpen) return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      const elapsed = performance.now() - pointerDownPos.time;
      if (dist < 14 && elapsed < 320) {
        const rect = renderer.domElement.getBoundingClientRect();
        _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        _raycaster.setFromCamera(_pointerNdc, camera);
        const hits = _raycaster.intersectObjects(clickableProxies, false);
        if (hits.length > 0 && hits[0].distance <= 3.1) {
          const id = hits[0].object.userData.interactableId;
          if (id) {
            latestRef.current.onTapInteractTarget(id);
          }
        }
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    // ResizeObserver for responsive landscape/portrait mobile & desktop framing
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);
    window.addEventListener('resize', handleResize);

    // Animation & Gameplay Simulation Loop
    let animFrameId = 0;
    let lastTime = performance.now();
    let walkBobDistance = 0;
    let footstepAccum = 0;
    let batteryTimer = 0;
    let hudSyncTimer = 0;
    let currentTargetId: string | null = null;
    let promptHoldTimer = 0;
    let cachedPrompt: {
      target: InteractableDef;
      verb: InteractVerb;
      label: string;
      canExecute: boolean;
      blockedReason?: string;
    } | null = null;
    let lastRoom = '';

    const tick = (now: number) => {
      animFrameId = requestAnimationFrame(tick);

      const rawDt = (now - lastTime) / 1000;
      // In headless software WebGL, throttle to ~3.5fps so software rasterization never starves screenshot capture
      if (isHeadless && rawDt < 0.28) return;
      lastTime = now;
      const dt = Math.min(rawDt, isHeadless ? 0.28 : 0.05);

      const {
        gameState: curState,
        progress: curProg,
        settings: curSettings,
        isCrouching: curCrouch,
        isHiding: curHiding,
        activeHidingSpotId: curHideSpotId,
        isModalOpen: curModal,
      } = latestRef.current;

      // Sync pickup visibility & puzzle props
      for (const [itemId, group] of pickupMeshes.entries()) {
        const collected = curProg.collectedItems.includes(itemId);
        group.visible = !collected;
        if (!collected) {
          group.rotation.y += dt * 0.65;
        }
      }

      servicePlate.visible = !curProg.panelUnscrewed;
      oscilloscopeLight.intensity = curProg.powerRestored ? 1.8 : 0.1;
      consoleStatusLight.intensity = curProg.powerRestored ? 1.8 : 0.2;
      consoleStatusLight.color.setHex(curProg.signalShutDown ? 0x34d399 : 0xff2e2e);
      (fuseIndicator.material as THREE.MeshStandardMaterial).color.setHex(
        curProg.powerRestored ? 0x34d399 : 0xff2b2b,
      );
      (fuseIndicator.material as THREE.MeshStandardMaterial).emissive.setHex(
        curProg.powerRestored ? 0x10b981 : 0xff1e1e,
      );
      crossHallLight.color.setHex(curProg.powerRestored ? 0xffe2a8 : 0xff4b3a);
      crossHallLight.intensity = curProg.powerRestored ? 1.65 : 1.15;

      // Smoothly animate doors opening/closing
      for (const [doorId, doorObj] of doorPivots.entries()) {
        const isOpen = curProg.openDoors.includes(doorId);
        const targetAngle = isOpen ? -Math.PI * 0.58 : 0;
        doorObj.currentAngle = THREE.MathUtils.damp(
          doorObj.currentAngle,
          targetAngle,
          8,
          dt,
        );
        doorObj.pivot.rotation.y = doorObj.currentAngle;
      }

      // Animate outdoor rain particles
      const rainPosAttr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < rainCount; i++) {
        let ry = rainPosAttr.getY(i) - dt * 13;
        if (ry < 0) ry = 14;
        rainPosAttr.setY(i, ry);
      }
      rainPosAttr.needsUpdate = true;

      // STATE 1: TITLE SCREEN LIVE CAMERA PAN (Framing Relay Tower REF_09 & Station Porch on the right)
      if (curState === 'title') {
        const t = now * 0.00028;
        camera.position.set(Math.sin(t) * 2.2 + 2.4, 2.6 + Math.cos(t * 1.3) * 0.15, 16.2);
        _targetPos.set(Math.cos(t * 0.7) * 0.8 - 1.8, 7.2, -8);
        camera.lookAt(_targetPos);
        flashlightSpot.intensity = 0;
        handheldMesh.visible = false;
        renderer.render(scene, camera);
        return;
      }

      // STATE 2: PAUSED OR GAMEOVER — Freeze simulation, render current view
      if (curState !== 'playing' || curModal) {
        renderer.render(scene, camera);
        return;
      }

      // STATE 3: ACTIVE GAMEPLAY SIMULATION
      handheldMesh.visible = curProg.inventory.includes('flashlight') && !curHiding;
      const effectiveLightOn = curProg.flashlightOn && curProg.battery > 0 && !curHiding;
      flashlightSpot.intensity = effectiveLightOn ? 7.5 : 0;
      flashlightBounce.intensity = effectiveLightOn ? 0.85 : 0.25;

      // Drain battery slowly when flashlight is on (~0.6% per sec)
      if (effectiveLightOn) {
        batteryTimer += dt;
        if (batteryTimer >= 1.2) {
          batteryTimer = 0;
          const nextBat = Math.max(0, curProg.battery - 0.75);
          latestRef.current.onBatteryTick(nextBat);
        }
      }

      // Apply look delta (swipe or mouse)
      if (lookDeltaRef.current.dx !== 0 || lookDeltaRef.current.dy !== 0) {
        const sens = curSettings.lookSensitivity * 0.0042;
        playerTransformRef.current.yaw -= lookDeltaRef.current.dx * sens;
        playerTransformRef.current.pitch = Math.max(
          -Math.PI / 2.6,
          Math.min(Math.PI / 2.6, playerTransformRef.current.pitch - lookDeltaRef.current.dy * sens),
        );
        lookDeltaRef.current.dx = 0;
        lookDeltaRef.current.dy = 0;
      }

      // Active collision walls (static walls + closed doors)
      const doorColliders = getDoorColliders(INITIAL_DOORS, curProg.openDoors);
      const allColliders = [...INITIAL_WALLS, ...doorColliders];

      // Player Movement (when not inside a hiding locker)
      const pTrans = playerTransformRef.current;
      if (curHiding && curHideSpotId) {
        const spot = HIDING_SPOTS.find((s) => s.id === curHideSpotId);
        if (spot) {
          pTrans.x = THREE.MathUtils.damp(pTrans.x, spot.x, 10, dt);
          pTrans.z = THREE.MathUtils.damp(pTrans.z, spot.z, 10, dt);
        }
      } else {
        const inputX = moveInputRef.current.x;
        const inputY = moveInputRef.current.y;
        const isSprinting = moveInputRef.current.sprinting && !curCrouch;
        const inputLen = Math.hypot(inputX, inputY);

        if (inputLen > 0.04) {
          const normX = inputX / Math.max(1, inputLen);
          const normY = inputY / Math.max(1, inputLen);
          const baseSpeed = curCrouch ? 1.85 : isSprinting ? 4.4 : 2.95;

          const sinY = Math.sin(pTrans.yaw);
          const cosY = Math.cos(pTrans.yaw);
          // Forward is (-sinY, -cosY), Right is (cosY, -sinY)
          const moveDx = (-sinY * normY + cosY * normX) * baseSpeed * dt;
          const moveDz = (-cosY * normY - sinY * normX) * baseSpeed * dt;

          const resolved = resolveCollision(
            pTrans.x + moveDx,
            pTrans.z + moveDz,
            0.35,
            allColliders,
          );
          const actualDist = Math.hypot(resolved.x - pTrans.x, resolved.z - pTrans.z);
          pTrans.x = resolved.x;
          pTrans.z = resolved.z;

          walkBobDistance += actualDist * (isSprinting ? 3.2 : 2.5);
          footstepAccum += actualDist;

          const stepInterval = isSprinting ? 1.25 : curCrouch ? 1.65 : 1.4;
          if (footstepAccum >= stepInterval) {
            footstepAccum = 0;
            const isIndoorWood = pTrans.z > -4.5;
            audioManager.playFootstep(isSprinting, curCrouch, isIndoorWood);
            // Emit noise event
            noiseQueueRef.current.push({
              x: pTrans.x,
              z: pTrans.z,
              loudness: isSprinting ? 62 : curCrouch ? 7 : 24,
              source: isSprinting ? 'sprint' : 'footstep',
              timestamp: now,
            });
          }
        }
      }

      // Check thrown Noise Decoy Tin trigger
      if (decoyTriggerRef.current !== lastHandledDecoyTrigger) {
        lastHandledDecoyTrigger = decoyTriggerRef.current;
        const fwdX = -Math.sin(pTrans.yaw);
        const fwdZ = -Math.cos(pTrans.yaw);
        let landX = pTrans.x + fwdX * 5.2;
        let landZ = pTrans.z + fwdZ * 5.2;
        const resolvedDecoy = resolveCollision(landX, landZ, 0.25, allColliders);
        landX = resolvedDecoy.x;
        landZ = resolvedDecoy.z;

        decoyFlight = {
          active: true,
          startX: pTrans.x,
          startZ: pTrans.z,
          endX: landX,
          endZ: landZ,
          t: 0,
        };
        activeDecoyMesh.visible = true;
      }

      if (decoyFlight.active) {
        decoyFlight.t += dt * 2.4;
        if (decoyFlight.t >= 1) {
          decoyFlight.active = false;
          activeDecoyMesh.position.set(decoyFlight.endX, 0.02, decoyFlight.endZ);
          latestRef.current.onDecoyLanded(decoyFlight.endX, decoyFlight.endZ);
        } else {
          const u = decoyFlight.t;
          const cx = THREE.MathUtils.lerp(decoyFlight.startX, decoyFlight.endX, u);
          const cz = THREE.MathUtils.lerp(decoyFlight.startZ, decoyFlight.endZ, u);
          const cy = Math.sin(u * Math.PI) * 1.15 + 0.1;
          activeDecoyMesh.position.set(cx, cy, cz);
          activeDecoyMesh.rotation.x += dt * 10;
          activeDecoyMesh.rotation.z += dt * 8;
        }
      }

      // Smooth Camera Height & Walk Bob
      const targetEyeY = curHiding ? 1.52 : curCrouch ? 1.02 : 1.65;
      const shakeScale = curSettings.reducedShake ? 0.2 : 1.0;
      const bobY = Math.sin(walkBobDistance * 2.2) * 0.032 * shakeScale;
      const bobX = Math.cos(walkBobDistance * 1.1) * 0.018 * shakeScale;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, pTrans.x + bobX, 18, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetEyeY + bobY, 14, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, pTrans.z, 18, dt);
      camera.rotation.y = pTrans.yaw;
      camera.rotation.x = pTrans.pitch;

      // Subtle handheld flashlight sway
      handheldMesh.position.x = 0.24 + Math.cos(walkBobDistance * 1.1) * 0.008;
      handheldMesh.position.y = -0.22 + Math.sin(walkBobDistance * 2.2) * 0.01;

      // Step The Receiver AI (active as soon as the player steps onto the threshold z < 7.2 or completes Mission 1)
      const creatureActive =
        curProg.mission !== '1_ENTER_STATION' || pTrans.z < 7.2;
      const aggression =
        curProg.mission === '7_ESCAPE'
          ? 1.25
          : curProg.mission === '6_SHUT_DOWN_SIGNAL'
            ? 1.12
            : 1.0;

      const pendingNoises = noiseQueueRef.current.splice(0, noiseQueueRef.current.length);

      if (creatureActive) {
        const aiResult = stepCreatureAI(
          creatureStateRef,
          dt,
          pTrans.x,
          pTrans.z,
          curHiding,
          curHideSpotId,
          curCrouch,
          effectiveLightOn,
          pendingNoises,
          curProg.hidingSpotUsage,
          allColliders,
          aggression,
        );
        creatureStateRef = aiResult.creature;

        // Update 3D articulated Receiver mesh with state-driven posture & listening/searching motions
        receiverParts.group.visible = true;
        receiverParts.group.position.set(creatureStateRef.x, 0, creatureStateRef.z);
        receiverParts.group.rotation.y = creatureStateRef.yaw;

        const isChasing = creatureStateRef.state === 'CHASE_VISIBLE_PLAYER';
        const isSearching =
          creatureStateRef.state === 'INVESTIGATE_SOUND' ||
          creatureStateRef.state === 'SEARCH_LAST_KNOWN_POSITION' ||
          creatureStateRef.state === 'CHECK_HIDING_SPOTS';

        // Head scanning & unnatural acoustic listening tilt
        receiverParts.headGroup.rotation.z = creatureStateRef.headTilt;
        receiverParts.headGroup.rotation.y = isSearching
          ? Math.sin(now * 0.0045) * 0.58
          : Math.sin(now * 0.0018) * 0.18;

        // Torso pitch & breathing heave
        receiverParts.torsoGroup.rotation.x = isChasing
          ? 0.24
          : isSearching
            ? 0.14
            : Math.sin(now * 0.0025) * 0.04;

        //Eye light color/intensity shifts between pale receiver blue and hunting crimson
        receiverParts.eyeLight.color.setHex(isChasing ? 0xff4238 : 0x9ecbff);
        receiverParts.eyeLight.intensity = isChasing ? 1.6 : 0.95;

        // Articulated limb gait
        receiverParts.leftLeg.rotation.x = Math.sin(creatureStateRef.stridePhase) * 0.46;
        receiverParts.rightLeg.rotation.x = -Math.sin(creatureStateRef.stridePhase) * 0.46;
        receiverParts.leftArm.rotation.x = isChasing
          ? -0.65 + Math.sin(creatureStateRef.stridePhase) * 0.35
          : -Math.sin(creatureStateRef.stridePhase) * 0.28;
        receiverParts.rightArm.rotation.x = isChasing
          ? -0.65 - Math.sin(creatureStateRef.stridePhase) * 0.35
          : Math.sin(creatureStateRef.stridePhase) * 0.28;

        const cDist = Math.hypot(creatureStateRef.x - pTrans.x, creatureStateRef.z - pTrans.z);
        audioManager.updateSpatialAmbience(
          pTrans.z > 7.5,
          curProg.powerRestored,
          cDist,
          isChasing,
        );

        if (aiResult.caughtPlayer) {
          latestRef.current.onPlayerCaught();
          return;
        }

        if (aiResult.triggeredMimic || aiResult.survivedHunt) {
          latestRef.current.onCreatureUpdate(
            creatureStateRef.state,
            cDist,
            aiResult.triggeredMimic,
            aiResult.survivedHunt,
          );
        }
      } else {
        // Distant unnatural silhouette of The Receiver listening at the end of the Entry Corridor (z = -1.8)
        receiverParts.group.visible = true;
        receiverParts.group.position.set(0, 0, -1.8);
        receiverParts.group.rotation.y = Math.PI;
        receiverParts.headGroup.rotation.z = Math.sin(now * 0.003) * 0.26;
        receiverParts.headGroup.rotation.y = Math.cos(now * 0.002) * 0.32;
      }

      // HUD & Interaction Hysteresis Check (runs every rendered frame in headless mode or ~15Hz on device)
      hudSyncTimer += dt;
      if (isHeadless || hudSyncTimer >= 0.065) {
        hudSyncTimer = 0;

        const room = getRoomNameAt(pTrans.x, pTrans.z);
        if (room !== lastRoom) {
          lastRoom = room;
          latestRef.current.onRoomChange(room);
        }

        const cDist = Math.hypot(creatureStateRef.x - pTrans.x, creatureStateRef.z - pTrans.z);
        latestRef.current.onCreatureUpdate(creatureStateRef.state, cDist, null, false);

        const candidate = findBestInteractable(
          pTrans.x,
          pTrans.z,
          pTrans.yaw,
          INITIAL_INTERACTABLES,
          curProg,
          allColliders,
          curHiding,
          currentTargetId,
        );

        if (candidate) {
          currentTargetId = candidate.target.id;
          promptHoldTimer = 0.18; // 180ms anti-flicker fade-out delay
          cachedPrompt = candidate;
          latestRef.current.onPromptChange(candidate);
        } else if (promptHoldTimer > 0) {
          promptHoldTimer = Math.max(0, promptHoldTimer - dt);
          if (promptHoldTimer <= 0) {
            currentTargetId = null;
            cachedPrompt = null;
            latestRef.current.onPromptChange(null);
          } else {
            latestRef.current.onPromptChange(cachedPrompt);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObs.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.dispose();
    };
  }, [
    decoyTriggerRef,
    lookDeltaRef,
    moveInputRef,
    noiseQueueRef,
    playerTransformRef,
  ]);

  if (webglError) {
    return (
      <div className="fixed inset-0 bg-[#090a0c] text-[#e2dfd7] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="font-display text-2xl mb-2">THE WRONG VOICE</h1>
        <p className="text-sm text-[#9e998e] max-w-md">{webglError}</p>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full bg-[#090a0c] overflow-hidden"
      aria-label="3D View of Greyfen Emergency Relay Station"
    />
  );
};
