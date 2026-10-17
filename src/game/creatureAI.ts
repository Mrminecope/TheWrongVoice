import type { CreatureState, HidingSpotDef, NoiseEvent, WallBox } from './types.ts';
import { HIDING_SPOTS, WAYPOINTS, type WaypointNode } from './levelData.ts';
import { hasLineOfSight, resolveCollision } from './rules.ts';

export interface CreatureRuntime {
  state: CreatureState;
  x: number;
  z: number;
  yaw: number;
  targetX: number;
  targetZ: number;
  lastKnownX: number;
  lastKnownZ: number;
  currentWaypointId: string;
  stateTimer: number;
  searchPoints: { x: number; z: number }[];
  hidingSpotToCheck: HidingSpotDef | null;
  mimicCooldown: number;
  activeMimicQuote: { text: string; isImitation: boolean } | null;
  alertCount: number;
  speed: number;
  headTilt: number;
  stridePhase: number;
}

export const MIMIC_VOICE_LINES = [
  {
    text: 'THEO?: "Mara... help me, the bulkhead door is stuck... [STATIC CLICK]"',
    isImitation: true,
  },
  {
    text: 'THEO?: "Why did you turn off the light, Mara? Answer me... [TAPE REWIND WHINE]"',
    isImitation: true,
  },
  {
    text: 'OPERATOR?: "Station clear... come out of the locker, it’s safe now... [60Hz HUM]"',
    isImitation: true,
  },
  {
    text: 'THEO?: "I’m right behind you in the corridor. Just say my name..."',
    isImitation: true,
  },
];

export function createInitialCreature(): CreatureRuntime {
  return {
    state: 'PATROL',
    x: 0,
    z: -1.8,
    yaw: Math.PI, // Facing South down the Entry Corridor
    targetX: 0,
    targetZ: -2.8,
    lastKnownX: 0,
    lastKnownZ: -2.8,
    currentWaypointId: 'wp_cross_center',
    stateTimer: 0,
    searchPoints: [],
    hidingSpotToCheck: null,
    mimicCooldown: 10,
    activeMimicQuote: null,
    alertCount: 0,
    speed: 1.85,
    headTilt: 0,
    stridePhase: 0,
  };
}

/**
 * Finds the nearest waypoint to a world position.
 */
export function findNearestWaypoint(x: number, z: number, waypoints: WaypointNode[] = WAYPOINTS): WaypointNode {
  let best = waypoints[0];
  let bestDist = Infinity;
  for (const wp of waypoints) {
    const d = Math.hypot(wp.x - x, wp.z - z);
    if (d < bestDist) {
      bestDist = d;
      best = wp;
    }
  }
  return best;
}

/**
 * BFS shortest path between two waypoints so The Receiver navigates around walls and doorways.
 */
export function findNextStepToward(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  walls: WallBox[],
): { x: number; z: number } {
  if (hasLineOfSight(fromX, fromZ, toX, toZ, walls)) {
    return { x: toX, z: toZ };
  }

  const startWp = findNearestWaypoint(fromX, fromZ);
  const goalWp = findNearestWaypoint(toX, toZ);
  if (startWp.id === goalWp.id) {
    return { x: toX, z: toZ };
  }

  const queue: string[][] = [[startWp.id]];
  const visited = new Set<string>([startWp.id]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const currentId = path[path.length - 1];
    if (currentId === goalWp.id) {
      const nextWpId = path[1] || path[0];
      const nextWp = WAYPOINTS.find((w) => w.id === nextWpId);
      if (nextWp) {
        // If we are already very close to startWp, head to path[1]
        const distToStart = Math.hypot(startWp.x - fromX, startWp.z - fromZ);
        if (distToStart > 0.9 && !hasLineOfSight(fromX, fromZ, nextWp.x, nextWp.z, walls)) {
          return { x: startWp.x, z: startWp.z };
        }
        return { x: nextWp.x, z: nextWp.z };
      }
    }

    const node = WAYPOINTS.find((w) => w.id === currentId);
    if (!node) continue;
    for (const neighborId of node.neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push([...path, neighborId]);
      }
    }
  }

  return { x: startWp.x, z: startWp.z };
}

