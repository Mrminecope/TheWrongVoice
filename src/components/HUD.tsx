import React, { useRef, useState } from 'react';
import {
  CreatureState,
  GameSettings,
  InteractVerb,
  InteractableDef,
  MissionProgressState,
  SubtitleCue,
} from '../game/types.ts';
import { MISSION_INFO } from '../game/levelData.ts';

interface HUDProps {
  progress: MissionProgressState;
  settings: GameSettings;
  roomName: string;
  isCrouching: boolean;
  isHiding: boolean;
  creatureState: CreatureState;
  creatureDistance: number;
  activePrompt: {
    target: InteractableDef;
    verb: InteractVerb;
    label: string;
    canExecute: boolean;
    blockedReason?: string;
  } | null;
  subtitle: SubtitleCue | null;
  statusBanner: string | null;
  isMuted: boolean;
  onMoveInput: (x: number, y: number, isSprinting: boolean) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onInteract: () => void;
  onToggleFlashlight: () => void;
  onToggleCrouch: () => void;
  onThrowDecoy: () => void;
  onToggleMute: () => void;
  onOpenArchive: () => void;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  progress,
  settings,
  roomName,
  isCrouching,
  isHiding,
  creatureState,
  creatureDistance,
  activePrompt,
  subtitle,
  statusBanner,
  isMuted,
  onMoveInput,
  onLookDelta,
  onInteract,
  onToggleFlashlight,
  onToggleCrouch,
  onThrowDecoy,
  onToggleMute,
  onOpenArchive,
  onPause,
}) => {
  const missionMeta = MISSION_INFO[progress.mission];
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number; sprinting: boolean }>({
    x: 0,
    y: 0,
    sprinting: false,
  });

  const joyTouchId = useRef<number | null>(null);
  const joyOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookTouchId = useRef<number | null>(null);
  const lookLast = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const MAX_JOY_RADIUS = 46;

  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    joyTouchId.current = e.pointerId;
    const rect = e.currentTarget.getBoundingClientRect();
    joyOrigin.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyTouchId.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyTouchId.current !== e.pointerId) return;
    e.stopPropagation();
    joyTouchId.current = null;
    setJoyKnob({ x: 0, y: 0, sprinting: false });
    onMoveInput(0, 0, false);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const dx = clientX - joyOrigin.current.x;
    const dy = clientY - joyOrigin.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, MAX_JOY_RADIUS);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    const normX = kx / MAX_JOY_RADIUS;
    const normY = -ky / MAX_JOY_RADIUS; // +1 is forward
    // Sprint when pushing joystick mostly forward near full deflection
    const isSprinting = normY > 0.78 && clampedDist >= MAX_JOY_RADIUS * 0.85;

    setJoyKnob({ x: kx, y: ky, sprinting: isSprinting });
    onMoveInput(normX, normY, isSprinting);
  };

  // Look Touch Pad (covers background swipe area without blocking buttons)
  const handleLookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookTouchId.current !== null) return;
    lookTouchId.current = e.pointerId;
    lookLast.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookTouchId.current !== e.pointerId) return;
    const dx = e.clientX - lookLast.current.x;
    const dy = e.clientY - lookLast.current.y;
    lookLast.current = { x: e.clientX, y: e.clientY };
    onLookDelta(dx, dy);
  };

  const handleLookPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookTouchId.current !== e.pointerId) return;
    lookTouchId.current = null;
  };

  const isDangerClose = creatureState === 'CHASE_VISIBLE_PLAYER' || creatureDistance < 6.5;

  const collectedLoreCount = progress.collectedItems.filter((id) =>
    ['theo_cassette_1', 'cassette_operator_2', 'freq_note', 'operator_diary', 'theo_cassette_final', 'family_photo'].includes(id),
  ).length;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Subtle low-HP / close-threat vignette */}
      {isDangerClose && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background:
              'radial-gradient(circle at center, transparent 52%, rgba(145, 24, 24, 0.36) 100%)',
          }}
        />
      )}

      {/* Hiding Locker Peephole Frame when inside a locker */}
      {isHiding && (
        <div
          className="fixed inset-0 pointer-events-none flex flex-col justify-between"
          style={{
            background:
              'linear-gradient(90deg, rgba(5,6,8,0.94) 0%, rgba(5,6,8,0.25) 22%, rgba(5,6,8,0.25) 78%, rgba(5,6,8,0.94) 100%)',
          }}
        >
          <div className="h-16 bg-[#07080a]/90 border-b border-[#252930]" />
          <div className="h-16 bg-[#07080a]/90 border-t border-[#252930]" />
        </div>
      )}

      {/* Fullscreen swipe-to-look touch surface (sits behind UI clusters) */}
      <div
        className="fixed inset-0 pointer-events-auto"
        onPointerDown={handleLookPointerDown}
        onPointerMove={handleLookPointerMove}
        onPointerUp={handleLookPointerUp}
        onPointerCancel={handleLookPointerUp}
      />

      {/* TOP PERIMETER BAR: Left Objective Cluster + Right Compact Utility Icons */}
      <div className="relative z-10 flex items-start justify-between p-3 sm:p-5 pointer-events-none">
        {/* Top-Left Mission & Location Readout */}
        <div
          className="max-w-xs sm:max-w-md px-3.5 py-2.5 rounded border border-[#2c3038]"
          style={{ backgroundColor: 'rgba(11, 13, 16, 0.86)' }}
        >
          <div className="flex items-center gap-2 text-[11px] tracking-[0.14em] text-[#9e998e] font-mono-tabular">
            <span>MISSION 0{missionMeta.number}/07</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#d9c9a8] font-semibold">{missionMeta.title}</span>
          </div>
          <div className="text-xs sm:text-sm text-[#ece8df] font-medium mt-0.5 leading-snug">
            {missionMeta.objective}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#8c877d] font-mono-tabular">
            <span>{roomName}</span>
            <span aria-hidden="true">·</span>
            <span>
              {creatureState === 'CHASE_VISIBLE_PLAYER'
                ? 'RECEIVER: HUNTING YOU'
                : creatureState === 'INVESTIGATE_SOUND' ||
                    creatureState === 'SEARCH_LAST_KNOWN_POSITION' ||
                    creatureState === 'CHECK_HIDING_SPOTS'
                  ? 'RECEIVER: SEARCHING NEARBY'
                  : 'SIGNAL: QUIET'}
            </span>
          </div>
        </div>

        {/* Top-Right Utility Controls (Archive/Clues, Mute, Pause) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Recordings and Clues Archive"
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onOpenArchive();
            }}
            className="min-h-[44px] px-3 py-2 rounded border border-[#2f343d] text-[#d8d3c8] hover:bg-[#1e2229] flex items-center gap-1.5 text-xs font-mono-tabular cursor-pointer"
            style={{ backgroundColor: 'rgba(12, 14, 18, 0.88)' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="12" r="2" />
              <circle cx="15.5" cy="12" r="2" />
              <path d="M8.5 14h7" />
            </svg>
            <span>TAPES ({collectedLoreCount}/6)</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="min-h-[44px] min-w-[44px] rounded border border-[#2f343d] text-[#d8d3c8] hover:bg-[#1e2229] flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(12, 14, 18, 0.88)' }}
          >
            {isMuted ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.8">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.8">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game"
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onPause();
            }}
            className="min-h-[44px] min-w-[44px] rounded border border-[#2f343d] text-[#d8d3c8] hover:bg-[#1e2229] flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(12, 14, 18, 0.88)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        </div>
      </div>

      {/* CENTER RETICLE (100% unobstructed center playfield) */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        <div
          className={`w-2 h-2 rounded-full transition-transform duration-150 ${
            activePrompt
              ? activePrompt.canExecute
                ? 'bg-[#f2e8cf] scale-150 ring-2 ring-[#9e2a2b]'
                : 'bg-[#9e2a2b] scale-125'
              : 'bg-[#e2dfd7]/55'
          }`}
        />
        {activePrompt && (
          <div
            className="mt-3 px-2.5 py-1 rounded text-[11px] font-mono-tabular tracking-wider text-[#ece8df] whitespace-nowrap border border-[#3a3f47]"
            style={{ backgroundColor: 'rgba(9, 10, 12, 0.88)' }}
          >
            {activePrompt.label}
          </div>
        )}
      </div>

      {/* Transient Status Banner (e.g. Locked door notice or item collected) */}
      {statusBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div
            className="px-4 py-2 rounded border border-[#523434] text-xs sm:text-sm text-[#f0e6d8] font-medium tracking-wide shadow-lg"
            style={{ backgroundColor: 'rgba(16, 13, 14, 0.92)' }}
          >
            {statusBanner}
          </div>
        </div>
      )}

      {/* SUBTITLE BANNER (Story Cassettes & The Receiver's Voice Mimicry) */}
      {settings.subtitles && subtitle && (
        <div className="fixed bottom-28 sm:bottom-24 left-1/2 -translate-x-1/2 z-20 max-w-lg w-[90vw] pointer-events-none text-center">
          <div
            className={`px-4 py-2.5 rounded border text-xs sm:text-sm leading-relaxed ${
              subtitle.isImitation
                ? 'border-[#802828] text-[#f2d5d5]'
                : 'border-[#383d46] text-[#ece8df]'
            }`}
            style={{ backgroundColor: 'rgba(9, 10, 12, 0.92)' }}
          >
            {subtitle.text}
          </div>
        </div>
      )}

      {/* BOTTOM MULTITOUCH CONTROLS: Thumb Joystick + Context-Sensitive Action & Equipment */}
      <div
        className={`fixed bottom-4 left-4 right-4 z-10 flex items-end justify-between pointer-events-none ${
          settings.leftHanded ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Virtual Movement Joystick + Crouch Toggle */}
        <div className="flex items-end gap-3 pointer-events-auto">
          <div
            role="application"
            aria-label="Movement Joystick — Drag to move, push fully forward to sprint"
            onPointerDown={handleJoystickPointerDown}
            onPointerMove={handleJoystickPointerMove}
            onPointerUp={handleJoystickPointerUp}
            onPointerCancel={handleJoystickPointerUp}
            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border flex items-center justify-center touch-none cursor-pointer ${
              joyKnob.sprinting ? 'border-[#c44536]' : 'border-[#3a3f47]'
            }`}
            style={{ backgroundColor: 'rgba(12, 14, 18, 0.78)' }}
          >
            {/* Sprint forward indicator arc */}
            <div className="absolute top-1.5 text-[9px] font-mono-tabular tracking-widest text-[#8c877d]">
              {joyKnob.sprinting ? 'SPRINTING' : 'MOVE'}
            </div>
            {/* Thumb Knob */}
            <div
              className={`w-11 h-11 rounded-full border transition-colors ${
                joyKnob.sprinting
                  ? 'bg-[#9e2a2b] border-[#f2dfd7]'
                  : 'bg-[#2a2f37] border-[#6c727d]'
              }`}
              style={{
                transform: `translate3d(${joyKnob.x}px, ${joyKnob.y}px, 0)`,
              }}
            />
          </div>

          {/* Toggleable Crouch Button */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={isCrouching ? 'Stand Up' : 'Crouch Stealth'}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onToggleCrouch();
            }}
            className={`min-h-[48px] min-w-[68px] px-3 py-2 rounded border text-xs font-mono-tabular tracking-wider transition-colors cursor-pointer ${
              isCrouching
                ? 'bg-[#2b3842] border-[#7aa2bd] text-[#e8f1f5]'
                : 'border-[#343942] text-[#b8b3a8] hover:bg-[#1b1f26]'
            }`}
            style={{
              backgroundColor: isCrouching ? 'rgba(35, 52, 66, 0.92)' : 'rgba(12, 14, 18, 0.85)',
            }}
          >
            {isCrouching ? 'CROUCHED' : 'CROUCH'}
          </button>
        </div>

        {/* Right Thumb Cluster: Context-Sensitive Single Action Button + Collected Equipment Only */}
        <div className="flex flex-col items-end gap-2.5 pointer-events-auto">
          {/* Context-Sensitive Action Button: ONLY visible when looking at a valid object in range */}
          {activePrompt && (
            <button
              type="button"
              data-testid="context-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                e.currentTarget.blur();
                onInteract();
              }}
              className={`min-h-[54px] px-6 py-3 rounded border font-semibold text-xs sm:text-sm tracking-[0.14em] shadow-lg transition-colors cursor-pointer whitespace-nowrap ${
                activePrompt.canExecute
                  ? 'bg-[#9e2a2b] hover:bg-[#b53334] border-[#d96b6c] text-[#f7f4ed]'
                  : 'bg-[#1b1e24] border-[#454a54] text-[#9e9a90]'
              }`}
            >
              {activePrompt.verb}
            </button>
          )}

          {/* Equipment Row: Buttons appear ONLY when that equipment is in inventory */}
          <div className="flex items-center gap-2.5">
            {/* Optional Noise Decoy Button (appears only when player has collected >= 1 tin of bolts) */}
            {progress.decoyCount > 0 && !isHiding && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Throw Noise Decoy (${progress.decoyCount} remaining)`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.currentTarget.blur();
                  onThrowDecoy();
                }}
                className="min-h-[48px] px-3.5 py-2 rounded border border-[#5e4b36] text-[#e6ccb2] hover:bg-[#2b231c] flex items-center gap-2 text-xs font-mono-tabular cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: 'rgba(18, 15, 12, 0.88)' }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="1.8">
                  <ellipse cx="12" cy="6" rx="7" ry="3" />
                  <path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
                </svg>
                <span>THROW DECOY ({progress.decoyCount})</span>
              </button>
            )}

            {/* Flashlight Button (visible only while carrying the flashlight) */}
            {progress.inventory.includes('flashlight') && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Toggle Flashlight (${Math.round(progress.battery)}% battery)`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.currentTarget.blur();
                  onToggleFlashlight();
                }}
                className={`min-h-[48px] px-4 py-2 rounded border flex items-center gap-2 text-xs font-mono-tabular transition-colors cursor-pointer whitespace-nowrap ${
                  progress.flashlightOn
                    ? 'border-[#bfa054] text-[#f7e9c3]'
                    : 'border-[#343942] text-[#9c978d]'
                }`}
                style={{
                  backgroundColor: progress.flashlightOn
                    ? 'rgba(42, 35, 18, 0.9)'
                    : 'rgba(12, 14, 18, 0.86)',
                }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="1.8">
                  <path d="M18 6l-6 6-4-4-6 6v4h4l6-6 4 4 6-6V6h-4z" />
                </svg>
                <span>LIGHT {Math.round(progress.battery)}%</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
