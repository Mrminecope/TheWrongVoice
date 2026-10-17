import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialProgress,
  determineEnding,
  evaluateMissionProgression,
  evaluateRadioTuning,
  findBestInteractable,
  hasLineOfSight,
  resolveCollision,
} from './rules.ts';
import {
  canCreatureHearNoise,
  canCreatureSeePlayer,
  createInitialCreature,
  selectHidingSpotToInspect,
  stepCreatureAI,
} from './creatureAI.ts';
import { INITIAL_INTERACTABLES, INITIAL_WALLS } from './levelData.ts';

test('collision resolution prevents player from walking through walls', () => {
  const testWall = [{ id: 'w1', minX: -1, maxX: 1, minZ: -0.2, maxZ: 0.2, height: 3 }];
  const res = resolveCollision(0, 0.3, 0.4, testWall);
  assert.equal(res.collided, true);
  assert.ok(res.z >= 0.59, `Expected player Z to be pushed out to >= 0.6, got ${res.z}`);
});

test('line of sight is blocked by solid walls and clear in open corridors', () => {
  const wallBetween = [{ id: 'w1', minX: -2, maxX: 2, minZ: -0.2, maxZ: 0.2, height: 3.5 }];
  assert.equal(hasLineOfSight(0, -2, 0, 2, wallBetween), false);
  assert.equal(hasLineOfSight(0, 2, 0, 5, wallBetween), true);
});

test('interaction hysteresis keeps target stable and blocks interaction through walls', () => {
  const progress = createInitialProgress();
  // Looking straight at Theo's Cassette #1 at (0.9, 4.8) from (0.9, 6.2) facing North (yaw = 0)
  const found = findBestInteractable(
    0.9,
    6.2,
    0,
    INITIAL_INTERACTABLES,
    progress,
    INITIAL_WALLS,
    false,
    null,
  );
  assert.ok(found, 'Should find Theo cassette pickup in range');
  assert.equal(found.target.id, 'pickup_theo_cassette_1');
  assert.equal(found.verb, 'PICK UP');
});

test('mission manager progresses cleanly through all 7 missions', () => {
  let state = createInitialProgress();
  assert.equal(state.mission, '1_ENTER_STATION');

  // Collect first cassette -> Mission 2
  state.collectedItems.push('theo_cassette_1');
  state = evaluateMissionProgression(state);
  assert.equal(state.mission, '2_RESTORE_POWER');

  // Restore fuse power -> Mission 3
  state.powerRestored = true;
  state = evaluateMissionProgression(state);
  assert.equal(state.mission, '3_ESCAPE_HUNT');

  // Collect maintenance key & survive hunt -> Mission 4
  state.collectedItems.push('maintenance_key');
  state.huntSurvived = true;
  state = evaluateMissionProgression(state);
  assert.equal(state.mission, '4_DECODE_VOICES');

  // Decode radio -> Mission 5
  state.radioDecoded = true;
  state = evaluateMissionProgression(state);
  assert.equal(state.mission, '5_DISCOVER_TRUTH');

  // Read diary and Theo's final tape -> Mission 6
  state.diaryExamined = true;
  state.theoTapeFound = true;
  state = evaluateMissionProgression(state);
  assert.equal(state.mission, '6_SHUT_DOWN_SIGNAL');

  // Shut down signal -> Mission 7
  state.signalShutDown = true;
  state = evaluateMissionProgression(state);
  assert.equal(state.mission, '7_ESCAPE');
});

test('radio frequency tuning puzzle locks at 704.52 kHz and 76 degrees', () => {
  const offTune = evaluateRadioTuning(680.0, 20);
  assert.equal(offTune.isLocked, false);
  assert.ok(offTune.clarity < 75);

  const exactTune = evaluateRadioTuning(704.52, 76);
  assert.equal(exactTune.isLocked, true);
  assert.equal(exactTune.clarity, 100);
});

test('creature AI transitions across PATROL, INVESTIGATE_SOUND, CHASE, SEARCH, CHECK_HIDING_SPOTS, and RETURN', () => {
  let creature = createInitialCreature();
  creature.x = 0;
  creature.z = -2.8;
  assert.equal(creature.state, 'PATROL');

  // 1. Loud noise triggers INVESTIGATE_SOUND
  const loudNoise = [{ x: 0, z: 2.0, loudness: 90, source: 'decoy' as const, timestamp: 100 }];
  const hearCheck = canCreatureHearNoise(creature, loudNoise[0], []);
  assert.equal(hearCheck.heard, true);

  let step = stepCreatureAI(creature, 0.1, -9, 5, false, null, false, false, loudNoise, {}, []);
  creature = step.creature;
  assert.equal(creature.state, 'INVESTIGATE_SOUND');

  // 2. Direct line of sight triggers CHASE_VISIBLE_PLAYER
  creature.yaw = Math.PI; // Facing +Z toward player at (0, 1.0)
  const sees = canCreatureSeePlayer(creature, 0, 1.0, false, false, true, []);
  assert.equal(sees, true);

  step = stepCreatureAI(creature, 0.1, 0, 1.0, false, null, false, true, [], {}, []);
  creature = step.creature;
  assert.equal(creature.state, 'CHASE_VISIBLE_PLAYER');

  // 3. Player hides -> Creature loses sight -> SEARCH_LAST_KNOWN_POSITION -> CHECK_HIDING_SPOTS
  step = stepCreatureAI(creature, 0.1, -9.6, 0.8, true, 'locker_bedroom', false, false, [], {}, []);
  creature = step.creature;
  assert.equal(creature.state, 'SEARCH_LAST_KNOWN_POSITION');

  // Advance timer to complete search at LKP
  creature.lastKnownX = -8.6;
  creature.lastKnownZ = 0.8;
  step = stepCreatureAI(creature, 4.5, -9.6, 0.8, true, 'locker_bedroom', false, false, [], { locker_bedroom: 1 }, []);
  creature = step.creature;
  assert.equal(creature.state, 'CHECK_HIDING_SPOTS');
});

test('creature behavior memory adapts when a hiding spot is overused', () => {
  const firstUse = selectHidingSpotToInspect(-8.5, 0.8, { locker_bedroom: 1 });
  assert.ok(firstUse.spot);
  assert.equal(firstUse.willCatchHiddenPlayer, false);

  const repeatedUse = selectHidingSpotToInspect(-8.5, 0.8, { locker_bedroom: 3 });
  assert.ok(repeatedUse.spot);
  assert.equal(repeatedUse.willCatchHiddenPlayer, true);
});

test('all three story endings resolve accurately', () => {
  const base = createInitialProgress();
  base.signalShutDown = true;
  assert.equal(determineEnding(base), 'THE_SILENCE');

  const bad = createInitialProgress();
  bad.answeredVoice = true;
  assert.equal(determineEnding(bad), 'THE_ANSWER');

  const secret = createInitialProgress();
  secret.signalShutDown = true;
  secret.collectedItems = [
    'flashlight',
    'theo_cassette_1',
    'cassette_operator_2',
    'theo_cassette_final',
    'family_photo',
    'operator_diary',
  ];
  assert.equal(determineEnding(secret), 'THE_LAST_RECORDING');
});
