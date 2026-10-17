import React, { useEffect, useRef, useState } from 'react';
import {
  EndingType,
  GameSettings,
  ItemId,
  LoreDocument,
  MissionProgressState,
} from '../game/types.ts';
import { ITEM_METADATA, LORE_DOCUMENTS, MISSION_INFO } from '../game/levelData.ts';
import { evaluateRadioTuning } from '../game/rules.ts';
import { audioManager } from '../game/AudioManager.ts';

/* ============================================================================
 * 1. STORY INTRO OVERLAY CARD
 * ========================================================================== */
export const IntroStoryCard: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-6 pointer-events-auto"
      style={{ backgroundColor: 'rgba(6, 7, 9, 0.92)' }}
    >
      <div className="max-w-lg w-full bg-[#111317] border border-[#2e333d] rounded p-6 sm:p-8 shadow-2xl">
        <div className="text-xs font-mono-tabular tracking-[0.2em] text-[#9e2a2b] mb-2">
          OCTOBER 17 · GREYFEN RIDGE, OREGON
        </div>
        <h2 className="font-display text-2xl sm:text-3xl text-[#f0ede6] tracking-wider mb-4">
          FOURTEEN YEARS IN THE STATIC
        </h2>
        <div className="space-y-3 text-sm text-[#c2bdb2] leading-relaxed mb-6">
          <p>
            Yesterday, an unmarked ferric cassette arrived at Mara Venn’s apartment. Through heavy rain and magnetic hiss, her younger brother <strong className="text-[#ece8df]">Theo</strong>—missing since the Greyfen storm fourteen years ago—whispered a single warning:
          </p>
          <p className="italic text-[#e6d5b8] pl-3">
            “Greyfen Emergency Relay Station. Something in the tower learned how we talk. Don’t answer if you hear my voice.”
          </p>
          <p>
            The iron gate has locked behind you. Your metal flashlight is at full charge. Step onto the porch, recover Theo’s tape, restore basement power, and shut down the signal.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full min-h-[48px] bg-[#9e2a2b] hover:bg-[#b53334] text-[#f5f2eb] font-semibold text-sm tracking-[0.16em] rounded transition-colors cursor-pointer"
        >
          STEP ONTO THE PORCH
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. RADIO FREQUENCY TUNING WORKBENCH MODAL (REF_03 & REF_19)
 * ========================================================================== */
interface RadioTuningModalProps {
  hasFreqNote: boolean;
  alreadyDecoded: boolean;
  onSuccessLock: () => void;
  onClose: () => void;
}

export const RadioTuningModal: React.FC<RadioTuningModalProps> = ({
  hasFreqNote,
  alreadyDecoded,
  onSuccessLock,
  onClose,
}) => {
  const [freq, setFreq] = useState<number>(alreadyDecoded ? 704.52 : 684.2);
  const [phase, setPhase] = useState<number>(alreadyDecoded ? 76 : 32);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tuning = evaluateRadioTuning(freq, phase);

  useEffect(() => {
    let animId = 0;
    let t = 0;
    const renderScope = () => {
      t += 0.06;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.fillStyle = '#0a1426';
          ctx.fillRect(0, 0, w, h);

          // Graticule grid
          ctx.strokeStyle = 'rgba(70, 130, 180, 0.2)';
          ctx.lineWidth = 1;
          for (let x = 0; x < w; x += 32) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = 0; y < h; y += 28) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Target ghost wave (704.52 kHz, 76 deg)
          ctx.strokeStyle = 'rgba(92, 214, 165, 0.35)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = 0; x < w; x++) {
            const rad = (x / w) * Math.PI * 6 + t;
            const y = h / 2 + Math.sin(rad + (76 * Math.PI) / 180) * 36 * Math.cos(rad * 0.5);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Player active carrier wave
          ctx.strokeStyle = tuning.isLocked ? '#4af2a1' : '#7ae0ff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          const freqRatio = freq / 704.52;
          const noiseAmp = (100 - tuning.clarity) * 0.22;
          for (let x = 0; x < w; x++) {
            const rad = (x / w) * Math.PI * 6 * freqRatio + t;
            const jitter = (Math.sin(x * 13 + t * 9) * noiseAmp) / 10;
            const y =
              h / 2 +
              Math.sin(rad + (phase * Math.PI) / 180) * 36 * Math.cos(rad * 0.5) +
              jitter;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      animId = requestAnimationFrame(renderScope);
    };
    animId = requestAnimationFrame(renderScope);
    return () => cancelAnimationFrame(animId);
  }, [freq, phase, tuning.clarity, tuning.isLocked]);

  const adjustFreq = (delta: number) => {
    setFreq((prev) => {
      const next = Math.round(Math.max(660, Math.min(750, prev + delta)) * 100) / 100;
      const evalRes = evaluateRadioTuning(next, phase);
      audioManager.playRadioTone(evalRes.clarity);
      return next;
    });
  };

  const adjustPhase = (delta: number) => {
    setPhase((prev) => {
      const next = Math.max(0, Math.min(360, prev + delta));
      const evalRes = evaluateRadioTuning(freq, next);
      audioManager.playRadioTone(evalRes.clarity);
      return next;
    });
  };

  const applyCalibrationNote = () => {
    setFreq(704.52);
    setPhase(76);
    audioManager.playRadioTone(100);
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-6 pointer-events-auto"
      style={{ backgroundColor: 'rgba(6, 8, 10, 0.9)' }}
    >
      <div className="max-w-2xl w-full bg-[#131718] border border-[#38423b] rounded p-4 sm:p-6 shadow-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#29302b] pb-3 mb-4">
          <div>
            <div className="text-[11px] font-mono-tabular tracking-[0.18em] text-[#8fa893]">
              GREYFEN TRANSCEIVER BENCH · DEMODULATOR UNIT
            </div>
            <h2 className="font-display text-lg sm:text-xl text-[#ece8df]">
              EMERGENCY RADIO FREQUENCY TUNING
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-3.5 py-1.5 bg-[#1d2224] hover:bg-[#293033] text-xs font-mono-tabular text-[#c8c3b8] rounded border border-[#383e42] cursor-pointer"
          >
            CLOSE
          </button>
        </div>

        {/* Oscilloscope CRT Display + Clue Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-4">
          <div className="sm:col-span-7 bg-[#080d14] border border-[#2c3b4d] rounded p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono-tabular mb-2">
              <span className="text-[#7ae0ff]">CARRIER: {freq.toFixed(2)} kHz</span>
              <span className="text-[#7ae0ff]">PHASE: Ø {phase}°</span>
              <span className={tuning.isLocked ? 'text-[#4af2a1] font-semibold' : 'text-[#d99b4e]'}>
                CLARITY: {tuning.clarity}%
              </span>
            </div>
            <canvas
              ref={canvasRef}
              width={320}
              height={120}
              className="w-full h-28 rounded border border-[#1d2c40]"
            />
            <div className="mt-2 text-[11px] font-mono-tabular text-[#94a8b8]">
              {tuning.isLocked
                ? 'SIGNAL LOCKED — VOICE TRANSCRIPT: "THEO: DO NOT ANSWER IT. BULKHEAD UNSEALED."'
                : 'STATIC INTERFERENCE — ALIGN WAVEFORM TO 704.52 KHZ / Ø 76°'}
            </div>
          </div>

          {/*Pinned Calibration Note (REF_19) */}
          <div className="sm:col-span-5 bg-[#d9d0be] text-[#1c1a17] rounded p-3.5 border border-[#a69b86] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#595246] border-b border-[#b5aa94] pb-1 mb-2">
                {hasFreqNote ? 'RECOVERED NOTE (REF_19)' : 'BENCH CALIBRATION STICKER'}
              </div>
              <div className="font-mono-tabular text-xl font-bold tracking-wider text-[#141311] mb-2">
                704.52 kHz
              </div>
              <div className="space-y-1 font-mono-tabular text-xs text-[#2e2a24]">
                <div className="flex justify-between font-semibold bg-[#c7bca6] px-1.5 py-0.5 rounded">
                  <span>~ 68.43 Hz</span>
                  <span>Ø 76° (LOCK)</span>
                </div>
                <div className="flex justify-between px-1.5 opacity-75">
                  <span>~ 1510.94 Hz</span>
                  <span>Ø 277°</span>
                </div>
                <div className="flex justify-between px-1.5 opacity-75">
                  <span>~ 321.18 Hz</span>
                  <span>Ø 2°</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={applyCalibrationNote}
              className="mt-3 min-h-[44px] w-full bg-[#2b362e] hover:bg-[#37473b] text-[#f0ede6] text-xs font-mono-tabular tracking-wider rounded py-2 px-3 transition-colors cursor-pointer"
            >
              DIAL 704.52 KHZ / Ø 76°
            </button>
          </div>
        </div>

        {/* Manual Fine/Coarse Tuning Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="bg-[#181d1f] border border-[#2c3438] rounded p-3">
            <div className="text-xs font-mono-tabular text-[#a8b0b5] mb-2">
              CARRIER FREQUENCY (TARGET: 704.52 kHz)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustFreq(-5)}
                className="min-h-[44px] flex-1 bg-[#232a2e] hover:bg-[#2f383d] text-xs font-mono-tabular rounded cursor-pointer"
              >
                -5.0
              </button>
              <button
                type="button"
                onClick={() => adjustFreq(-0.25)}
                className="min-h-[44px] flex-1 bg-[#232a2e] hover:bg-[#2f383d] text-xs font-mono-tabular rounded cursor-pointer"
              >
                -0.25
              </button>
              <button
                type="button"
                onClick={() => adjustFreq(0.25)}
                className="min-h-[44px] flex-1 bg-[#232a2e] hover:bg-[#2f383d] text-xs font-mono-tabular rounded cursor-pointer"
              >
                +0.25
              </button>
              <button
                type="button"
                onClick={() => adjustFreq(5)}
                className="min-h-[44px] flex-1 bg-[#232a2e] hover:bg-[#2f383d] text-xs font-mono-tabular rounded cursor-pointer"
              >
                +5.0
              </button>
            </div>
          </div>

          <div className="bg-[#181d1f] border border-[#2c3438] rounded p-3">
            <div className="text-xs font-mono-tabular text-[#a8b0b5] mb-2">
              DEMODULATOR PHASE (TARGET: Ø 76°)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustPhase(-10)}
                className="min-h-[44px] flex-1 bg-[#232a2e] hover:bg-[#2f383d] text-xs font-mono-tabular rounded cursor-pointer"
              >
                -10°
              </button>
              <button
                type="button"
                onClick={() => adjustPhase(-2)}
                className="min-h-[44px] flex-1 bg-[#232a2e] hover:bg-[#2f383d] text-xs font-mono-tabular rounded cursor-pointer"
              >
                -2°
              </button>
              <button
                type="button"
                onClick={() => adjustPhase(2)}
                className="min-h-[44px] flex-1 bg-[#232a2e] hover:bg-[#2f383d] text-xs font-mono-tabular rounded cursor-pointer"
              >
                +2°
              </button>
              <button
                type="button"
                onClick={() => adjustPhase(10)}
                className="min-h-[44px] flex-1 bg-[#232a2e] hover:bg-[#2f383d] text-xs font-mono-tabular rounded cursor-pointer"
              >
                +10°
              </button>
            </div>
          </div>
        </div>

        {/* Confirm Lock Button */}
        <button
          type="button"
          disabled={!tuning.isLocked}
          onClick={onSuccessLock}
          className={`w-full min-h-[48px] rounded font-semibold text-sm tracking-[0.14em] transition-colors ${
            tuning.isLocked
              ? 'bg-[#2b7a4b] hover:bg-[#34915a] text-[#f2faf5] cursor-pointer'
              : 'bg-[#1e2326] text-[#6c7378] border border-[#2c3236] cursor-not-allowed'
          }`}
        >
          {tuning.isLocked
            ? 'DECODE TRANSMISSION & UNSEAL LISTENING CHAMBER'
            : 'TUNE TO 704.52 KHZ / Ø 76° TO LOCK SIGNAL'}
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. LORE / CLUE / ARCHIVE MODAL
 * ========================================================================== */
interface LoreArchiveModalProps {
  progress: MissionProgressState;
  initialDocId?: string | null;
  onClose: () => void;
}

export const LoreArchiveModal: React.FC<LoreArchiveModalProps> = ({
  progress,
  initialDocId,
  onClose,
}) => {
  const collectedDocs = Object.values(LORE_DOCUMENTS).filter((doc) =>
    progress.collectedItems.includes(doc.id),
  );
  const [selectedId, setSelectedId] = useState<string>(
    initialDocId && LORE_DOCUMENTS[initialDocId]
      ? initialDocId
      : collectedDocs[0]?.id || 'theo_cassette_1',
  );

  const activeDoc: LoreDocument | undefined = LORE_DOCUMENTS[selectedId] || collectedDocs[0];

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-6 pointer-events-auto"
      style={{ backgroundColor: 'rgba(6, 7, 9, 0.9)' }}
    >
      <div className="max-w-3xl w-full bg-[#111317] border border-[#2f343d] rounded p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#252930] pb-3 mb-4">
          <div>
            <div className="text-[11px] font-mono-tabular tracking-[0.16em] text-[#9a958b]">
              EVIDENCE & RECORDINGS LOG · MISSION 0{MISSION_INFO[progress.mission].number}/07
            </div>
            <h2 className="font-display text-lg sm:text-xl text-[#f0ede6]">
              RECOVERED TAPES, CLUES & EQUIPMENT
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-1.5 bg-[#1c2026] hover:bg-[#282d36] border border-[#383e4a] rounded text-xs font-mono-tabular text-[#e2dfd7] cursor-pointer"
          >
            RESUME
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column: Collected Tapes & Clues List + Carried Equipment */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <div className="text-xs font-mono-tabular text-[#8e897f] mb-2">
                STORY RECORDINGS & CLUES ({collectedDocs.length}/6)
              </div>
              {collectedDocs.length === 0 ? (
                <div className="text-xs text-[#6e6a63] bg-[#16191e] p-3 rounded border border-[#242830]">
                  No recordings collected yet. Inspect the Reception Desk in the Entry Corridor.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {collectedDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(doc.id);
                        audioManager.playVoiceSynthCue(false);
                      }}
                      className={`w-full min-h-[44px] text-left px-3 py-2 rounded border text-xs transition-colors cursor-pointer ${
                        activeDoc?.id === doc.id
                          ? 'bg-[#261b1c] border-[#9e2a2b] text-[#f5efe6]'
                          : 'bg-[#16191e] border-[#262b33] text-[#b8b3a8] hover:bg-[#1d2128]'
                      }`}
                    >
                      <div className="font-semibold truncate">{doc.title}</div>
                      <div className="text-[10px] font-mono-tabular text-[#8c877d]">{doc.subtitle}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-mono-tabular text-[#8e897f] mb-2">
                COLLECTED KEYS & TOOLS
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs text-[#c7c2b8]">
                {progress.inventory.map((itemId: ItemId) => (
                  <span
                    key={itemId}
                    className="px-2.5 py-1 bg-[#171a20] border border-[#2c313b] rounded font-mono-tabular text-[11px]"
                  >
                    {ITEM_METADATA[itemId]?.name || itemId}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Active Document Reader */}
          <div className="md:col-span-7 bg-[#16181d] border border-[#2a2f38] rounded p-4 sm:p-5 flex flex-col justify-between">
            {activeDoc && progress.collectedItems.includes(activeDoc.id) ? (
              <div>
                <div className="text-[11px] font-mono-tabular text-[#9e2a2b] tracking-wider mb-1">
                  {activeDoc.subtitle}
                </div>
                <h3 className="font-display text-lg text-[#f2efe9] mb-3">{activeDoc.title}</h3>
                <div className="space-y-3 text-xs sm:text-sm text-[#d4cfc4] leading-relaxed">
                  {activeDoc.body.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#7c7870] my-auto text-center py-8">
                Select a recovered cassette or document to inspect its contents.
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-[#252a33] flex items-center justify-between text-[11px] font-mono-tabular text-[#8c877d]">
              <span>CURRENT HINT: {MISSION_INFO[progress.mission].hint}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. MASTER SIGNAL CONSOLE FINAL DECISION MODAL (REF_16)
 * ========================================================================== */
interface SignalChoiceModalProps {
  onShutDown: () => void;
  onAnswerVoice: () => void;
  onClose: () => void;
}

export const SignalChoiceModal: React.FC<SignalChoiceModalProps> = ({
  onShutDown,
  onAnswerVoice,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-auto"
      style={{ backgroundColor: 'rgba(6, 7, 9, 0.92)' }}
    >
      <div className="max-w-xl w-full bg-[#121418] border border-[#3a2c2c] rounded p-6 shadow-2xl">
        <div className="text-xs font-mono-tabular tracking-[0.18em] text-[#d9534f] mb-1">
          MASTER RELAY TRANSMITTER · SERVICE PLATE REMOVED
        </div>
        <h2 className="font-display text-2xl text-[#f2efe9] mb-3">
          THE VOICE ON THE CARRIER
        </h2>
        <p className="text-sm text-[#c7c2b8] leading-relaxed mb-4">
          With the service plate unscrewed, the exposed breaker rods hum violently. Through the studio monitor speaker, a trembling voice that sounds identical to <strong className="text-[#f0ede6]">fourteen-year-old Theo</strong> pleads:
        </p>
        <div className="bg-[#1a1415] border border-[#4a2526] rounded p-3.5 mb-5 text-xs sm:text-sm italic text-[#edd8d8]">
          “Mara, please don’t cut the power! If you sever the carrier, I’ll be trapped in the dark forever. Press the mic switch and answer me—just tell me you’re here!”
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onShutDown}
            className="w-full min-h-[50px] px-5 py-3 bg-[#2b6e46] hover:bg-[#348555] text-[#f2faf5] font-semibold text-xs sm:text-sm tracking-[0.12em] rounded transition-colors cursor-pointer"
          >
            PULL BREAKER & SHUT DOWN THE SIGNAL (HEED THEO’S TAPE WARNING)
          </button>

          <button
            type="button"
            onClick={onAnswerVoice}
            className="w-full min-h-[50px] px-5 py-3 bg-[#7a2224] hover:bg-[#94292b] text-[#f7e6e6] font-semibold text-xs sm:text-sm tracking-[0.12em] rounded transition-colors cursor-pointer"
          >
            KEY THE MICROPHONE & ANSWER THE VOICE (“THEO, I’M HERE”)
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] text-xs font-mono-tabular text-[#8c877d] hover:text-[#cfcabc] cursor-pointer"
          >
            STEP BACK FROM CONSOLE
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 5. PAUSE, SETTINGS, HOW TO PLAY & ENDING OUTCOME MODALS
 * ========================================================================== */
interface PauseSettingsModalProps {
  mode: 'pause' | 'settings' | 'howto';
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onSwitchTab: (tab: 'pause' | 'settings' | 'howto') => void;
}

export const PauseSettingsModal: React.FC<PauseSettingsModalProps> = ({
  mode,
  settings,
  onUpdateSettings,
  onResume,
  onRestart,
  onReturnTitle,
  onSwitchTab,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-auto"
      style={{ backgroundColor: 'rgba(6, 7, 9, 0.9)' }}
    >
      <div className="max-w-lg w-full bg-[#111317] border border-[#2f343d] rounded p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Segmented Modal Header */}
        <div className="flex items-center justify-between border-b border-[#252930] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSwitchTab('pause')}
              className={`min-h-[40px] px-3 py-1.5 rounded text-xs font-mono-tabular cursor-pointer ${
                mode === 'pause' ? 'bg-[#9e2a2b] text-white' : 'text-[#9e998e] hover:bg-[#1b1f26]'
              }`}
            >
              PAUSED
            </button>
            <button
              type="button"
              onClick={() => onSwitchTab('settings')}
              className={`min-h-[40px] px-3 py-1.5 rounded text-xs font-mono-tabular cursor-pointer ${
                mode === 'settings' ? 'bg-[#9e2a2b] text-white' : 'text-[#9e998e] hover:bg-[#1b1f26]'
              }`}
            >
              SETTINGS
            </button>
            <button
              type="button"
              onClick={() => onSwitchTab('howto')}
              className={`min-h-[40px] px-3 py-1.5 rounded text-xs font-mono-tabular cursor-pointer ${
                mode === 'howto' ? 'bg-[#9e2a2b] text-white' : 'text-[#9e998e] hover:bg-[#1b1f26]'
              }`}
            >
              HOW TO PLAY
            </button>
          </div>
          <button
            type="button"
            onClick={onResume}
            className="min-h-[40px] px-3 py-1 text-xs font-mono-tabular text-[#c7c2b8] hover:text-white cursor-pointer"
          >
            ESC / CLOSE
          </button>
        </div>

        {mode === 'pause' && (
          <div className="space-y-3">
            <p className="text-xs text-[#9e998e] mb-4">
              Progress and settings are saved automatically on this device.
            </p>
            <button
              type="button"
              onClick={onResume}
              className="w-full min-h-[48px] bg-[#9e2a2b] hover:bg-[#b53334] text-[#f5f2eb] font-semibold text-sm tracking-[0.14em] rounded cursor-pointer"
            >
              RESUME GAME
            </button>
            <button
              type="button"
              onClick={() => onSwitchTab('settings')}
              className="w-full min-h-[46px] bg-[#181c22] hover:bg-[#222730] border border-[#2e343e] text-[#e2dfd7] text-xs font-mono-tabular tracking-wider rounded cursor-pointer"
            >
              CONTROLS & AUDIO SETTINGS
            </button>
            <button
              type="button"
              onClick={() => onSwitchTab('howto')}
              className="w-full min-h-[46px] bg-[#181c22] hover:bg-[#222730] border border-[#2e343e] text-[#e2dfd7] text-xs font-mono-tabular tracking-wider rounded cursor-pointer"
            >
              SURVIVAL GUIDE & CONTROLS
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="w-full min-h-[46px] bg-[#181c22] hover:bg-[#222730] border border-[#2e343e] text-[#d98282] text-xs font-mono-tabular tracking-wider rounded cursor-pointer"
            >
              RESTART STATION RUN
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full min-h-[46px] bg-[#14171c] hover:bg-[#1d2128] border border-[#262b33] text-[#9e998e] text-xs font-mono-tabular tracking-wider rounded cursor-pointer"
            >
              RETURN TO TITLE SCREEN
            </button>
          </div>
        )}

        {mode === 'settings' && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="flex justify-between text-[#d4cfc4] font-mono-tabular mb-1">
                <span>LOOK SENSITIVITY</span>
                <span>{settings.lookSensitivity.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.1"
                value={settings.lookSensitivity}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, lookSensitivity: parseFloat(e.target.value) })
                }
                className="w-full accent-[#9e2a2b]"
              />
            </div>

            <div>
              <label className="flex justify-between text-[#d4cfc4] font-mono-tabular mb-1">
                <span>MASTER VOLUME</span>
                <span>{Math.round(settings.masterVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  audioManager.setVolume(vol);
                  onUpdateSettings({ ...settings, masterVolume: vol });
                }}
                className="w-full accent-[#9e2a2b]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, leftHanded: !settings.leftHanded })}
                className="min-h-[44px] px-3 py-2 rounded border border-[#2e343e] bg-[#171a20] text-left font-mono-tabular text-xs flex justify-between items-center cursor-pointer"
              >
                <span>LEFT-HANDED HUD</span>
                <span className={settings.leftHanded ? 'text-[#4af2a1]' : 'text-[#7c7870]'}>
                  {settings.leftHanded ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, reducedShake: !settings.reducedShake })
                }
                className="min-h-[44px] px-3 py-2 rounded border border-[#2e343e] bg-[#171a20] text-left font-mono-tabular text-xs flex justify-between items-center cursor-pointer"
              >
                <span>REDUCED SHAKE</span>
                <span className={settings.reducedShake ? 'text-[#4af2a1]' : 'text-[#7c7870]'}>
                  {settings.reducedShake ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, subtitles: !settings.subtitles })}
                className="min-h-[44px] px-3 py-2 rounded border border-[#2e343e] bg-[#171a20] text-left font-mono-tabular text-xs flex justify-between items-center cursor-pointer"
              >
                <span>SUBTITLES</span>
                <span className={settings.subtitles ? 'text-[#4af2a1]' : 'text-[#7c7870]'}>
                  {settings.subtitles ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const order: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
                  const nextQ = order[(order.indexOf(settings.quality) + 1) % order.length];
                  onUpdateSettings({ ...settings, quality: nextQ });
                }}
                className="min-h-[44px] px-3 py-2 rounded border border-[#2e343e] bg-[#171a20] text-left font-mono-tabular text-xs flex justify-between items-center cursor-pointer"
              >
                <span>GRAPHICS QUALITY</span>
                <span className="text-[#e6c229] uppercase">{settings.quality}</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'howto' && (
          <div className="space-y-3 text-xs sm:text-sm text-[#c7c2b8] leading-relaxed">
            <div>
              <strong className="text-[#f0ede6] block mb-0.5">1. ANDROID TOUCH & DESKTOP CONTROLS</strong>
              Use the bottom-left thumb joystick to walk (push fully forward to sprint) or <span className="font-mono-tabular">WASD</span>. Swipe anywhere on the right half of the screen to look around. Context-sensitive action buttons (<span className="font-mono-tabular">PICK UP, OPEN, HIDE, TUNE</span>) appear near your right thumb when facing an object in range.
            </div>
            <div>
              <strong className="text-[#f0ede6] block mb-0.5">2. SOUND, STEALTH & DECOYS</strong>
              The Receiver hunts by sight and acoustic vibration. Sprinting, creaky doors, and restoring power create loud noise ripples. Toggle <span className="font-mono-tabular">CROUCH</span> to move quietly, turn off your flashlight when hiding, and throw <span className="font-mono-tabular">Tins of Metal Bolts</span> to lure it into another room.
            </div>
            <div>
              <strong className="text-[#f0ede6] block mb-0.5">3. HIDING SPOT MEMORY & VOICE MIMICRY</strong>
              Steel lockers conceal you if you enter out of sight, but The Receiver remembers if you repeatedly hide in the same locker (3+ times). Do not trust distorted voices calling from the dark—check subtitles for static clicks.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 6. OUTCOME / ENDING MODAL (3 STORY ENDINGS + DEFEAT)
 * ========================================================================== */
interface EndingModalProps {
  ending: EndingType;
  progress: MissionProgressState;
  onPlayAgain: () => void;
  onReturnTitle: () => void;
}

const ENDING_CONTENT: Record<
  EndingType,
  { badge: string; title: string; summary: string; detail: string }
> = {
  THE_SILENCE: {
    badge: 'ENDING 01 / 03 · TRUE ENDING',
    title: 'THE SILENCE',
    summary:
      'Mara severed the carrier breakers inside the lower listening chamber and escaped through the perimeter gate.',
    detail:
      'Behind her, the red beacon atop Greyfen Relay Tower finally went dark. For the first time in fourteen years, the static over the valley fell completely silent—and whatever wore her brother’s voice starved in the dead air.',
  },
  THE_ANSWER: {
    badge: 'ENDING 02 / 03 · BAD ENDING',
    title: 'THE ANSWER',
    summary:
      'Unable to bear the thought of leaving Theo in the dark, Mara keyed the transmitter microphone and spoke his name.',
    detail:
      'The oscilloscope flatlined and then surged with a new, pristine waveform—Mara’s own voice. Even as she stumbled out the perimeter gate, the relay tower began broadcasting her voice across the ridge, calling the next search party into Greyfen.',
  },
  THE_LAST_RECORDING: {
    badge: 'ENDING 03 / 03 · SECRET ARCHIVE ENDING',
    title: 'THE LAST RECORDING',
    summary:
      'With every operator tape, the diary, and the Venn family photograph recovered, Mara shut down the array and escaped with the complete evidence.',
    detail:
      'In the quiet dawn outside the perimeter fence, Mara looked at the faded photograph of Theo before the storm. The creature’s counterfeit echoes were gone, leaving only the truth of who her brother really was.',
  },
  DEFEAT: {
    badge: 'SIGNAL LOST · CAUGHT IN THE STATION',
    title: 'CAUGHT BY THE RECEIVER',
    summary:
      'Tall silhouette of torn acoustic insulation and copper wire cornered Mara in the dark.',
    detail:
      'Tip: Toggle CROUCH to muffle footsteps, switch off your flashlight when The Receiver searches nearby, throw a Tin of Metal Bolts to draw it away, and avoid using the exact same locker more than twice.',
  },
};

export const EndingModal: React.FC<EndingModalProps> = ({
  ending,
  progress,
  onPlayAgain,
  onReturnTitle,
}) => {
  const info = ENDING_CONTENT[ending];
  const mins = Math.floor(progress.elapsedSeconds / 60);
  const secs = Math.floor(progress.elapsedSeconds % 60);

  const loreFound = progress.collectedItems.filter((id) =>
    ['theo_cassette_1', 'cassette_operator_2', 'freq_note', 'operator_diary', 'theo_cassette_final', 'family_photo'].includes(id),
  ).length;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-auto"
      style={{ backgroundColor: 'rgba(6, 7, 9, 0.94)' }}
    >
      <div className="max-w-xl w-full bg-[#111317] border border-[#362c2e] rounded p-6 sm:p-8 shadow-2xl">
        <div
          className={`text-xs font-mono-tabular tracking-[0.18em] mb-1 ${
            ending === 'DEFEAT' || ending === 'THE_ANSWER' ? 'text-[#d9534f]' : 'text-[#5cd6a5]'
          }`}
        >
          {info.badge}
        </div>
        <h2 className="font-display text-2xl sm:text-3xl text-[#f2efe9] mb-3">{info.title}</h2>
        <p className="text-sm text-[#e2dfd7] font-medium mb-2 leading-relaxed">{info.summary}</p>
        <p className="text-xs sm:text-sm text-[#a8a399] mb-6 leading-relaxed">{info.detail}</p>

        {/* Tabular-nums Mastery / Progress Metrics */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="bg-[#171a20] border border-[#282d36] rounded p-3">
            <div className="text-[10px] font-mono-tabular text-[#8c877d]">RUN TIME</div>
            <div className="text-lg font-mono-tabular font-semibold text-[#f0ede6]">
              {mins}:{secs.toString().padStart(2, '0')}
            </div>
          </div>
          <div className="bg-[#171a20] border border-[#282d36] rounded p-3">
            <div className="text-[10px] font-mono-tabular text-[#8c877d]">CLUES & TAPES</div>
            <div className="text-lg font-mono-tabular font-semibold text-[#f0ede6]">
              {loreFound} / 6
            </div>
          </div>
          <div className="bg-[#171a20] border border-[#282d36] rounded p-3">
            <div className="text-[10px] font-mono-tabular text-[#8c877d]">NOISE ALERTS</div>
            <div className="text-lg font-mono-tabular font-semibold text-[#f0ede6]">
              {progress.noiseAlertsTriggered}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onPlayAgain();
            }}
            className="flex-1 min-h-[48px] px-6 py-3 bg-[#9e2a2b] hover:bg-[#b53334] text-[#f5f2eb] font-semibold text-xs sm:text-sm tracking-[0.14em] rounded transition-colors cursor-pointer"
          >
            {ending === 'DEFEAT' ? 'TRY AGAIN' : 'PLAY AGAIN'}
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="min-h-[48px] px-5 py-3 bg-[#181c22] hover:bg-[#232830] border border-[#2e343e] text-[#c7c2b8] text-xs font-mono-tabular tracking-wider rounded cursor-pointer"
          >
            TITLE MENU
          </button>
        </div>
      </div>
    </div>
  );
};
