import type {
  DoorDef,
  EndingType,
  InteractVerb,
  InteractableDef,
  ItemId,
  MissionProgressState,
  WallBox,
} from './types.ts';
import { INITIAL_DOORS } from './levelData.ts';

export function createInitialProgress(): MissionProgressState {
  return {
    mission: '1_ENTER_STATION',
    inventory: ['flashlight'],
    flashlightOn: true,
    battery: 100,
    decoyCount: 0,
    powerRestored: false,
    huntSurvived: false,
    radioDecoded: false,
    diaryExamined: false,
    theoTapeFound: false,
    panelUnscrewed: false,
    signalShutDown: false,
    answeredVoice: false,
    unlockedDoors: [],
    openDoors: [],
    collectedItems: ['flashlight'],
    hidingSpotUsage: {},
    noiseAlertsTriggered: 0,
    elapsedSeconds: 0,
  };
}

/**
 * Converts closed doors into temporary WallBox colliders so neither player nor raycasts pass through closed doors.
 */
export function getDoorColliders(doors: DoorDef[], openDoors: string[]): WallBox[] {
  const boxes: WallBox[] = [];
  for (const door of doors) {
    const isOpen = openDoors.includes(door.id) || door.isOpen;
    if (isOpen) continue;
    const halfW = door.width * 0.5;
    const thickness = 0.22;
    if (door.axis === 'x') {
      boxes.push({
        id: `door_col_${door.id}`,
        minX: door.x - halfW,
        maxX: door.x + halfW,
        minZ: door.z - thickness,
        maxZ: door.z + thickness,
        height: 2.6,
      });
    } else {
      boxes.push({
        id: `door_col_${door.id}`,
        minX: door.x - thickness,
        maxX: door.x + thickness,
        minZ: door.z - halfW,
        maxZ: door.z + halfW,
        height: 2.6,
      });
    }
  }
  return boxes;
}

/**
 * Resolves 2D circle-vs-AABB collision for the player against walls and closed doors.
 */
export function resolveCollision(
  x: number,
  z: number,
  radius: number,
  walls: WallBox[],
): { x: number; z: number; collided: boolean } {
  let curX = x;
  let curZ = z;
  let collided = false;

  for (let pass = 0; pass < 2; pass++) {
    for (const w of walls) {
      const closestX = Math.max(w.minX, Math.min(curX, w.maxX));
      const closestZ = Math.max(w.minZ, Math.min(curZ, w.maxZ));
      const dx = curX - closestX;
      const dz = curZ - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        collided = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = radius - dist;
          curX += (dx / dist) * overlap;
          curZ += (dz / dist) * overlap;
        } else {
          // Inside box center fallback: push out along shortest axis
          const penLeft = Math.abs(curX - w.minX);
          const penRight = Math.abs(w.maxX - curX);
          const penTop = Math.abs(curZ - w.minZ);
          const penBottom = Math.abs(w.maxZ - curZ);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) curX = w.minX - radius;
          else if (minPen === penRight) curX = w.maxX + radius;
          else if (minPen === penTop) curZ = w.minZ - radius;
          else curZ = w.maxZ + radius;
        }
      }
    }
  }

  return { x: curX, z: curZ, collided };
}

/**
 * Checks if a 2D line segment from (x1, z1) to (x2, z2) intersects any wall or closed door AABB.
 */
