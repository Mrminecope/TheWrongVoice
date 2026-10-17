/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CreatureState,
  EndingType,
  GameSettings,
  GameState,
  InteractVerb,
  InteractableDef,
  MissionProgressState,
  NoiseEvent,
  SubtitleCue,
} from './game/types.ts';
import {
  HIDING_SPOTS,
  INITIAL_DOORS,
  INITIAL_INTERACTABLES,
  INITIAL_WALLS,
  LORE_DOCUMENTS,
  PLAYER_SPAWN,
} from './game/levelData.ts';
import {
  createInitialProgress,
  determineEnding,
  evaluateMissionProgression,
  findBestInteractable,
  getDoorColliders,
  getInteractableAction,
} from './game/rules.ts';
import {
  clearSavedGame,
  hasSavedGame,
  loadSavedGame,
  loadSettings,
  saveGame,
  saveSettings,
} from './game/SaveManager.ts';
import { audioManager } from './game/AudioManager.ts';
import { GameCanvas } from './components/GameCanvas.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { HUD } from './components/HUD.tsx';
import {
  EndingModal,
  IntroStoryCard,
  LoreArchiveModal,
  PauseSettingsModal,
  RadioTuningModal,
  SignalChoiceModal,
} from './components/Modals.tsx';

export default function App() {
  const isAutoStart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [gameState, setGameState] = useState<GameState>(isAutoStart ? 'playing' : 'title');
  const [progress, setProgress] = useState<MissionProgressState>(() => createInitialProgress());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [hasSave, setHasSave] = useState<boolean>(() => hasSavedGame());

  const [showIntroCard, setShowIntroCard] = useState<boolean>(false);
  const [pauseTab, setPauseTab] = useState<'pause' | 'settings' | 'howto'>('pause');
  const [showRadioModal, setShowRadioModal] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [archiveInitialDoc, setArchiveInitialDoc] = useState<string | null>(null);
  const [showSignalChoiceModal, setShowSignalChoiceModal] = useState<boolean>(false);
  const [endingType, setEndingType] = useState<EndingType>('THE_SILENCE');

  const [isCrouching, setIsCrouching] = useState<boolean>(false);
  const [isHiding, setIsHiding] = useState<boolean>(false);
  const [activeHidingSpotId, setActiveHidingSpotId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('Exterior Gate & Porch');
  const [creatureState, setCreatureState] = useState<CreatureState>('PATROL');
  const [creatureDistance, setCreatureDistance] = useState<number>(20);
  const [activePrompt, setActivePrompt] = useState<{
    target: InteractableDef;
    verb: InteractVerb;
    label: string;
    canExecute: boolean;
    blockedReason?: string;
  } | null>(null);
  const [subtitle, setSubtitle] = useState<SubtitleCue | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Refs shared with 60fps Three.js loop
  const moveInputRef = useRef<{ x: number; y: number; sprinting: boolean }>({
    x: 0,
    y: 0,
    sprinting: false,
  });
  const lookDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const playerTransformRef = useRef<{ x: number; z: number; yaw: number; pitch: number }>({
    x: PLAYER_SPAWN.x,
    z: PLAYER_SPAWN.z,
    yaw: PLAYER_SPAWN.yaw,
    pitch: 0,
  });
  const decoyTriggerRef = useRef<number>(0);
  const noiseQueueRef = useRef<NoiseEvent[]>([]);
  const keysHeldRef = useRef<Set<string>>(new Set());

  // Mirror game state to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Helper to show a temporary subtitle cue
  const triggerSubtitle = useCallback(
    (speaker: string, text: string, isImitation = false, durationMs = 5800) => {
      const id = `${Date.now()}_${Math.random()}`;
      setSubtitle({ id, speaker, text, isImitation, durationMs });
    },
    [],
  );

  useEffect(() => {
    if (!subtitle) return;
    const t = setTimeout(() => {
      setSubtitle((curr) => (curr?.id === subtitle.id ? null : curr));
    }, subtitle.durationMs);
    return () => clearTimeout(t);
  }, [subtitle]);

  // Helper to show a transient top status banner
  const triggerBanner = useCallback((msg: string) => {
    setStatusBanner(msg);
  }, []);

  useEffect(() => {
    if (!statusBanner) return;
    const t = setTimeout(() => setStatusBanner(null), 3200);
    return () => clearTimeout(t);
  }, [statusBanner]);

  // Elapsed run timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setProgress((prev) => ({
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + 1,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Auto-save when mission or inventory changes during play
  useEffect(() => {
    if (gameState !== 'playing') return;
    saveGame({
      version: 1,
      savedAt: Date.now(),
      playerX: playerTransformRef.current.x,
      playerZ: playerTransformRef.current.z,
      playerYaw: playerTransformRef.current.yaw,
      progress,
    });
    setHasSave(true);
  }, [
    gameState,
    progress.mission,
    progress.collectedItems.length,
    progress.powerRestored,
    progress.radioDecoded,
    progress.signalShutDown,
  ]);

  const startNewGame = useCallback((skipIntro = false) => {
    audioManager.initAfterUserGesture(settings.masterVolume);
    clearSavedGame();
    const fresh = createInitialProgress();
    setProgress(fresh);
    setIsCrouching(false);
    setIsHiding(false);
    setActiveHidingSpotId(null);
    setShowRadioModal(false);
    setShowArchiveModal(false);
    setShowSignalChoiceModal(false);
    playerTransformRef.current = {
      x: PLAYER_SPAWN.x,
      z: PLAYER_SPAWN.z,
      yaw: PLAYER_SPAWN.yaw,
      pitch: 0,
    };
    moveInputRef.current = { x: 0, y: 0, sprinting: false };
    keysHeldRef.current.clear();
    document.body.dataset.state = 'playing';
    setGameState('playing');
    setShowIntroCard(!skipIntro);
  }, [settings.masterVolume]);

  const continueSavedGame = useCallback(() => {
    audioManager.initAfterUserGesture(settings.masterVolume);
    const saved = loadSavedGame();
    if (!saved) {
      startNewGame(false);
      return;
    }
    setProgress(saved.progress);
    playerTransformRef.current = {
      x: saved.playerX,
      z: saved.playerZ,
      yaw: saved.playerYaw,
      pitch: 0,
    };
    setIsCrouching(false);
    setIsHiding(false);
    setActiveHidingSpotId(null);
    setShowIntroCard(false);
    document.body.dataset.state = 'playing';
    setGameState('playing');
  }, [settings.masterVolume, startNewGame]);

  // Execute an interaction on a specific InteractableDef
  const executeInteractionOnTarget = useCallback(
    (target: InteractableDef) => {
      const action = getInteractableAction(target, progress, isHiding);
      if (!action) return;

      if (!action.canExecute) {
        if (action.blockedReason) {
          triggerBanner(action.blockedReason);
        }
        return;
      }

      // 1. Exiting or entering a Hiding Spot
      if (target.type === 'hiding_spot' && target.hidingSpotId) {
        const spot = HIDING_SPOTS.find((s) => s.id === target.hidingSpotId);
        if (!spot) return;
        audioManager.playDoorCreak(!isHiding);
        if (isHiding) {
          setIsHiding(false);
          setActiveHidingSpotId(null);
          playerTransformRef.current.x = spot.standX;
          playerTransformRef.current.z = spot.standZ;
          triggerBanner(`Exited ${spot.name}`);
        } else {
          setIsHiding(true);
          setActiveHidingSpotId(spot.id);
          playerTransformRef.current.yaw = spot.facingYaw;
          playerTransformRef.current.pitch = 0;
          setProgress((prev) => {
            const uses = (prev.hidingSpotUsage[spot.id] || 0) + 1;
            const nextUsage = { ...prev.hidingSpotUsage, [spot.id]: uses };
            const updated: MissionProgressState = {
              ...prev,
              hidingSpotUsage: nextUsage,
              huntSurvived: prev.mission === '3_ESCAPE_HUNT' ? true : prev.huntSurvived,
            };
            return evaluateMissionProgression(updated);
          });
          const count = (progress.hidingSpotUsage[spot.id] || 0) + 1;
          if (count >= 3) {
            triggerBanner('Warning: You have used this locker repeatedly. The Receiver may check it!');
          } else {
            triggerBanner(`Hiding inside ${spot.name} — Press EXIT or E to step out`);
          }
        }
        return;
      }

      // 2. Doors (Open, Close, Unlock)
      if (target.type === 'door' && target.doorId) {
        const door = INITIAL_DOORS.find((d) => d.id === target.doorId);
        if (!door) return;
        const isOpen = progress.openDoors.includes(door.id);
        audioManager.playDoorCreak(!isOpen);

        if (door.creaky) {
          noiseQueueRef.current.push({
            x: door.x,
            z: door.z,
            loudness: 52,
            source: 'door',
            timestamp: performance.now(),
          });
        }

        setProgress((prev) => {
          const nextUnlocked = prev.unlockedDoors.includes(door.id)
            ? prev.unlockedDoors
            : [...prev.unlockedDoors, door.id];
          const nextOpen = isOpen
            ? prev.openDoors.filter((id) => id !== door.id)
            : [...prev.openDoors, door.id];
          const updated: MissionProgressState = {
            ...prev,
            unlockedDoors: nextUnlocked,
            openDoors: nextOpen,
          };
          return evaluateMissionProgression(updated);
        });

        if (!progress.unlockedDoors.includes(door.id) && door.lockedByItem) {
          triggerBanner(`Unlocked ${door.name}`);
        }
        return;
      }

      // 3. Item Pickups & Readable Clues
      if (target.type === 'pickup' && target.itemId) {
        const itemId = target.itemId;
        audioManager.playPickup();

        setProgress((prev) => {
          if (prev.collectedItems.includes(itemId)) return prev;
          const nextCollected = [...prev.collectedItems, itemId];
          const nextInv = prev.inventory.includes(itemId)
            ? prev.inventory
            : [...prev.inventory, itemId];

          let nextBattery = prev.battery;
          let nextDecoys = prev.decoyCount;
          if (itemId === 'spare_batteries_1' || itemId === 'spare_batteries_2') {
            nextBattery = Math.min(100, prev.battery + 45);
          }
          if (itemId === 'noise_decoy_1' || itemId === 'noise_decoy_2') {
            nextDecoys += 2;
          }

          const updated: MissionProgressState = {
            ...prev,
            collectedItems: nextCollected,
            inventory: nextInv,
            battery: nextBattery,
            decoyCount: nextDecoys,
            diaryExamined: itemId === 'operator_diary' ? true : prev.diaryExamined,
            theoTapeFound: itemId === 'theo_cassette_final' ? true : prev.theoTapeFound,
          };
          return evaluateMissionProgression(updated);
        });

        const lore = LORE_DOCUMENTS[itemId];
        if (lore) {
          if (lore.audioTranscript) {
            audioManager.playVoiceSynthCue(false);
            triggerSubtitle('RECORDING', lore.audioTranscript, false, 7200);
          }
          if (
            itemId === 'operator_diary' ||
            itemId === 'freq_note' ||
            itemId === 'family_photo'
          ) {
            setArchiveInitialDoc(itemId);
            setShowArchiveModal(true);
          } else {
            triggerBanner(`Collected ${target.name} — View full transcript in TAPES`);
          }
        } else {
          triggerBanner(`Picked up ${target.name}`);
        }
        return;
      }

      // 4. Basement Fuse Box (REF_21)
      if (target.type === 'fuse_box') {
        if (!progress.powerRestored && progress.inventory.includes('glass_fuse')) {
          audioManager.playPowerRestoreSurge();
          noiseQueueRef.current.push({
            x: target.x,
            z: target.z,
            loudness: 96,
            source: 'fuse',
            timestamp: performance.now(),
          });
          setProgress((prev) =>
            evaluateMissionProgression({
              ...prev,
              powerRestored: true,
              noiseAlertsTriggered: prev.noiseAlertsTriggered + 1,
            }),
          );
          triggerBanner('Station Power Restored! Generator surge echoed through the halls—HIDE or EVADE!');
          triggerSubtitle(
            'THE RECEIVER',
            'DISTANT VOICE: "Mara... did you turn the lights back on for me? [60Hz SURGE]"',
            true,
            6000,
          );
        } else {
          triggerBanner('Basement Fuse Box: 250V Glass Fuse is active and supplying station power.');
        }
        return;
      }

      // 5. Emergency Radio Workbench (REF_03 & REF_19)
      if (target.type === 'radio_workbench') {
        setShowRadioModal(true);
        return;
      }

      // 6. Master Signal Shutdown Console (REF_16)
      if (target.type === 'shutdown_console') {
        if (!progress.panelUnscrewed && progress.inventory.includes('screwdriver')) {
          audioManager.playPickup();
          setProgress((prev) => ({
            ...prev,
            panelUnscrewed: true,
          }));
          triggerBanner('Service plate unscrewed. Opening Master Signal Console...');
          setShowSignalChoiceModal(true);
        } else if (progress.panelUnscrewed && !progress.signalShutDown && !progress.answeredVoice) {
          setShowSignalChoiceModal(true);
        } else {
          triggerBanner('Master Transmitter is offline. Escape via the Exterior Perimeter Gate!');
        }
        return;
      }

      // 7. Exterior Exit Gate (REF_20)
      if (target.type === 'exit_gate') {
        const finalEnding = determineEnding(progress);
        setEndingType(finalEnding);
        clearSavedGame();
        setHasSave(false);
        document.body.dataset.state = 'gameover';
        setGameState('gameover');
      }
    },
    [isHiding, progress, triggerBanner, triggerSubtitle],
  );

  const handlePrimaryInteract = useCallback(() => {
    if (activePrompt) {
      executeInteractionOnTarget(activePrompt.target);
      return;
    }
    const doorColliders = getDoorColliders(INITIAL_DOORS, progress.openDoors);
    const allColliders = [...INITIAL_WALLS, ...doorColliders];
    const fallback = findBestInteractable(
      playerTransformRef.current.x,
      playerTransformRef.current.z,
      playerTransformRef.current.yaw,
      INITIAL_INTERACTABLES,
      progress,
      allColliders,
      isHiding,
      null,
    );
    if (fallback) {
      executeInteractionOnTarget(fallback.target);
    }
  }, [activePrompt, executeInteractionOnTarget, isHiding, progress]);

  const handleTapInteractTarget = useCallback(
    (targetId: string) => {
      const target = INITIAL_INTERACTABLES.find((i) => i.id === targetId);
      if (target) {
        executeInteractionOnTarget(target);
      }
    },
    [executeInteractionOnTarget],
  );

  const handleToggleFlashlight = useCallback(() => {
    audioManager.playFlashlightClick();
    setProgress((prev) => ({
      ...prev,
      flashlightOn: !prev.flashlightOn,
    }));
  }, []);

  const handleThrowDecoy = useCallback(() => {
    if (progress.decoyCount <= 0 || isHiding) return;
    setProgress((prev) => ({
      ...prev,
      decoyCount: Math.max(0, prev.decoyCount - 1),
    }));
    decoyTriggerRef.current += 1;
    triggerBanner('Threw Tin of Metal Bolts!');
  }, [isHiding, progress.decoyCount, triggerBanner]);

  const handleDecoyLanded = useCallback((x: number, z: number) => {
    audioManager.playDecoyClatter();
    noiseQueueRef.current.push({
      x,
      z,
      loudness: 92,
      source: 'decoy',
      timestamp: performance.now(),
    });
    setProgress((prev) => ({
      ...prev,
      noiseAlertsTriggered: prev.noiseAlertsTriggered + 1,
    }));
  }, []);

  // Keyboard Controls (WASD / Arrows, Shift Sprint, E Interact, F Flashlight, C Crouch, G Decoy, Esc/P Pause)
  useEffect(() => {
    const syncKeyboardMovement = () => {
      const held = keysHeldRef.current;
      let x = 0;
      let y = 0;
      if (held.has('KeyW') || held.has('ArrowUp')) y += 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      const sprinting = held.has('ShiftLeft') || held.has('ShiftRight');
      moveInputRef.current = { x, y, sprinting };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      // Title screen Start handshake on Enter / Space
      if (gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        startNewGame(false);
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (showRadioModal || showArchiveModal || showSignalChoiceModal) {
          setShowRadioModal(false);
          setShowArchiveModal(false);
          setShowSignalChoiceModal(false);
          return;
        }
        if (gameState === 'playing') {
          setPauseTab('pause');
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
        return;
      }

      if (gameState !== 'playing') return;

      if (showIntroCard && (e.code === 'Enter' || e.code === 'Space')) {
        setShowIntroCard(false);
        return;
      }

      keysHeldRef.current.add(e.code);
      syncKeyboardMovement();

      if (e.code === 'KeyE' || e.code === 'Space') {
        handlePrimaryInteract();
      } else if (e.code === 'KeyF') {
        handleToggleFlashlight();
      } else if (e.code === 'KeyC') {
        setIsCrouching((c) => !c);
      } else if (e.code === 'KeyG') {
        handleThrowDecoy();
      } else if (e.code === 'KeyJ') {
        setShowArchiveModal((v) => !v);
      } else if (e.code === 'KeyM') {
        const nextMuted = !audioManager.getMuted();
        audioManager.setMuted(nextMuted);
        setIsMuted(nextMuted);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
      syncKeyboardMovement();
    };

    const onBlur = () => {
      keysHeldRef.current.clear();
      moveInputRef.current = { x: 0, y: 0, sprinting: false };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    gameState,
    handlePrimaryInteract,
    handleThrowDecoy,
    handleToggleFlashlight,
    showArchiveModal,
    showIntroCard,
    showRadioModal,
    showSignalChoiceModal,
    startNewGame,
  ]);

  const isAnyModalOpen =
    showIntroCard || showRadioModal || showArchiveModal || showSignalChoiceModal;

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#090a0c] select-none">
      {/* Persistent Full-Viewport 3D WebGL Scene */}
      <GameCanvas
        gameState={gameState}
        progress={progress}
        settings={settings}
        isCrouching={isCrouching}
        isHiding={isHiding}
        activeHidingSpotId={activeHidingSpotId}
        isModalOpen={isAnyModalOpen}
        moveInputRef={moveInputRef}
        lookDeltaRef={lookDeltaRef}
        playerTransformRef={playerTransformRef}
        decoyTriggerRef={decoyTriggerRef}
        noiseQueueRef={noiseQueueRef}
        onPromptChange={setActivePrompt}
        onTapInteractTarget={handleTapInteractTarget}
        onRoomChange={setRoomName}
        onCreatureUpdate={(state, dist, mimic, survivedHunt) => {
          setCreatureState(state);
          setCreatureDistance(dist);
          if (mimic) {
            audioManager.playVoiceSynthCue(true);
            triggerSubtitle('THE RECEIVER', mimic.text, true, 5200);
          }
          if (survivedHunt) {
            setProgress((prev) =>
              evaluateMissionProgression({
                ...prev,
                huntSurvived: true,
              }),
            );
          }
        }}
        onPlayerCaught={() => {
          audioManager.playVoiceSynthCue(true);
          setEndingType('DEFEAT');
          document.body.dataset.state = 'gameover';
          setGameState('gameover');
        }}
        onBatteryTick={(newBattery) => {
          setProgress((prev) => ({
            ...prev,
            battery: newBattery,
            flashlightOn: newBattery > 0 ? prev.flashlightOn : false,
          }));
        }}
        onDecoyLanded={handleDecoyLanded}
      />

      {/* STATE 1: TITLE SCREEN */}
      {gameState === 'title' && (
        <TitleScreen
          hasSave={hasSave}
          onNewGame={() => startNewGame(false)}
          onContinue={continueSavedGame}
          onOpenSettings={() => {
            setPauseTab('settings');
            setGameState('paused');
          }}
          onOpenHowToPlay={() => {
            setPauseTab('howto');
            setGameState('paused');
          }}
        />
      )}

      {/* STATE 2: PLAYING HUD */}
      {gameState === 'playing' && (
        <HUD
          progress={progress}
          settings={settings}
          roomName={roomName}
          isCrouching={isCrouching}
          isHiding={isHiding}
          creatureState={creatureState}
          creatureDistance={creatureDistance}
          activePrompt={activePrompt}
          subtitle={subtitle}
          statusBanner={statusBanner}
          isMuted={isMuted}
          onMoveInput={(x, y, sprinting) => {
            moveInputRef.current = { x, y, sprinting };
          }}
          onLookDelta={(dx, dy) => {
            lookDeltaRef.current.dx += dx;
            lookDeltaRef.current.dy += dy;
          }}
          onInteract={handlePrimaryInteract}
          onToggleFlashlight={handleToggleFlashlight}
          onToggleCrouch={() => setIsCrouching((c) => !c)}
          onThrowDecoy={handleThrowDecoy}
          onToggleMute={() => {
            const next = !isMuted;
            setIsMuted(next);
            audioManager.setMuted(next);
          }}
          onOpenArchive={() => {
            setArchiveInitialDoc(null);
            setShowArchiveModal(true);
          }}
          onPause={() => {
            setPauseTab('pause');
            setGameState('paused');
          }}
        />
      )}

      {/* STORY INTRO CARD */}
      {gameState === 'playing' && showIntroCard && (
        <IntroStoryCard onDismiss={() => setShowIntroCard(false)} />
      )}

      {/* RADIO TUNING PUZZLE MODAL */}
      {gameState === 'playing' && showRadioModal && (
        <RadioTuningModal
          hasFreqNote={progress.collectedItems.includes('freq_note')}
          alreadyDecoded={progress.radioDecoded}
          onSuccessLock={() => {
            audioManager.playPowerRestoreSurge();
            setShowRadioModal(false);
            setProgress((prev) =>
              evaluateMissionProgression({
                ...prev,
                radioDecoded: true,
              }),
            );
            triggerBanner('704.52 kHz Decoded! Lower Listening Chamber magnetic seal unlocked.');
            triggerSubtitle(
              'THEO (RADIO)',
              'RADIO TRANSMISSION: "Don’t answer if you hear my voice... Take the brass key and enter the Listening Chamber."',
              false,
              6500,
            );
          }}
          onClose={() => setShowRadioModal(false)}
        />
      )}

      {/* LORE & ARCHIVE MODAL */}
      {gameState === 'playing' && showArchiveModal && (
        <LoreArchiveModal
          progress={progress}
          initialDocId={archiveInitialDoc}
          onClose={() => setShowArchiveModal(false)}
        />
      )}

      {/* MASTER SIGNAL CONSOLE FINAL DECISION MODAL */}
      {gameState === 'playing' && showSignalChoiceModal && (
        <SignalChoiceModal
          onShutDown={() => {
            audioManager.playPowerRestoreSurge();
            setShowSignalChoiceModal(false);
            noiseQueueRef.current.push({
              x: playerTransformRef.current.x,
              z: playerTransformRef.current.z,
              loudness: 100,
              source: 'alarm',
              timestamp: performance.now(),
            });
            setProgress((prev) =>
              evaluateMissionProgression({
                ...prev,
                signalShutDown: true,
                noiseAlertsTriggered: prev.noiseAlertsTriggered + 1,
              }),
            );
            triggerBanner('SIGNAL SHUT DOWN! Grab the Tagged Exit Key and run to the Exterior Gate!');
            triggerSubtitle(
              'THE RECEIVER',
              'SHRIEKING STATIC: "WHY DID YOU CUT THE LINE, MARA?! [METALLIC FOOTSTEPS APPROACHING]"',
              true,
              6500,
            );
          }}
          onAnswerVoice={() => {
            audioManager.playVoiceSynthCue(true);
            setShowSignalChoiceModal(false);
            setProgress((prev) =>
              evaluateMissionProgression({
                ...prev,
                answeredVoice: true,
              }),
            );
            triggerBanner('You answered the microphone... Now escape to the Exterior Gate!');
          }}
          onClose={() => setShowSignalChoiceModal(false)}
        />
      )}

      {/* STATE 3: PAUSE / SETTINGS / HOW TO PLAY MODAL */}
      {gameState === 'paused' && (
        <PauseSettingsModal
          mode={pauseTab}
          settings={settings}
          onUpdateSettings={(next) => {
            setSettings(next);
            saveSettings(next);
          }}
          onResume={() => {
            setGameState(hasSavedGame() || progress.elapsedSeconds > 0 ? 'playing' : 'title');
          }}
          onRestart={() => startNewGame(true)}
          onReturnTitle={() => setGameState('title')}
          onSwitchTab={setPauseTab}
        />
      )}

      {/* STATE 4: ENDING / DEFEAT MODAL */}
      {gameState === 'gameover' && (
        <EndingModal
          ending={endingType}
          progress={progress}
          onPlayAgain={() => startNewGame(true)}
          onReturnTitle={() => setGameState('title')}
        />
      )}
    </main>
  );
}
