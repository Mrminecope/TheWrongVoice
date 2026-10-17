import React from 'react';

interface TitleScreenProps {
  hasSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSave,
  onNewGame,
  onContinue,
  onOpenSettings,
  onOpenHowToPlay,
}) => {
  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 md:p-14 pointer-events-none"
      style={{
        background:
          'linear-gradient(90deg, rgba(6,7,9,0.92) 0%, rgba(6,7,9,0.72) 48%, rgba(6,7,9,0.18) 100%)',
      }}
    >
      {/* Top atmospheric station designation */}
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.22em] text-[#9a968e] font-mono-tabular">
          GREYFEN EMERGENCY RELAY STATION · 704.52 KHZ
        </div>
        <div className="text-xs text-[#7c7870] font-mono-tabular hidden sm:block">
          SINGLE-PLAYER SURVIVAL HORROR
        </div>
      </div>

      {/* Asymmetric Left-Third Title Lockup & Menu Actions (leaving >40% right viewport open for live 3D Relay Tower pan) */}
      <div className="max-w-xl my-auto pointer-events-auto">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="mb-5">
          <svg
            viewBox="0 0 560 130"
            className="w-full max-w-[480px] h-auto overflow-visible"
            role="img"
            aria-label="THE WRONG VOICE"
          >
            <defs>
              <linearGradient id="boneTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f2efe9" />
                <stop offset="65%" stopColor="#c9c3b8" />
                <stop offset="100%" stopColor="#7d776d" />
              </linearGradient>
            </defs>
            {/* Subtle carrier wave line with acoustic distortion spike */}
            <path
              d="M 0 18 L 160 18 L 172 8 L 180 29 L 190 4 L 200 32 L 210 14 L 222 18 L 540 18"
              fill="none"
              stroke="#9e2a2b"
              strokeWidth="1.75"
              opacity="0.85"
            />
            <circle cx="190" cy="4" r="3" fill="#d9383a" />

            {/* Main Display Title */}
            <text
              x="0"
              y="78"
              fill="url(#boneTextGrad)"
              fontFamily="Cinzel, Georgia, serif"
              fontWeight="700"
              fontSize="50"
              letterSpacing="5"
            >
              THE WRONG VOICE
            </text>

            {/* Distressed echo shadow text */}
            <text
              x="2"
              y="81"
              fill="none"
              stroke="#9e2a2b"
              strokeWidth="0.6"
              fontFamily="Cinzel, Georgia, serif"
              fontWeight="700"
              fontSize="50"
              letterSpacing="5"
              opacity="0.45"
            >
              THE WRONG VOICE
            </text>

            {/* Tagline */}
            <text
              x="2"
              y="114"
              fill="#b5afa4"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="500"
              fontSize="15"
              letterSpacing="2.4"
            >
              “IT KNOWS YOUR VOICE. IT WANTS YOU TO ANSWER.”
            </text>
          </svg>
        </div>

        <p className="text-sm text-[#a6a198] max-w-md mb-7 leading-relaxed">
          Fourteen years after her brother Theo vanished in the Greyfen storm, Mara Venn receives a cassette tape recorded from inside the abandoned relay station.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onNewGame();
            }}
            className="min-h-[48px] px-7 py-3 bg-[#9e2a2b] hover:bg-[#b53234] active:bg-[#7d2021] text-[#f5f2eb] font-semibold text-sm tracking-[0.14em] rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-lg"
          >
            NEW GAME
          </button>

          {hasSave && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onContinue();
              }}
              className="min-h-[48px] px-6 py-3 bg-[#1c1f24] hover:bg-[#272b32] border border-[#3a3f47] text-[#e2dfd7] font-semibold text-sm tracking-[0.12em] rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              CONTINUE
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            className="min-h-[48px] px-5 py-3 bg-[#14171a] hover:bg-[#1f2429] border border-[#2d3138] text-[#c7c2b8] font-medium text-sm tracking-[0.1em] rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            SETTINGS
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenHowToPlay();
            }}
            className="min-h-[48px] px-5 py-3 bg-[#14171a] hover:bg-[#1f2429] border border-[#2d3138] text-[#c7c2b8] font-medium text-sm tracking-[0.1em] rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            HOW TO PLAY
          </button>
        </div>
      </div>

      {/* Flat borderless inline control hint bar */}
      <div className="text-xs text-[#8c877e] tracking-wide font-mono-tabular">
        WASD / Left Stick Move · Swipe Right / Mouse Look · Push Stick Forward / Shift Sprint · E / Action Button Interact · F Flashlight · C Crouch · Esc Pause
      </div>
    </div>
  );
};
