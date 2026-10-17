import * as THREE from 'three';
import { ItemId } from './types.ts';

/**
 * Generates high-resolution (512x512) procedural CanvasTextures for weathered wood planking,
 * water-stained damaged plaster/concrete, rusted corrugated metal, and floor boards.
 */
export function createGrimeBumpTexture(
  type: 'wood' | 'concrete' | 'metal' | 'plaster',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (type === 'wood') {
    // Rich weathered timber planks with knots, grain lines, and dark plank seams (REF_01, REF_11)
    ctx.fillStyle = '#584130';
    ctx.fillRect(0, 0, 512, 512);

    const plankH = 64;
    for (let y = 0; y < 512; y += plankH) {
      const tone = (y / plankH) % 2 === 0 ? '#503a2a' : '#5e4533';
      ctx.fillStyle = tone;
      ctx.fillRect(0, y, 512, plankH - 3);

      // Horizontal wood grain streaks
      for (let g = 0; g < 28; g++) {
        ctx.fillStyle = g % 2 === 0 ? 'rgba(26, 16, 10, 0.24)' : 'rgba(215, 180, 140, 0.06)';
        const gy = y + 4 + ((g * 7) % (plankH - 8));
        ctx.fillRect((g * 37) % 380, gy, 90 + (g % 5) * 25, 2);
      }

      // Vertical butt joint seam per plank row
      const jointX = ((y * 3 + 110) % 420) + 40;
      ctx.fillStyle = '#1f140d';
      ctx.fillRect(jointX, y, 3, plankH);

      // Deep shadow gap between planks
      ctx.fillStyle = '#1b120c';
      ctx.fillRect(0, y + plankH - 3, 512, 3);
    }

    // Damp corner weathering gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, 'rgba(14, 10, 8, 0.42)');
    grad.addColorStop(0.25, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.78, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(12, 9, 7, 0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  } else if (type === 'concrete' || type === 'plaster') {
    // Damaged plaster & stained concrete with wainscoting line, hairline cracks, and damp mold (REF_04, REF_15)
    ctx.fillStyle = '#565c61';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle mottled plaster variation
    for (let i = 0; i < 260; i++) {
      const shade = 68 + (i % 28);
      ctx.fillStyle = `rgba(${shade}, ${shade + 3}, ${shade + 5}, 0.16)`;
      ctx.beginPath();
      ctx.arc((i * 73) % 512, (i * 139) % 512, 14 + (i % 18), 0, Math.PI * 2);
      ctx.fill();
    }

    // Lower wainscot / dampness dado band
    ctx.fillStyle = 'rgba(38, 34, 30, 0.45)';
    ctx.fillRect(0, 330, 512, 182);
    ctx.fillStyle = '#2a2520';
    ctx.fillRect(0, 326, 512, 5);

    // Vertical water-leak streaks from ceiling
    for (let x = 24; x < 512; x += 64) {
      const streakH = 110 + ((x * 13) % 140);
      const sGrad = ctx.createLinearGradient(x, 0, x, streakH);
      sGrad.addColorStop(0, 'rgba(18, 22, 18, 0.55)');
      sGrad.addColorStop(1, 'rgba(18, 22, 18, 0)');
      ctx.fillStyle = sGrad;
      ctx.fillRect(x, 0, 10 + (x % 9), streakH);
    }

    // Plaster cracks
    ctx.strokeStyle = 'rgba(22, 24, 26, 0.55)';
    ctx.lineWidth = 2;
    for (let c = 0; c < 6; c++) {
      let cx = 60 + c * 80;
      let cy = 40 + (c % 3) * 70;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += ((s % 2 === 0 ? 1 : -1) * (8 + s * 3));
        cy += 18 + s * 4;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  } else {
    // Rusted industrial steel with rivets and oxidized streaks (REF_16, REF_20)
    ctx.fillStyle = '#495159';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 64) {
      ctx.fillStyle = 'rgba(24, 28, 32, 0.45)';
      ctx.fillRect(0, y, 512, 3);
    }
    for (let i = 0; i < 360; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(128, 66, 36, 0.28)' : 'rgba(26, 30, 36, 0.3)';
      ctx.fillRect((i * 53) % 512, (i * 97) % 512, 18, 5);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1.5);
  return tex;
}

/**
 * Adds a soft radial contact shadow disc at y = 0.015 under grounded props/actors.
 */
export function createContactShadow(radius = 0.55, opacity = 0.45): THREE.Mesh {
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
 * Distinctive 2.48m tall, unnaturally gaunt humanoid silhouette built with a multi-jointed
 * articulated hierarchy (pelvis, spine, acoustic-baffle ribcage, asymmetrical receiver head with
 * pale glowing optical lens & brass horn, double-jointed arms with long metallic fingers,
 * gaunt legs, and draped copper coaxial cables).
 */
export function buildReceiverCreatureMesh(): {
  group: THREE.Group;
  headGroup: THREE.Group;
  torsoGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  eyeLight: THREE.PointLight;
} {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x222629,
    roughness: 0.78,
    metalness: 0.22,
  });
  const ribMat = new THREE.MeshStandardMaterial({
    color: 0x383e44,
    roughness: 0.48,
    metalness: 0.55,
  });
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x9c5a32,
    roughness: 0.32,
    metalness: 0.85,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xf5fbff,
    emissive: 0xcbe8ff,
    emissiveIntensity: 3.2,
    roughness: 0.1,
  });
  const signalLampMat = new THREE.MeshStandardMaterial({
    color: 0xff4238,
    emissive: 0xff2a1f,
    emissiveIntensity: 2.4,
  });

  // 1. Ground Contact Shadow
  group.add(createContactShadow(0.72, 0.62));

  // 2. Pelvis & Articulated Torso Group
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.28, 10), bodyMat);
  pelvis.position.y = 1.12;
  group.add(pelvis);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.24, 0);
  group.add(torsoGroup);

  // Elongated Ribcage / Torn Acoustic Insulation Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.13, 0.76, 10), bodyMat);
  torso.position.y = 0.38;
  torso.scale.set(1.18, 1, 0.74);
  torsoGroup.add(torso);

  // Field-Coil Transceiver Unit embedded in chest cavity
  const chestCore = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), ribMat);
  chestCore.position.set(0, 0.42, -0.06);
  torsoGroup.add(chestCore);

  const chestIndicator = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), signalLampMat);
  chestIndicator.position.set(0.06, 0.46, -0.175);
  torsoGroup.add(chestIndicator);

  // Acoustic Baffle Ribs across Chest & Spine
  for (let i = 0; i < 5; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.18 + i * 0.012, 0.024, 6, 14), ribMat);
    rib.position.y = 0.15 + i * 0.13;
    rib.rotation.x = Math.PI / 2 + (i % 2 === 0 ? 0.12 : -0.1);
    rib.scale.set(1.18, 0.78, 1);
    torsoGroup.add(rib);
  }

  // Spine vertebrae ridges on back
  for (let s = 0; s < 6; s++) {
    const node = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.08), ribMat);
    node.position.set(0, 0.12 + s * 0.12, 0.14);
    torsoGroup.add(node);
  }

  // 3. Elongated Neck & Asymmetrical Head Group (REF_08)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.09, 0.28, 8), bodyMat);
  neck.position.set(0, 0.84, -0.04);
  neck.rotation.x = 0.18;
  torsoGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.04, -0.07);
  torsoGroup.add(headGroup);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 12), bodyMat);
  cranium.scale.set(0.84, 1.42, 0.98);
  headGroup.add(cranium);

  // Pale glowing optical receiver lens (REF_08 left-offset eye)
  const receiverEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), eyeMat);
  receiverEye.position.set(-0.048, 0.03, -0.125);
  headGroup.add(receiverEye);

  // Subtle PointLight on head so The Receiver's silhouette and face are readable in dark corridors
  const eyeLight = new THREE.PointLight(0x9ecbff, 0.95, 4.5, 2.0);
  eyeLight.position.set(0, 0.05, -0.25);
  headGroup.add(eyeLight);

  // Vokoder / Acoustic Horn Mouthpiece
  const acousticHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.022, 0.08, 12), ribMat);
  acousticHorn.rotation.x = Math.PI / 2;
  acousticHorn.position.set(0.035, -0.055, -0.125);
  headGroup.add(acousticHorn);

  // Bent dipole whip antennas sprouting from shoulder/cranium
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.42, 6), wireMat);
  antenna.position.set(0.09, 0.28, 0.04);
  antenna.rotation.z = -0.22;
  headGroup.add(antenna);

  // 4. Unnaturally Long Left & Right Arms (hanging past knees)
  const buildArm = (side: -1 | 1): THREE.Group => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.3, 0.68, 0);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), ribMat);
    armGroup.add(shoulder);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.044, 0.58, 8), bodyMat);
    upper.position.y = -0.28;
    upper.rotation.z = side * 0.06;
    armGroup.add(upper);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), ribMat);
    elbow.position.set(side * 0.02, -0.56, 0);
    armGroup.add(elbow);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.03, 0.64, 8), ribMat);
    forearm.position.set(side * 0.03, -0.86, -0.05);
    forearm.rotation.x = -0.2;
    armGroup.add(forearm);

    // Elongated articulated claw fingers
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.24, 0.09), bodyMat);
    hand.position.set(side * 0.04, -1.24, -0.11);
    armGroup.add(hand);

    return armGroup;
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  torsoGroup.add(leftArm, rightArm);

  // 5. Gaunt Left & Right Legs
  const buildLeg = (side: -1 | 1): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.14, 1.08, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.054, 0.54, 8), bodyMat);
    thigh.position.y = -0.27;
    legGroup.add(thigh);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.036, 0.56, 8), ribMat);
    shin.position.y = -0.8;
    legGroup.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.28), bodyMat);
    foot.position.set(0, -1.05, -0.06);
    legGroup.add(foot);

    return legGroup;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  group.add(leftLeg, rightLeg);

  // 6. Draped Coaxial Copper Wires around Shoulders
  for (let w = 0; w < 2; w++) {
    const cableLoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.25 + w * 0.04, 0.014, 6, 16),
      wireMat,
    );
    cableLoop.position.set(0, 0.58 - w * 0.1, 0.02);
    cableLoop.rotation.set(0.55, w === 0 ? 0.32 : -0.35, 0);
    torsoGroup.add(cableLoop);
  }

  return { group, headGroup, torsoGroup, leftArm, rightArm, leftLeg, rightLeg, eyeLight };
}