/**
 * Checks whether The Receiver can see the player based on distance, FOV cone, flashlight state, crouch state, hiding state, and walls.
 */
export function canCreatureSeePlayer(
  creature: CreatureRuntime,
  playerX: number,
  playerZ: number,
  isPlayerHiding: boolean,
  isPlayerCrouching: boolean,
  isFlashlightOn: boolean,
  walls: WallBox[],
): boolean {
  // Never spot player inside exterior porch safe zone unless in active climax escape
  if (playerZ > 8.2) return false;
  if (isPlayerHiding) return false;

  const dx = playerX - creature.x;
  const dz = playerZ - creature.z;
  const dist = Math.hypot(dx, dz);

  const maxSightRange = isFlashlightOn ? 11.5 : isPlayerCrouching ? 5.5 : 8.0;
  if (dist > maxSightRange) return false;

  // Check FOV cone unless player is practically touching the creature (< 1.4m)
  if (dist > 1.4) {
    const fwdX = -Math.sin(creature.yaw);
    const fwdZ = -Math.cos(creature.yaw);
    const dirX = dx / dist;
    const dirZ = dz / dist;
    const dot = dirX * fwdX + dirZ * fwdZ;
    const minCos = isFlashlightOn ? 0.25 : 0.45;
    if (dot < minCos) return false;
  }

  return hasLineOfSight(creature.x, creature.z, playerX, playerZ, walls);
}

/**
 * Evaluates whether The Receiver hears a noise event based on distance and wall occlusion.
 */
export function canCreatureHearNoise(
  creature: CreatureRuntime,
  noise: NoiseEvent,
  walls: WallBox[],
): { heard: boolean; perceivedStrength: number } {
  const dist = Math.hypot(noise.x - creature.x, noise.z - creature.z);
  const directSight = hasLineOfSight(creature.x, creature.z, noise.x, noise.z, walls);
  const occlusionFactor = directSight ? 1.0 : 0.62;
  const effectiveLoudness = noise.loudness * occlusionFactor - dist * 3.8;
  return {
    heard: effectiveLoudness > 12,
    perceivedStrength: Math.max(0, effectiveLoudness),
  };
}

/**
 * Selects a hiding spot to inspect near the creature's search position, weighted by player behavior memory (`hidingSpotUsage`).
 * Importantly: if the player hid while out of line-of-sight and has used a spot <= 1 time, the monster won't unfairly pull them out;
 * if the player repeatedly abuses the exact same locker (>= 3 times), the probability of checking and catching increases.
 */
export function selectHidingSpotToInspect(
  searchX: number,
  searchZ: number,
  hidingSpotUsage: Record<string, number>,
  spots: HidingSpotDef[] = HIDING_SPOTS,
): { spot: HidingSpotDef | null; willCatchHiddenPlayer: boolean } {
  let candidate: HidingSpotDef | null = null;
  let bestScore = -Infinity;

  for (const spot of spots) {
    const dist = Math.hypot(spot.x - searchX, spot.z - searchZ);
    if (dist > 7.5) continue;
    const uses = hidingSpotUsage[spot.id] || 0;
    const score = uses * 15 - dist;
    if (score > bestScore) {
      bestScore = score;
      candidate = spot;
    }
  }

  if (!candidate) return { spot: null, willCatchHiddenPlayer: false };
  const uses = hidingSpotUsage[candidate.id] || 0;
  // Behavior memory: first 2 times hiding in a locker are safe when breaking LOS; 3+ times in the same locker teaches the creature!
  const willCatchHiddenPlayer = uses >= 3;
  return { spot: candidate, willCatchHiddenPlayer };
}

/**
 * Advances The Receiver's Finite-State Machine by dt seconds.
 */