export function hasLineOfSight(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  walls: WallBox[],
): boolean {
  const dx = x2 - x1;
  const dz = z2 - z1;

  for (const w of walls) {
    // Skip low furniture (height <= 1.35) for sight / reach checks
    if (w.height !== undefined && w.height <= 1.35) continue;

    let tmin = 0;
    let tmax = 1;

    if (Math.abs(dx) < 1e-6) {
      if (x1 < w.minX || x1 > w.maxX) continue;
    } else {
      const invDx = 1 / dx;
      let t1 = (w.minX - x1) * invDx;
      let t2 = (w.maxX - x1) * invDx;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    if (Math.abs(dz) < 1e-6) {
      if (z1 < w.minZ || z1 > w.maxZ) continue;
    } else {
      const invDz = 1 / dz;
      let t1 = (w.minZ - z1) * invDz;
      let t2 = (w.maxZ - z1) * invDz;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    if (tmin <= tmax && tmax > 0.02 && tmin < 0.98) {
      return false;
    }
  }
  return true;
}

/**
 * Determines the context-sensitive action verb and label for an interactable.
 */
export function getInteractableAction(
  item: InteractableDef,
  progress: MissionProgressState,
  isHiding: boolean,
  doors: DoorDef[] = INITIAL_DOORS,
): { verb: InteractVerb; label: string; canExecute: boolean; blockedReason?: string } | null {
  if (isHiding) {
    if (item.type === 'hiding_spot') {
      return { verb: 'EXIT', label: `EXIT ${item.name.toUpperCase()}`, canExecute: true };
    }
    return null;
  }

  switch (item.type) {
    case 'pickup': {
      if (!item.itemId || progress.collectedItems.includes(item.itemId)) return null;
      const isLore =
        item.itemId === 'operator_diary' ||
        item.itemId === 'freq_note' ||
        item.itemId === 'family_photo';
      return {
        verb: isLore ? 'EXAMINE' : 'PICK UP',
        label: `${isLore ? 'EXAMINE' : 'PICK UP'} ${item.name.toUpperCase()}`,
        canExecute: true,
      };
    }
    case 'door': {
      const door = doors.find((d) => d.id === item.doorId);
      if (!door) return null;
      const isOpen = progress.openDoors.includes(door.id);
      if (isOpen) {
        return { verb: 'CLOSE', label: `CLOSE ${door.name.toUpperCase()}`, canExecute: true };
      }
      const isUnlocked = progress.unlockedDoors.includes(door.id);
      if (!isUnlocked) {
        if (door.requiresTuning && !progress.radioDecoded) {
          return {
            verb: 'OPEN',
            label: `${door.name.toUpperCase()} (MAGNETIC LOCK — TUNE RADIO FIRST)`,
            canExecute: false,
            blockedReason: 'Magnetic seal active. Decode 704.52 kHz on the Radio Workbench first.',
          };
        }
        if (door.lockedByItem) {
          if (progress.inventory.includes(door.lockedByItem)) {
            return {
              verb: 'UNLOCK',
              label: `UNLOCK ${door.name.toUpperCase()}`,
              canExecute: true,
            };
          } else {
            const keyName =
              door.lockedByItem === 'maintenance_key'
                ? 'Rusted Maintenance Key'
                : door.lockedByItem === 'listening_key'
                  ? 'Antique Brass Key'
                  : 'Tagged Exit Key';
            return {
              verb: 'OPEN',
              label: `LOCKED — REQUIRES ${keyName.toUpperCase()}`,
              canExecute: false,
              blockedReason: `Locked. Requires the ${keyName}.`,
            };
          }
        }
      }
      return { verb: 'OPEN', label: `OPEN ${door.name.toUpperCase()}`, canExecute: true };
    }
    case 'hiding_spot': {
      return { verb: 'HIDE', label: `HIDE IN ${item.name.toUpperCase()}`, canExecute: true };
    }
    case 'fuse_box': {
      if (progress.powerRestored) {
        return {
          verb: 'EXAMINE',
          label: 'FUSE BOX (POWER ONLINE)',
          canExecute: true,
        };
      }
      if (progress.inventory.includes('glass_fuse')) {
        return {
          verb: 'INSERT FUSE',
          label: 'INSERT 250V GLASS FUSE',
          canExecute: true,
        };
      }
      return {
        verb: 'EXAMINE',
        label: 'FUSE BOX (MISSING 250V GLASS FUSE)',
        canExecute: false,
        blockedReason: 'A blown cartridge slot is empty. Find the 250V Glass Fuse in the Records Room.',
      };
    }
    case 'radio_workbench': {
      if (!progress.powerRestored) {
        return {
          verb: 'EXAMINE',
          label: 'RADIO WORKBENCH (NO POWER)',
          canExecute: false,
          blockedReason: 'No power. Restore the Basement Fuse Box first.',
        };
      }
      if (progress.radioDecoded) {
        return {
          verb: 'TUNE',
          label: 'EXAMINE TUNED TRANSCEIVER (704.52 kHz)',
          canExecute: true,
        };
      }
      return {
        verb: 'TUNE',
        label: 'TUNE TRANSCEIVER FREQUENCY',
        canExecute: true,
      };
    }
    case 'shutdown_console': {
      if (progress.signalShutDown || progress.answeredVoice) {
        return {
          verb: 'EXAMINE',
          label: 'MASTER TRANSMITTER (OFFLINE)',
          canExecute: true,
        };
      }
      if (!progress.panelUnscrewed) {
        if (progress.inventory.includes('screwdriver')) {
          return {
            verb: 'USE SCREWDRIVER',
            label: 'UNSCREW SERVICE PLATE',
            canExecute: true,
          };
        }
        return {
          verb: 'EXAMINE',
          label: 'SEALED TRANSMITTER (NEEDS SCREWDRIVER)',
          canExecute: false,
          blockedReason: 'The service cover is fastened with flathead screws. Find the Screwdriver on the rack.',
        };
      }
      return {
        verb: 'SHUT DOWN',
        label: 'OPERATE MASTER SIGNAL CONTROLS',
        canExecute: true,
      };
    }
    case 'exit_gate': {
      if (progress.signalShutDown || progress.answeredVoice) {
        if (progress.inventory.includes('exit_key')) {
          return {
            verb: 'ESCAPE',
            label: 'UNLOCK GATE & ESCAPE GREYFEN',
            canExecute: true,
          };
        }
        return {
          verb: 'EXAMINE',
          label: 'PERIMETER GATE (NEEDS TAGGED EXIT KEY)',
          canExecute: false,
          blockedReason: 'Locked with a high-voltage padlock. Retrieve the Tagged Key Ring from the Listening Chamber.',
        };
      }
      return {
        verb: 'EXAMINE',
        label: 'PERIMETER GATE (RESOLVE THE SIGNAL FIRST)',
        canExecute: false,
        blockedReason: 'Mara cannot leave until she finds the truth about Theo’s signal inside the station.',
      };
    }
    default:
      return null;
  }
}

/**
 * Selects the best interactable in front of the player with hysteresis (range margin) to prevent button flicker.
 */
export function findBestInteractable(
  playerX: number,
  playerZ: number,
  playerYaw: number,
  interactables: InteractableDef[],
  progress: MissionProgressState,
  walls: WallBox[],
  isHiding: boolean,
  currentTargetId: string | null,
): { target: InteractableDef; verb: InteractVerb; label: string; canExecute: boolean; blockedReason?: string } | null {
  // Forward look direction: yaw = 0 faces -Z: forward = (-sin(yaw), -cos(yaw))
  const fwdX = -Math.sin(playerYaw);
  const fwdZ = -Math.cos(playerYaw);

  let bestScore = Infinity;
  let bestResult: {
    target: InteractableDef;
    verb: InteractVerb;
    label: string;
    canExecute: boolean;
    blockedReason?: string;
  } | null = null;

  for (const item of interactables) {
    const action = getInteractableAction(item, progress, isHiding);
    if (!action) continue;

    const dx = item.x - playerX;
    const dz = item.z - playerZ;
    const dist = Math.hypot(dx, dz);

    // Hysteresis margin: if this item is already active, allow +0.35m extra range and wider cone
    const isCurrent = item.id === currentTargetId;
    const maxRadius = item.radius + (isCurrent ? 0.35 : 0);
    if (dist > maxRadius) continue;

    if (dist > 0.25) {
      const dirX = dx / dist;
      const dirZ = dz / dist;
      const dot = dirX * fwdX + dirZ * fwdZ;
      const minDot = isCurrent ? 0.32 : 0.48; // ~61 deg cone, ~71 deg hysteresis
      if (dot < minDot) continue;
    }

    // Ensure player cannot interact through solid walls (doors themselves don't block their own interaction)
    const blockingWalls = walls.filter((w) => w.id !== `door_col_${item.doorId}`);
    if (!hasLineOfSight(playerX, playerZ, item.x, item.z, blockingWalls)) {
      continue;
    }

    const score = dist - (isCurrent ? 0.25 : 0);
    if (score < bestScore) {
      bestScore = score;
      bestResult = {
        target: item,
        ...action,
      };
    }
  }

  return bestResult;
}

/**
 * Pure mission progression state machine evaluator.
 * Advances the active mission whenever completion criteria are met.
 */
export function evaluateMissionProgression(progress: MissionProgressState): MissionProgressState {
  const next = { ...progress };

  // Mission 1 -> 2: Collected Theo's first cassette
  if (next.mission === '1_ENTER_STATION' && next.collectedItems.includes('theo_cassette_1')) {
    next.mission = '2_RESTORE_POWER';
  }

  // Mission 2 -> 3: Restored power at Basement Fuse Box
  if (
    (next.mission === '1_ENTER_STATION' || next.mission === '2_RESTORE_POWER') &&
    next.powerRestored
  ) {
    next.mission = '3_ESCAPE_HUNT';
  }

  // Mission 3 -> 4: Collected maintenance key and survived/hid or unlocked Radio Room
  if (
    next.mission === '3_ESCAPE_HUNT' &&
    next.collectedItems.includes('maintenance_key') &&
    (next.huntSurvived || next.unlockedDoors.includes('door_radio'))
  ) {
    next.mission = '4_DECODE_VOICES';
  }

  // Mission 4 -> 5: Decoded the radio workbench puzzle
  if (
    (next.mission === '3_ESCAPE_HUNT' || next.mission === '4_DECODE_VOICES') &&
    next.radioDecoded
  ) {
    next.mission = '5_DISCOVER_TRUTH';
  }

  // Mission 5 -> 6: Examined Operator Diary and found Theo's Final Recording
  if (
    next.mission === '5_DISCOVER_TRUTH' &&
    next.diaryExamined &&
    next.theoTapeFound
  ) {
    next.mission = '6_SHUT_DOWN_SIGNAL';
  }

  // Mission 6 -> 7: Shut down the signal (or answered the voice)
  if (
    (next.mission === '5_DISCOVER_TRUTH' || next.mission === '6_SHUT_DOWN_SIGNAL') &&
    (next.signalShutDown || next.answeredVoice)
  ) {
    next.mission = '7_ESCAPE';
  }

  return next;
}

/**
 * Evaluates the Radio Workbench Tuning Puzzle (REF_19: 704.52 kHz, Phase 76 deg).
 */
export function evaluateRadioTuning(
  frequencyKhz: number,
  phaseDeg: number,
): { clarity: number; isLocked: boolean; freqError: number; phaseError: number } {
  const targetFreq = 704.52;
  const targetPhase = 76;

  const freqError = Math.abs(frequencyKhz - targetFreq);
  const phaseError = Math.abs(phaseDeg - targetPhase);

  // Lock tolerance: within ±1.25 kHz and ±5 degrees
  const isLocked = freqError <= 1.25 && phaseError <= 5;

  const freqScore = Math.max(0, 1 - freqError / 45);
  const phaseScore = Math.max(0, 1 - phaseError / 90);
  const clarity = isLocked ? 100 : Math.round((freqScore * 0.7 + phaseScore * 0.3) * 96);

  return { clarity, isLocked, freqError, phaseError };
}

/**
 * Determines which of the 3 story endings is unlocked based on player actions and collectibles.
 */
export function determineEnding(progress: MissionProgressState): EndingType {
  if (progress.answeredVoice) {
    return 'THE_ANSWER';
  }

  const hasAllRecordingsAndPhoto =
    progress.collectedItems.includes('theo_cassette_1') &&
    progress.collectedItems.includes('cassette_operator_2') &&
    progress.collectedItems.includes('theo_cassette_final') &&
    progress.collectedItems.includes('family_photo') &&
    progress.collectedItems.includes('operator_diary');

  if (progress.signalShutDown && hasAllRecordingsAndPhoto) {
    return 'THE_LAST_RECORDING';
  }

  return 'THE_SILENCE';
}
