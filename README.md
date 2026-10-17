# THE WRONG VOICE

> *“It knows your voice. It wants you to answer.”*

An Android-first, landscape 3D first-person psychological survival horror game built with React, TypeScript, Vite, and Three.js/WebGL.

---

## 1. Running & Testing the Project

### Local Development
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in Chrome (desktop or Android mobile browser).
To run the deterministic unit test suite (collision, line-of-sight occlusion, mission progression 1–7, radio frequency tuning math, Creature AI finite-state machine, hiding-spot memory, and endings):
```bash
node --test src/game/rules.test.ts
```

### Testing on an Android Phone
1. Ensure your Android phone is on the same network or open the hosted Cloud Run App URL in Chrome on Android.
2. Rotate the phone to **landscape orientation** (optional "Add to Home Screen" enables fullscreen standalone WebGL mode).
3. Press **NEW GAME** to initialize Web Audio storm & station ambience and begin Mission 1 on the Exterior Porch.

---

## 2. Controls (Android Touch & Desktop)

- **Move / Sprint**: Bottom-left virtual thumb joystick (push fully forward to **Sprint**) or `WASD` / Arrow Keys (`Shift` to Sprint).
- **Look**: Swipe anywhere on the right half of the screen (UI buttons never accidentally rotate the camera) or drag mouse.
- **Contextual Action (`PICK UP`, `OPEN`, `CLOSE`, `UNLOCK`, `HIDE`, `EXIT`, `INSERT FUSE`, `TUNE`, `EXAMINE`, `USE SCREWDRIVER`, `SHUT DOWN`, `ESCAPE`)**: Appears near the right thumb only when looking at an in-range interactive target (with anti-flicker hysteresis). You can also tap visible doors/items directly or press `E` / `Space`.
- **Flashlight (`REF_12`)**: Toggle via the `LIGHT` button (visible while carried) or press `F`.
- **Throw Noise Decoy (`REF_18`)**: Appears when carrying one or more Tins of Metal Bolts (`G` on keyboard).
- **Stealth Crouch**: Toggle via the `CROUCH` button or press `C`.
- **Tapes & Clues Archive / Pause**: Top-right buttons (`J` for Archive, `M` for Mute, `Esc` / `P` for Pause & Settings).

---

## 3. How `REF_01` – `REF_21` Influenced the Design

- **REF_01 (Collapsed wooden corridor)**: Narrow wood-slat entry corridor with angled fallen timber planks and claustrophobic sightlines.
- **REF_02 (Spare batteries)**: Dual amber-and-silver cylindrical AA battery pickups that restore +45% flashlight charge.
- **REF_03 (Emergency radio workbench)**: Olive-drab military transceiver with red LED matrix, gooseneck desk lamp, reel-to-reel recorder, and live oscilloscope CRT tuning puzzle.
- **REF_04 (Abandoned room with bed / utility kitchen)**: Rusted iron bedframe in the West Records Room, open refrigerator and patterned rug in the East Kitchen.
- **REF_05 & REF_07 (Vintage cassettes A & B)**: 3D ferric cassette props with original clean labels and synthesized/subtitled audio logs from Theo and Operator Hale.
- **REF_06 (Antique brass key)**: Unlocks the Lower Listening Chamber bulkhead once the radio carrier is decoded.
- **REF_08 (The Receiver silhouette)**: Original tall (2.45m), gaunt 12-part procedural creature with torn acoustic-insulation ribs, single pale optical receiver lens, elongated limbs, and trailing copper cables.
- **REF_09 (Relay tower in forest)**: Brutalist concrete-and-steel relay tower looming behind the porch amidst pine silhouettes and rain streaks.
- **REF_10 (Operator diary)**: Leather-bound engineering diary on the Listening Chamber desk explaining how to unscrew and shut down the array.
- **REF_11 & REF_12 (First-person flashlight corridor & Metal flashlight)**: Ribbed steel flashlight with blue collar band and red button switch held in lower-right view with gait-synced walk bob.
- **REF_13 (Rusted key)**: Found in the Basement Fuse Room; unlocks the Emergency Radio Workroom.
- **REF_14 (Screwdriver)**: Wooden-handled flathead screwdriver used to unseal the Master Signal Transmitter cover plate.
- **REF_15 (Damaged doorway)**: Hinged wooden/metal doors with solid wall jambs and transom headers.
- **REF_16 (Listening room radio equipment)**: Secret lower chamber with rusted generator winch wheels and the Master Signal Console.
- **REF_17 (Family photograph)**: Sepia portrait of Mara, Theo, and their mother; collecting all tapes + this photo unlocks the secret ending (`THE LAST RECORDING`).
- **REF_18 (Noise decoy tin)**: Tin can filled with metal bolts and hex nuts; throwing it launches a 3D arc that clatters on landing (`loudness: 92`) to lure The Receiver.
- **REF_19 (Radio frequency note)**: Lined calibration sheet specifying `704.52 kHz` and `68.43 Hz · Ø 76°`.
- **REF_20 (Tagged key ring)**: Key with yellow high-voltage hazard tag that unlocks the Exterior Perimeter Gate.
- **REF_21 (Glass fuse)**: 250V glass cartridge fuse with brass caps and diagonal filament required to restore basement power.

---

## 4. Tested Systems Checklist & Current Limitations

- [x] **Connected 8-Zone Station & Collision**: Circle-vs-AABB wall and closed-door collision + line-of-sight ray checks prevent walking or interacting through walls.
- [x] **7 Playable Missions End-to-End**: `1_ENTER_STATION` -> `2_RESTORE_POWER` -> `3_ESCAPE_HUNT` -> `4_DECODE_VOICES` -> `5_DISCOVER_TRUTH` -> `6_SHUT_DOWN_SIGNAL` -> `7_ESCAPE`.
- [x] **The Receiver AI & Behavior Memory**: Finite-state machine (`PATROL`, `INVESTIGATE_SOUND`, `SEARCH_LAST_KNOWN_POSITION`, `CHASE_VISIBLE_PLAYER`, `CHECK_HIDING_SPOTS`, `RETURN_TO_PATROL`) with waypoint pathfinding, acoustic occlusion, distorted vocal mimicry, and hiding-spot overuse memory.
- [x] **Interactive Radio Tuning Workbench**: Live HTML5 canvas oscilloscope where aligning `704.52 kHz` and `Ø 76°` unseals the Listening Chamber.
- [x] **Three Distinct Endings**: `THE SILENCE` (true shutdown ending), `THE ANSWER` (bad ending if answering the microphone), and `THE LAST RECORDING` (secret archive ending when all recordings and `REF_17` Family Photograph are collected).
- **Limitations**: All 3D geometry, surface grime textures, and Web Audio voice/storm effects are procedurally generated in real time to keep the bundle fast, self-contained, and zero-404 on mobile browsers.
