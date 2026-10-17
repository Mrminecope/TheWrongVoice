export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type MissionId =
  | '1_ENTER_STATION'
  | '2_RESTORE_POWER'
  | '3_ESCAPE_HUNT'
  | '4_DECODE_VOICES'
  | '5_DISCOVER_TRUTH'
  | '6_SHUT_DOWN_SIGNAL'
  | '7_ESCAPE';

export type CreatureState =
  | 'PATROL'
  | 'INVESTIGATE_SOUND'
  | 'SEARCH_LAST_KNOWN_POSITION'
  | 'CHASE_VISIBLE_PLAYER'
  | 'CHECK_HIDING_SPOTS'
  | 'RETURN_TO_PATROL';

export type ItemId =
  | 'flashlight'
  | 'theo_cassette_1'
  | 'glass_fuse'
  | 'maintenance_key'
  | 'freq_note'
  | 'listening_key'
  | 'operator_diary'
  | 'theo_cassette_final'
  | 'family_photo'
  | 'screwdriver'
  | 'exit_key'
  | 'spare_batteries_1'
  | 'spare_batteries_2'
  | 'noise_decoy_1'
  | 'noise_decoy_2'
  | 'cassette_operator_2';

export type InteractVerb =
  | 'PICK UP'
  | 'OPEN'
  | 'CLOSE'
  | 'UNLOCK'
  | 'HIDE'
  | 'EXIT'
  | 'INSERT FUSE'
  | 'TUNE'
  | 'EXAMINE'
  | 'USE SCREWDRIVER'
  | 'SHUT DOWN'
  | 'ESCAPE';

export type EndingType =
  | 'THE_SILENCE'
  | 'THE_ANSWER'
  | 'THE_LAST_RECORDING'
  | 'DEFEAT';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface WallBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height?: number;
  material?: 'concrete' | 'wood' | 'metal' | 'fence';
}

export interface DoorDef {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  axis: 'x' | 'z'; // 'x' means door spans along X axis (blocks Z movement), 'z' means spans along Z axis
  isOpen: boolean;
  lockedByItem?: ItemId;
  requiresPower?: boolean;
  requiresTuning?: boolean;
  creaky?: boolean;
}

export interface HidingSpotDef {
  id: string;
  name: string;
  x: number;
  z: number;
  standX: number;
  standZ: number;
  facingYaw: number;
  roomId: string;
}

export interface InteractableDef {
  id: string;
  name: string;
  type:
    | 'pickup'
    | 'door'
    | 'hiding_spot'
    | 'fuse_box'
    | 'radio_workbench'
    | 'shutdown_console'
    | 'exit_gate'
    | 'lore';
  x: number;
  y: number;
  z: number;
  radius: number;
  itemId?: ItemId;
  doorId?: string;
  hidingSpotId?: string;
  refCode?: string;
  description?: string;
}

export interface NoiseEvent {
  x: number;
  z: number;
  loudness: number; // 0 to 100
  source: 'footstep' | 'sprint' | 'door' | 'fuse' | 'decoy' | 'alarm' | 'radio';
  timestamp: number;
}

export interface SubtitleCue {
  id: string;
  speaker: string;
  text: string;
  isImitation?: boolean;
  durationMs: number;
}

export interface LoreDocument {
  id: ItemId;
  title: string;
  refCode: string;
  subtitle: string;
  body: string[];
  audioTranscript?: string;
}

export interface GameSettings {
  lookSensitivity: number; // 0.4 to 2.0
  leftHanded: boolean;
  reducedShake: boolean;
  subtitles: boolean;
  masterVolume: number; // 0 to 1
  quality: 'low' | 'medium' | 'high';
}

export interface MissionProgressState {
  mission: MissionId;
  inventory: ItemId[];
  flashlightOn: boolean;
  battery: number; // 0 to 100
  decoyCount: number;
  powerRestored: boolean;
  huntSurvived: boolean;
  radioDecoded: boolean;
  diaryExamined: boolean;
  theoTapeFound: boolean;
  panelUnscrewed: boolean;
  signalShutDown: boolean;
  answeredVoice: boolean;
  unlockedDoors: string[];
  openDoors: string[];
  collectedItems: ItemId[];
  hidingSpotUsage: Record<string, number>;
  noiseAlertsTriggered: number;
  elapsedSeconds: number;
}

export interface GameSaveData {
  version: number;
  savedAt: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  progress: MissionProgressState;
}
