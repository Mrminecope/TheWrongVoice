import * as THREE from 'three';
import { ItemId } from './types.ts';

/**
 * Generates procedural CanvasTextures for wood grain, damp concrete grime, rug pattern,
 * and readable notes (REF_19 704.52 note, REF_03 oscilloscope, REF_10 diary).
 */
export function createGrimeBumpTexture(type: 'wood' | 'concrete' | 'metal'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (type === 'wood') {
    ctx.fillStyle = '#5c4534';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      ctx.fillStyle = y % 64 === 0 ? '#4a3628' : '#564030';
      ctx.fillRect(0, y, 256, 30);
      ctx.fillStyle = '#241810';
      ctx.fillRect(0, y + 30, 256, 2);
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(255,235,205,0.07)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 24, 2);
    }
  } else if (type === 'concrete') {
    ctx.fillStyle = '#484e54';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 64) {
      ctx.fillStyle = 'rgba(22, 26, 30, 0.35)';
      ctx.fillRect(0, y, 256, 2);
    }
    for (let i = 0; i < 160; i++) {
      const shade = 52 + Math.floor(Math.random() * 28);
      ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 6},0.22)`;
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 14, 0, Math.PI * 2);
      ctx.fill();
    }
    // Damp water stains near bottom/top
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(12,16,14,0.48)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(12,16,14,0.58)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else {
    ctx.fillStyle = '#525a63';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(120,68,42,0.32)' : 'rgba(24,28,34,0.35)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 10, 3);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

/**
 * Adds a soft radial contact shadow disc at y = 0.015 under grounded props/actors.
 */
export function createContactShadow(radius = 0.55, opacity = 0.42): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 16);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x030405,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.015;
  return mesh;
}

/**
 * Builds THE RECEIVER (REF_08):
 * Original tall (2.45m), unnaturally thin humanoid silhouette built as a 12-part THREE.Group
 * with torn acoustic-insulation ribbing, asymmetrical head with single pale receiver lens,
 * elongated segmented arms/legs, and trailing copper/coaxial cables.
 */
export function buildReceiverCreatureMesh(): {
  group: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
} {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x151819,
    roughness: 0.88,
    metalness: 0.12,
  });
  const ribMat = new THREE.MeshStandardMaterial({
    color: 0x23272a,
    roughness: 0.58,
    metalness: 0.35,
  });
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x6e472b,
    roughness: 0.35,
    metalness: 0.82,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xeff7ff,
    emissive: 0xd8ecff,
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });

  // 1. Contact Shadow
  group.add(createContactShadow(0.65, 0.55));

  // 2. Pelvis & Spine Core
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.28, 10), bodyMat);
  pelvis.position.y = 1.15;
  group.add(pelvis);

  // 3. Elongated Ribcage / Torn Acoustic Insulation Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.13, 0.72, 10), bodyMat);
  torso.position.y = 1.62;
  torso.scale.set(1.15, 1, 0.72);
  group.add(torso);

  // 4. Acoustic Baffle Ribs across Chest
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.17 + i * 0.01, 0.022, 6, 12), ribMat);
    rib.position.y = 1.42 + i * 0.12;
    rib.rotation.x = Math.PI / 2 + (i % 2 === 0 ? 0.12 : -0.1);
    rib.scale.set(1.15, 0.75, 1);
    group.add(rib);
  }

  // 5. Elongated Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.26, 8), bodyMat);
  neck.position.set(0, 2.06, -0.03);
  neck.rotation.x = 0.15;
  group.add(neck);

  // 6. Asymmetrical Head Group with Single Pale Optical Receiver Lens (REF_08)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.26, -0.06);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 12), bodyMat);
  cranium.scale.set(0.82, 1.38, 0.95);
  headGroup.add(cranium);

  const receiverEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
  receiverEye.position.set(-0.045, 0.02, -0.12);
  headGroup.add(receiverEye);

  const acousticHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.02, 0.06, 10), ribMat);
  acousticHorn.rotation.x = Math.PI / 2;
  acousticHorn.position.set(0.035, -0.04, -0.115);
  headGroup.add(acousticHorn);

  group.add(headGroup);

  // 7 & 8. Unnaturally Long Left & Right Arms (hanging past knees)
  const buildArm = (side: -1 | 1): THREE.Group => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.28, 1.92, 0);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.56, 8), bodyMat);
    upper.position.y = -0.26;
    upper.rotation.z = side * 0.06;
    armGroup.add(upper);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.028, 0.62, 8), ribMat);
    forearm.position.set(side * 0.03, -0.82, -0.04);
    forearm.rotation.x = -0.18;
    armGroup.add(forearm);

    // Elongated claws/fingers
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.08), bodyMat);
    hand.position.set(side * 0.04, -1.2, -0.1);
    armGroup.add(hand);

    return armGroup;
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  group.add(leftArm, rightArm);

  // 9 & 10. Gaunt Left & Right Legs
  const buildLeg = (side: -1 | 1): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.13, 1.08, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.052, 0.54, 8), bodyMat);
    thigh.position.y = -0.27;
    legGroup.add(thigh);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.56, 8), ribMat);
    shin.position.y = -0.8;
    legGroup.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.26), bodyMat);
    foot.position.set(0, -1.05, -0.06);
    legGroup.add(foot);

    return legGroup;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  group.add(leftLeg, rightLeg);

  // 11. Draped Coaxial Copper Wires around Shoulders
  const cableLoop = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 6, 16), wireMat);
  cableLoop.position.set(0, 1.82, 0.02);
  cableLoop.rotation.set(0.5, 0.3, 0);
  group.add(cableLoop);

  return { group, headGroup, leftArm, rightArm, leftLeg, rightLeg };
}

/**
 * Builds the Exterior Relay Tower in the Forest (REF_09).
 */
export function buildRelayTowerMesh(): THREE.Group {
  const group = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x26292e,
    roughness: 0.9,
    metalness: 0.15,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x3b4248,
    roughness: 0.45,
    metalness: 0.78,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff2a2a,
    emissive: 0xff1e1e,
    emissiveIntensity: 3.0,
  });

  // Lower concrete brutalist shaft
  const baseShaft = new THREE.Mesh(new THREE.BoxGeometry(4.6, 14, 4.6), concreteMat);
  baseShaft.position.y = 7;
  group.add(baseShaft);

  // Mid concrete tier
  const midTier = new THREE.Mesh(new THREE.BoxGeometry(3.8, 8, 3.8), concreteMat);
  midTier.position.y = 18;
  group.add(midTier);

  // Observation / Relay Crown with Overhang Roof (matching REF_09)
  const crown = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 4.4), steelMat);
  crown.position.y = 23.2;
  group.add(crown);

  // Illuminated observation slit windows around the Relay Tower crown
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffd28a,
    emissive: 0xffaa44,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  for (const zSide of [-2.22, 2.22]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 0.06), windowMat);
    win.position.set(0, 23.3, zSide);
    group.add(win);
  }

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.8, 4), concreteMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 25.3;
  group.add(roof);

  // Antenna spire & red storm beacon
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 5.5, 8), steelMat);
  spire.position.y = 28.2;
  group.add(spire);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10), beaconMat);
  beacon.position.y = 31.1;
  group.add(beacon);

  // Side microwave relay dishes
  for (const side of [-1, 1]) {
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.25, 0.5, 12), steelMat);
    dish.rotation.z = (side * Math.PI) / 2;
    dish.position.set(side * 2.4, 20.5, 0);
    group.add(dish);
  }

  return group;
}

/**
 * Builds the First-Person Metal Flashlight held in the player's right hand (REF_11 & REF_12).
 */
export function buildHandheldFlashlightMesh(): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x3b4046,
    roughness: 0.32,
    metalness: 0.88,
  });
  const blueBandMat = new THREE.MeshStandardMaterial({
    color: 0x2664b8,
    roughness: 0.55,
    metalness: 0.2,
  });
  const redSwitchMat = new THREE.MeshStandardMaterial({
    color: 0xc82828,
    roughness: 0.4,
    metalness: 0.15,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xfff6d6,
    emissive: 0xffebb3,
    emissiveIntensity: 1.5,
    roughness: 0.1,
  });

  // Ribbed barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.22, 14), steelMat);
  barrel.rotation.x = Math.PI / 2;
  group.add(barrel);

  // Blue collar band (REF_12 signature detail)
  const blueBand = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.028, 14), blueBandMat);
  blueBand.rotation.x = Math.PI / 2;
  blueBand.position.z = -0.09;
  group.add(blueBand);

  // Flared reflector head
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.034, 0.065, 16), steelMat);
  head.rotation.x = Math.PI / 2;
  head.position.z = -0.135;
  group.add(head);

  // Glowing front lens
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), lensMat);
  lens.rotation.y = Math.PI;
  lens.position.z = -0.169;
  group.add(lens);

  // Red button & thumb slider switch
  const redBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 8), redSwitchMat);
  redBtn.position.set(0, 0.035, -0.05);
  group.add(redBtn);

  return group;
}

/**
 * Builds composite 3-8 part 3D models for every pickup and lore collectible (REF_02..REF_21).
 */
export function buildPickupMesh(itemId: ItemId): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(0.26, 0.38));

  const brassMat = new THREE.MeshStandardMaterial({ color: 0xb88c4a, roughness: 0.3, metalness: 0.88 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x6e432c, roughness: 0.78, metalness: 0.62 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.26, metalness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a24, roughness: 0.72, metalness: 0.1 });
  const yellowTagMat = new THREE.MeshStandardMaterial({
    color: 0xe6c229,
    emissive: 0x3a2e00,
    roughness: 0.4,
    metalness: 0.1,
  });

  if (
    itemId === 'theo_cassette_1' ||
    itemId === 'cassette_operator_2' ||
    itemId === 'theo_cassette_final'
  ) {
    // Vintage Cassette Prop (REF_05 & REF_07)
    const isAlt = itemId === 'cassette_operator_2';
    const shellMat = new THREE.MeshStandardMaterial({
      color: isAlt ? 0xb59b78 : 0x7c858e,
      roughness: 0.55,
      metalness: 0.2,
    });
    const labelMat = new THREE.MeshStandardMaterial({
      color: isAlt ? 0xd99b4e : 0xa3d5d3,
      roughness: 0.65,
    });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.18), shellMat);
    shell.position.y = 0.03;
    group.add(shell);

    const label = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.11), labelMat);
    label.position.set(0, 0.051, -0.01);
    group.add(label);

    for (const side of [-0.06, 0.06]) {
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.045, 10), steelMat);
      reel.position.set(side, 0.032, -0.01);
      group.add(reel);
    }
    return group;
  }

  if (itemId === 'glass_fuse') {
    // 250V Glass Fuse (REF_21)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdff5ff,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.05,
    });
    const capLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 14), brassMat);
    capLeft.rotation.z = Math.PI / 2;
    capLeft.position.set(-0.11, 0.05, 0);
    group.add(capLeft);

    const capRight = capLeft.clone();
    capRight.position.set(0.11, 0.05, 0);
    group.add(capRight);

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.16, 14), glassMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, 0.05, 0);
    group.add(tube);

    const filament = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 6), steelMat);
    filament.rotation.z = Math.PI / 2 + 0.18;
    filament.position.set(0, 0.05, 0);
    group.add(filament);
    return group;
  }

  if (itemId === 'maintenance_key' || itemId === 'listening_key' || itemId === 'exit_key') {
    // Keys (REF_06 Brass, REF_13 Rusted, REF_20 Tagged Key Ring)
    const mat =
      itemId === 'listening_key' ? brassMat : itemId === 'maintenance_key' ? rustMat : steelMat;

    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 16), mat);
    bow.rotation.x = Math.PI / 2;
    bow.position.set(-0.08, 0.03, 0);
    group.add(bow);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), mat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.03, 0.03, 0);
    group.add(shaft);

    const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.05), mat);
    bit1.position.set(0.09, 0.03, 0.03);
    group.add(bit1);

    if (itemId === 'exit_key') {
      // Yellow hazard key tag (REF_20)
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.08), yellowTagMat);
      tag.position.set(-0.16, 0.03, 0.05);
      tag.rotation.y = 0.4;
      group.add(tag);
    }
    return group;
  }

  if (itemId === 'spare_batteries_1' || itemId === 'spare_batteries_2') {
    // Spare AA Batteries (REF_02)
    const amberMat = new THREE.MeshStandardMaterial({ color: 0xe09624, roughness: 0.3, metalness: 0.4 });
    for (let i = 0; i < 2; i++) {
      const batGroup = new THREE.Group();
      const silverHalf = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.11, 12), steelMat);
      silverHalf.rotation.z = Math.PI / 2;
      batGroup.add(silverHalf);

      const amberHalf = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.07, 12), amberMat);
      amberHalf.rotation.z = Math.PI / 2;
      amberHalf.position.x = 0.06;
      batGroup.add(amberHalf);

      const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.018, 10), steelMat);
      nub.rotation.z = Math.PI / 2;
      nub.position.x = 0.1;
      batGroup.add(nub);

      batGroup.position.set(0, 0.03 + i * 0.03, i * 0.05 - 0.02);
      batGroup.rotation.y = i * 0.45;
      group.add(batGroup);
    }
    return group;
  }

  if (itemId === 'noise_decoy_1' || itemId === 'noise_decoy_2') {
    // Tin of Metal Bolts (REF_18)
    const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.18, 14), rustMat);
    tin.position.y = 0.09;
    group.add(tin);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.008, 6, 14), steelMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.18;
    group.add(rim);

    // Bolts & hex nuts inside top
    for (let i = 0; i < 5; i++) {
      const nut = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.007, 6, 6), steelMat);
      nut.rotation.x = Math.PI / 2 + (i - 2) * 0.2;
      nut.position.set(Math.cos(i * 1.2) * 0.03, 0.17, Math.sin(i * 1.2) * 0.03);
      group.add(nut);
    }
    return group;
  }

  if (itemId === 'screwdriver') {
    // Flathead Maintenance Screwdriver (REF_14)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.16, 12), woodMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-0.08, 0.035, 0);
    group.add(handle);

    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.03, 12), steelMat);
    ferrule.rotation.z = Math.PI / 2;
    ferrule.position.set(0.01, 0.035, 0);
    group.add(ferrule);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8), steelMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.11, 0.035, 0);
    group.add(shaft);
    return group;
  }

  // Readable Documents: freq_note (REF_19), operator_diary (REF_10), family_photo (REF_17)
  const paperMat = new THREE.MeshStandardMaterial({
    color: itemId === 'family_photo' ? 0x9e8264 : 0xd8ceb8,
    roughness: 0.78,
  });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 0.24), woodMat);
  cover.position.y = 0.015;
  group.add(cover);

  const page = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.03, 0.21), paperMat);
  page.position.y = 0.022;
  group.add(page);

  return group;
}

/**
 * Builds the Emergency Radio Workbench (REF_03):
 * Wooden desk, olive-drab transceiver, oscilloscope CRT monitor, reel-to-reel recorder, and warm desk lamp.
 */
export function buildRadioWorkbenchMesh(): {
  group: THREE.Group;
  oscilloscopeLight: THREE.PointLight;
} {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x473223, roughness: 0.8, metalness: 0.08 });
  const oliveMat = new THREE.MeshStandardMaterial({ color: 0x3b4a36, roughness: 0.55, metalness: 0.45 });
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x525860, roughness: 0.4, metalness: 0.65 });
  const crtMat = new THREE.MeshStandardMaterial({
    color: 0x264496,
    emissive: 0x1e3c8c,
    emissiveIntensity: 1.4,
    roughness: 0.15,
  });
  const redMatrixMat = new THREE.MeshStandardMaterial({
    color: 0xff3b2f,
    emissive: 0xd9261c,
    emissiveIntensity: 1.8,
  });

  // Workbench Table
  const tabletop = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 1.15), woodMat);
  tabletop.position.y = 0.9;
  group.add(tabletop);

  for (const lx of [-1.55, 1.55]) {
    for (const lz of [-0.45, 0.45]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), woodMat);
      leg.position.set(lx, 0.45, lz);
      group.add(leg);
    }
  }

  // Olive-Drab Military Transceiver (REF_03 center)
  const transceiver = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.46, 0.52), oliveMat);
  transceiver.position.set(-0.35, 1.18, -0.05);
  group.add(transceiver);

  // Red LED matrix bar at bottom of transceiver
  const redMatrix = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.02), redMatrixMat);
  redMatrix.position.set(-0.35, 1.04, 0.22);
  group.add(redMatrix);

  // Tuning Dials
  for (let i = 0; i < 3; i++) {
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 12), caseMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(-0.55 + i * 0.2, 1.22, 0.22);
    group.add(dial);
  }

  // Oscilloscope Monitor on Right (REF_03)
  const scopeBox = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.48), caseMat);
  scopeBox.position.set(0.58, 1.16, -0.04);
  scopeBox.rotation.y = -0.18;
  group.add(scopeBox);

  const scopeScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), crtMat);
  scopeScreen.position.set(0.54, 1.16, 0.205);
  scopeScreen.rotation.y = -0.18;
  group.add(scopeScreen);

  // Reel-to-Reel Tape Deck on Far Right
  const reelDeck = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.56, 0.34), oliveMat);
  reelDeck.position.set(1.28, 1.23, -0.12);
  reelDeck.rotation.y = -0.3;
  group.add(reelDeck);

  // Gooseneck Desk Lamp on Left
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 12), caseMat);
  lampBase.position.set(-1.25, 0.97, 0.1);
  group.add(lampBase);

  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), caseMat);
  lampArm.position.set(-1.15, 1.24, 0.1);
  lampArm.rotation.z = -0.35;
  group.add(lampArm);

  const oscilloscopeLight = new THREE.PointLight(0xffb86c, 1.6, 5.5, 2);
  oscilloscopeLight.position.set(-0.95, 1.48, 0.25);
  group.add(oscilloscopeLight);

  return { group, oscilloscopeLight };
}

/**
 * Builds the Secret Listening Chamber Master Console & Rusted Generator Winch (REF_16).
 */
export function buildListeningConsoleMesh(): {
  group: THREE.Group;
  servicePlate: THREE.Mesh;
  statusLight: THREE.PointLight;
} {
  const group = new THREE.Group();

  const rustFrameMat = new THREE.MeshStandardMaterial({
    color: 0x733e24,
    roughness: 0.72,
    metalness: 0.65,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x262a2e,
    roughness: 0.5,
    metalness: 0.82,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x5c646b,
    roughness: 0.38,
    metalness: 0.85,
  });

  // Heavy Rusted Generator / Winch Frame (REF_16 right side)
  const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.15, 1.1), rustFrameMat);
  baseFrame.position.y = 0.58;
  group.add(baseFrame);

  // Spoked Winch Wheels & Shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 12), darkIronMat);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0, 1.38, -0.1);
  group.add(shaft);

  for (const wx of [-0.95, 0, 0.95]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 18), rustFrameMat);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(wx, 1.38, -0.1);
    group.add(wheel);
  }

  // Screwed Service Plate on front of Master Console
  const servicePlate = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 0.05), plateMat);
  servicePlate.position.set(0, 0.82, 0.56);
  group.add(servicePlate);

  const statusLight = new THREE.PointLight(0xff2e2e, 1.8, 6.0, 2);
  statusLight.position.set(0, 1.65, 0.5);
  group.add(statusLight);

  return { group, servicePlate, statusLight };
}

/**
 * Builds a Steel Hiding Locker with louvered vents.
 */
export function buildHidingLockerMesh(): THREE.Group {
  const group = new THREE.Group();
  const lockerMat = new THREE.MeshStandardMaterial({
    color: 0x2d353b,
    roughness: 0.55,
    metalness: 0.72,
  });
  const darkVentMat = new THREE.MeshStandardMaterial({
    color: 0x111417,
    roughness: 0.8,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.15, 0.85), lockerMat);
  body.position.y = 1.075;
  group.add(body);

  for (let i = 0; i < 4; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.48), darkVentMat);
    vent.position.set(0, 1.55 + i * 0.09, 0);
    group.add(vent);
  }

  return group;
}