export function stepCreatureAI(
  creature: CreatureRuntime,
  dt: number,
  playerX: number,
  playerZ: number,
  isPlayerHiding: boolean,
  activeHidingSpotId: string | null,
  isPlayerCrouching: boolean,
  isFlashlightOn: boolean,
  recentNoises: NoiseEvent[],
  hidingSpotUsage: Record<string, number>,
  walls: WallBox[],
  aggressionMultiplier = 1.0,
): {
  creature: CreatureRuntime;
  caughtPlayer: boolean;
  triggeredMimic: { text: string; isImitation: boolean } | null;
  survivedHunt: boolean;
} {
  const next: CreatureRuntime = {
    ...creature,
    searchPoints: [...creature.searchPoints],
    activeMimicQuote: null,
  };

  let caughtPlayer = false;
  let survivedHunt = false;

  next.stateTimer += dt;
  next.mimicCooldown = Math.max(0, next.mimicCooldown - dt);
  next.headTilt = Math.sin(Date.now() * 0.004) * 0.22;

  const seesPlayer = canCreatureSeePlayer(
    next,
    playerX,
    playerZ,
    isPlayerHiding,
    isPlayerCrouching,
    isFlashlightOn,
    walls,
  );

  // 1. Check direct line of sight -> CHASE_VISIBLE_PLAYER
  if (seesPlayer) {
    if (next.state !== 'CHASE_VISIBLE_PLAYER') {
      next.alertCount += 1;
    }
    next.state = 'CHASE_VISIBLE_PLAYER';
    next.lastKnownX = playerX;
    next.lastKnownZ = playerZ;
    next.targetX = playerX;
    next.targetZ = playerZ;
    next.stateTimer = 0;
  } else {
    // 2. Check noise events if not currently seeing player
    let loudestNoise: NoiseEvent | null = null;
    let highestStrength = 0;

    for (const n of recentNoises) {
      const { heard, perceivedStrength } = canCreatureHearNoise(next, n, walls);
      if (heard && perceivedStrength > highestStrength) {
        highestStrength = perceivedStrength;
        loudestNoise = n;
      }
    }

    if (loudestNoise && next.state !== 'CHASE_VISIBLE_PLAYER') {
      next.state = 'INVESTIGATE_SOUND';
      next.lastKnownX = loudestNoise.x;
      next.lastKnownZ = loudestNoise.z;
      next.targetX = loudestNoise.x;
      next.targetZ = loudestNoise.z;
      next.stateTimer = 0;
      next.alertCount += 1;
    }
  }

  // Trigger occasional voice mimicry during search/investigate/patrol
  if (
    next.mimicCooldown <= 0 &&
    (next.state === 'INVESTIGATE_SOUND' ||
      next.state === 'SEARCH_LAST_KNOWN_POSITION' ||
      next.state === 'CHECK_HIDING_SPOTS')
  ) {
    const lineIdx = next.alertCount % MIMIC_VOICE_LINES.length;
    next.activeMimicQuote = MIMIC_VOICE_LINES[lineIdx];
    next.mimicCooldown = 18;
  }

  // State machine behavior & transitions
  switch (next.state) {
    case 'PATROL': {
      next.speed = 1.65 * aggressionMultiplier;
      const wp = WAYPOINTS.find((w) => w.id === next.currentWaypointId) || WAYPOINTS[0];
      next.targetX = wp.x;
      next.targetZ = wp.z;
      const distToWp = Math.hypot(wp.x - next.x, wp.z - next.z);
      if (distToWp < 0.75) {
        const neighbors = wp.neighbors;
        const pickIdx = Math.floor((next.stateTimer * 7 + next.alertCount) % neighbors.length);
        next.currentWaypointId = neighbors[pickIdx] || neighbors[0];
      }
      break;
    }

    case 'CHASE_VISIBLE_PLAYER': {
      next.speed = 3.25 * aggressionMultiplier;
      const distToPlayer = Math.hypot(playerX - next.x, playerZ - next.z);
      if (!isPlayerHiding && distToPlayer < 1.15) {
        caughtPlayer = true;
      } else if (!seesPlayer) {
        // Lost line of sight -> transition to SEARCH_LAST_KNOWN_POSITION
        next.state = 'SEARCH_LAST_KNOWN_POSITION';
        next.targetX = next.lastKnownX;
        next.targetZ = next.lastKnownZ;
        next.stateTimer = 0;
      }
      break;
    }

    case 'INVESTIGATE_SOUND': {
      next.speed = 2.45 * aggressionMultiplier;
      const distToSound = Math.hypot(next.targetX - next.x, next.targetZ - next.z);
      if (distToSound < 0.9 || next.stateTimer > 8.0) {
        next.state = 'SEARCH_LAST_KNOWN_POSITION';
        next.stateTimer = 0;
      }
      break;
    }

    case 'SEARCH_LAST_KNOWN_POSITION': {
      next.speed = 1.9 * aggressionMultiplier;
      const distToTarget = Math.hypot(next.targetX - next.x, next.targetZ - next.z);
      if (distToTarget < 1.0 || next.stateTimer > 4.0) {
        const inspection = selectHidingSpotToInspect(
          next.lastKnownX,
          next.lastKnownZ,
          hidingSpotUsage,
        );
        if (inspection.spot) {
          next.hidingSpotToCheck = inspection.spot;
          next.targetX = inspection.spot.standX;
          next.targetZ = inspection.spot.standZ;
          next.state = 'CHECK_HIDING_SPOTS';
          next.stateTimer = 0;
        } else {
          next.state = 'RETURN_TO_PATROL';
          next.stateTimer = 0;
          survivedHunt = true;
        }
      }
      break;
    }

    case 'CHECK_HIDING_SPOTS': {
      next.speed = 1.8 * aggressionMultiplier;
      const distToSpot = Math.hypot(next.targetX - next.x, next.targetZ - next.z);
      if (distToSpot < 1.1 || next.stateTimer > 5.0) {
        if (
          isPlayerHiding &&
          next.hidingSpotToCheck &&
          activeHidingSpotId === next.hidingSpotToCheck.id
        ) {
          const uses = hidingSpotUsage[activeHidingSpotId] || 0;
          if (uses >= 3) {
            caughtPlayer = true;
          }
        }
        next.hidingSpotToCheck = null;
        next.state = 'RETURN_TO_PATROL';
        next.stateTimer = 0;
        survivedHunt = true;
      }
      break;
    }

    case 'RETURN_TO_PATROL': {
      next.speed = 1.7 * aggressionMultiplier;
      const nearestWp = findNearestWaypoint(next.x, next.z);
      next.currentWaypointId = nearestWp.id;
      next.targetX = nearestWp.x;
      next.targetZ = nearestWp.z;
      const dist = Math.hypot(nearestWp.x - next.x, nearestWp.z - next.z);
      if (dist < 0.9 || next.stateTimer > 3.5) {
        next.state = 'PATROL';
        next.stateTimer = 0;
      }
      break;
    }
  }

  // Move creature along waypoint path toward targetX, targetZ
  const stepGoal = findNextStepToward(next.x, next.z, next.targetX, next.targetZ, walls);
  const moveDx = stepGoal.x - next.x;
  const moveDz = stepGoal.z - next.z;
  const moveDist = Math.hypot(moveDx, moveDz);

  if (moveDist > 0.05) {
    const dirX = moveDx / moveDist;
    const dirZ = moveDz / moveDist;
    const stepLen = Math.min(moveDist, next.speed * dt);
    const rawX = next.x + dirX * stepLen;
    const rawZ = next.z + dirZ * stepLen;
    const resolved = resolveCollision(rawX, rawZ, 0.36, walls);
    next.x = resolved.x;
    next.z = resolved.z;

    // Smooth yaw toward movement direction
    const desiredYaw = Math.atan2(-dirX, -dirZ);
    let diff = desiredYaw - next.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    next.yaw += diff * Math.min(1, dt * 8);
    next.stridePhase += stepLen * 2.6;
  }

  return {
    creature: next,
    caughtPlayer,
    triggeredMimic: next.activeMimicQuote,
    survivedHunt,
  };
}