/**
 * Builds the Exterior Relay Tower in the Forest (REF_09).
 */
export function buildRelayTowerMesh(): THREE.Group {
  const group = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x2e333a,
    roughness: 0.88,
    metalness: 0.15,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x434b52,
    roughness: 0.45,
    metalness: 0.78,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff1e1e,
    emissiveIntensity: 3.5,
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
  const crown = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.6, 4.6), steelMat);
  crown.position.y = 23.2;
  group.add(crown);

  // Illuminated observation slit windows around the Relay Tower crown
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffd28a,
    emissive: 0xffaa44,
    emissiveIntensity: 2.6,
    roughness: 0.2,
  });
  for (const zSide of [-2.32, 2.32]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 0.06), windowMat);
    win.position.set(0, 23.3, zSide);
    group.add(win);
  }

  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.0, 1.9, 4), concreteMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 25.3;
  group.add(roof);

  // Antenna spire & red storm beacon
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 5.5, 8), steelMat);
  spire.position.y = 28.2;
  group.add(spire);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), beaconMat);
  beacon.position.y = 31.1;
  group.add(beacon);

  // Side microwave relay dishes
  for (const side of [-1, 1]) {
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.25, 0.5, 12), steelMat);
    dish.rotation.z = (side * Math.PI) / 2;
    dish.position.set(side * 2.45, 20.5, 0);
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
    color: 0x454b52,
    roughness: 0.3,
    metalness: 0.88,
  });
  const blueBandMat = new THREE.MeshStandardMaterial({
    color: 0x2668bf,
    roughness: 0.5,
    metalness: 0.25,
  });
  const redSwitchMat = new THREE.MeshStandardMaterial({
    color: 0xd92b2b,
    roughness: 0.38,
    metalness: 0.15,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xfff6d6,
    emissive: 0xffebb3,
    emissiveIntensity: 1.8,
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
  group.add(createContactShadow(0.28, 0.42));

  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc99b52, roughness: 0.28, metalness: 0.88 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x7a4b32, roughness: 0.72, metalness: 0.62 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xa6b0ba, roughness: 0.25, metalness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x664129, roughness: 0.7, metalness: 0.1 });
  const yellowTagMat = new THREE.MeshStandardMaterial({
    color: 0xf0ca2b,
    emissive: 0x453700,
    roughness: 0.35,
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
      color: isAlt ? 0xc4a882 : 0x8a949e,
      roughness: 0.48,
      metalness: 0.25,
    });
    const labelMat = new THREE.MeshStandardMaterial({
      color: isAlt ? 0xe6a455 : 0xb2e3e0,
      emissive: isAlt ? 0x2e1c05 : 0x102928,
      roughness: 0.55,
    });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.042, 0.19), shellMat);
    shell.position.y = 0.03;
    group.add(shell);

    const label = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.012, 0.12), labelMat);
    label.position.set(0, 0.052, -0.01);
    group.add(label);

    for (const side of [-0.065, 0.065]) {
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.048, 10), steelMat);
      reel.position.set(side, 0.034, -0.01);
      group.add(reel);
    }
    return group;
  }

  if (itemId === 'glass_fuse') {
    // 250V Glass Fuse (REF_21)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6f7ff,
      transparent: true,
      opacity: 0.62,
      roughness: 0.1,
      metalness: 0.05,
    });
    const capLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.075, 14), brassMat);
    capLeft.rotation.z = Math.PI / 2;
    capLeft.position.set(-0.11, 0.05, 0);
    group.add(capLeft);

    const capRight = capLeft.clone();
    capRight.position.set(0.11, 0.05, 0);
    group.add(capRight);

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 14), glassMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, 0.05, 0);
    group.add(tube);

    const filament = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 6), steelMat);
    filament.rotation.z = Math.PI / 2 + 0.18;
    filament.position.set(0, 0.05, 0);
    group.add(filament);
    return group;
  }

  if (itemId === 'maintenance_key' || itemId === 'listening_key' || itemId === 'exit_key') {
    // Keys (REF_06 Brass, REF_13 Rusted, REF_20 Tagged Key Ring)
    const mat =
      itemId === 'listening_key' ? brassMat : itemId === 'maintenance_key' ? rustMat : steelMat;

    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 8, 16), mat);
    bow.rotation.x = Math.PI / 2;
    bow.position.set(-0.08, 0.03, 0);
    group.add(bow);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.19, 8), mat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.03, 0.03, 0);
    group.add(shaft);

    const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.022, 0.055), mat);
    bit1.position.set(0.09, 0.03, 0.03);
    group.add(bit1);

    if (itemId === 'exit_key') {
      // Yellow hazard key tag (REF_20)
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.085), yellowTagMat);
      tag.position.set(-0.16, 0.03, 0.05);
      tag.rotation.y = 0.4;
      group.add(tag);
    }
    return group;
  }

  if (itemId === 'spare_batteries_1' || itemId === 'spare_batteries_2') {
    // Spare AA Batteries (REF_02)
    const amberMat = new THREE.MeshStandardMaterial({ color: 0xe69d28, roughness: 0.3, metalness: 0.4 });
    for (let i = 0; i < 2; i++) {
      const batGroup = new THREE.Group();
      const silverHalf = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.11, 12), steelMat);
      silverHalf.rotation.z = Math.PI / 2;
      batGroup.add(silverHalf);

      const amberHalf = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.07, 12), amberMat);
      amberHalf.rotation.z = Math.PI / 2;
      amberHalf.position.x = 0.06;
      batGroup.add(amberHalf);

      const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.018, 10), steelMat);
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
    const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 14), rustMat);
    tin.position.y = 0.09;
    group.add(tin);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.009, 6, 14), steelMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.18;
    group.add(rim);

    // Bolts & hex nuts inside top
    for (let i = 0; i < 5; i++) {
      const nut = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.008, 6, 6), steelMat);
      nut.rotation.x = Math.PI / 2 + (i - 2) * 0.2;
      nut.position.set(Math.cos(i * 1.2) * 0.03, 0.17, Math.sin(i * 1.2) * 0.03);
      group.add(nut);
    }
    return group;
  }

  if (itemId === 'screwdriver') {
    // Flathead Maintenance Screwdriver (REF_14)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.028, 0.16, 12), woodMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-0.08, 0.035, 0);
    group.add(handle);

    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.021, 0.03, 12), steelMat);
    ferrule.rotation.z = Math.PI / 2;
    ferrule.position.set(0.01, 0.035, 0);
    group.add(ferrule);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.18, 8), steelMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.11, 0.035, 0);
    group.add(shaft);
    return group;
  }

  // Readable Documents: freq_note (REF_19), operator_diary (REF_10), family_photo (REF_17)
  const paperMat = new THREE.MeshStandardMaterial({
    color: itemId === 'family_photo' ? 0xa88a6a : 0xe3d8c4,
    roughness: 0.72,
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

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x543c2a, roughness: 0.78, metalness: 0.08 });
  const oliveMat = new THREE.MeshStandardMaterial({ color: 0x43543d, roughness: 0.52, metalness: 0.45 });
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x5c636b, roughness: 0.38, metalness: 0.65 });
  const crtMat = new THREE.MeshStandardMaterial({
    color: 0x2b50a8,
    emissive: 0x24469c,
    emissiveIntensity: 1.6,
    roughness: 0.15,
  });
  const redMatrixMat = new THREE.MeshStandardMaterial({
    color: 0xff3b2f,
    emissive: 0xd9261c,
    emissiveIntensity: 2.0,
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
    color: 0x7a4328,
    roughness: 0.7,
    metalness: 0.65,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x2d3238,
    roughness: 0.48,
    metalness: 0.82,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x677078,
    roughness: 0.35,
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
 * Builds a Steel Hiding Locker with louvered vents and vertical handle.
 */
export function buildHidingLockerMesh(): THREE.Group {
  const group = new THREE.Group();
  const lockerMat = new THREE.MeshStandardMaterial({
    color: 0x353f47,
    roughness: 0.52,
    metalness: 0.78,
  });
  const ventMat = new THREE.MeshStandardMaterial({
    color: 0x16191d,
    roughness: 0.8,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0xb89352,
    roughness: 0.3,
    metalness: 0.88,
  });

  group.add(createContactShadow(0.62, 0.5));

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.88, 2.15, 0.82), lockerMat);
  body.position.y = 1.075;
  group.add(body);

  // Louvered slit vents on front door (+X local face)
  for (let i = 0; i < 6; i++) {
    const louver = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.46), ventMat);
    louver.position.set(0.445, 1.48 + i * 0.08, 0);
    group.add(louver);
  }

  // Brass latch handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), handleMat);
  handle.position.set(0.455, 1.1, 0.26);
  group.add(handle);

  return group;
}
