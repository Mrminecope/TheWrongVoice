import type {
  DoorDef,
  HidingSpotDef,
  InteractableDef,
  ItemId,
  LoreDocument,
  MissionId,
  Vec3,
  WallBox,
} from './types.ts';

/**
 * Connected 8-Zone Station Layout for Greyfen Emergency Relay Station:
 * Coordinates (X: West-East, Z: North-South; -Z is deeper into the station, +Z is exterior):
 *
 * 1. Exterior Gate & Entrance Porch: X [-6..6], Z [8..17]
 *    - Player spawns at (0, 14.5) facing North (-Z, yaw = 0) looking directly at the Porch & Relay Tower.
 *    - Exterior Exit Gate is at (-4.2, 15.2) along the fenced perimeter.
 * 2. Entry Corridor (REF_01, REF_11, REF_15): X [-2.2..2.2], Z [-4..8]
 *    - Reception desk at (0.9, 4.8) holds `theo_cassette_1` (REF_05).
 * 3. Abandoned Bedroom / Records Room (West Wing, REF_04): X [-10..-2.2], Z [0..7]
 *    - Door `door_bedroom` at (-2.2, 3.5).
 *    - Contains `glass_fuse` (REF_21), `spare_batteries_1` (REF_02), `cassette_operator_2` (REF_07), Locker #1.
 * 4. Kitchen / Utility Area (East Wing, REF_04): X [2.2..10], Z [0..7]
 *    - Door `door_kitchen` at (2.2, 3.5).
 *    - Contains `freq_note` (REF_19), `noise_decoy_1` (REF_18), `spare_batteries_2` (REF_02), Locker #2.
 * 5. Cross-Hallway & Loopback Corridor: X [-10..10], Z [-4.5..-1.5]
 *    - Connects West Wing, Central Entry Corridor, Basement Fuse Room, Radio Workroom, and East Exit Route.
 * 6. Basement Fuse Room (North-West Wing): X [-10..-3.5], Z [-12..-4.5]
 *    - Door `door_basement` at (-6.5, -4.5).
 *    - Contains `fuse_box`, `maintenance_key` (REF_13), `noise_decoy_2` (REF_18), Locker #3.
 * 7. Emergency Radio Workroom (North-Center Wing, REF_03): X [-3.5..4.5], Z [-12..-4.5]
 *    - Door `door_radio` at (0, -4.5) — locked by `maintenance_key`.
 *    - Contains `radio_workbench` (REF_03), `listening_key` (REF_06), Locker #4.
 * 8. Secret Lower Listening Chamber (North-East Wing, REF_16): X [4.5..11.5], Z [-12..-4.5]
 *    - Door `door_listening` at (4.5, -8.2) — locked until radio is decoded + `listening_key`.
 *    - Door `door_loopback` at (8.0, -4.5) — unlocks from inside/with exit key for loop back to exit route.
 *    - Contains `operator_diary` (REF_10), `theo_cassette_final` (REF_05), `family_photo` (REF_17),
 *      `screwdriver` (REF_14), `shutdown_console` (REF_16), and `exit_key` (REF_20).
 */

export const PLAYER_SPAWN = {
  x: 0,
  z: 9.6,
  yaw: 0, // Facing North (-Z) toward the station entrance porch and Relay Tower
};

export const MISSION_INFO: Record<
  MissionId,
  { number: number; title: string; objective: string; hint: string }
> = {
  '1_ENTER_STATION': {
    number: 1,
    title: 'ENTER THE STATION',
    objective: 'Enter Greyfen Station and recover the first cassette on the reception desk.',
    hint: 'Walk through the porch door ahead and inspect the desk in the Entry Corridor.',
  },
  '2_RESTORE_POWER': {
    number: 2,
    title: 'RESTORE THE POWER',
    objective: 'Find the 250V Glass Fuse in the Records Bedroom and insert it into the Basement Fuse Box.',
    hint: 'Check the West Records Bedroom for the Glass Fuse, then head North-West to the Basement Fuse Room.',
  },
  '3_ESCAPE_HUNT': {
    number: 3,
    title: 'ESCAPE THE HUNT',
    objective: 'Take the Rusted Maintenance Key from the Basement and survive The Receiver’s search (hide or evade).',
    hint: 'Grab the Maintenance Key near the Fuse Box and hide inside a Steel Locker or throw a Noise Decoy.',
  },
  '4_DECODE_VOICES': {
    number: 4,
    title: 'DECODE THE VOICES',
    objective: 'Find the Frequency Note in the Kitchen, unlock the Radio Workroom, and tune the transceiver to 704.52 kHz / 76°.',
    hint: 'Read the Frequency Note in the East Kitchen, unlock the North Radio Workroom, and tune the workbench.',
  },
  '5_DISCOVER_TRUTH': {
    number: 5,
    title: 'DISCOVER THE TRUTH',
    objective: 'Enter the Secret Listening Chamber, read the Operator Diary, and play Theo’s Final Recording.',
    hint: 'Take the Brass Key in the Radio Workroom and open the East door into the Listening Chamber.',
  },
  '6_SHUT_DOWN_SIGNAL': {
    number: 6,
    title: 'SHUT DOWN THE SIGNAL',
    objective: 'Use the Screwdriver on the Master Signal Console and decide whether to Shut Down or Answer the signal.',
    hint: 'Pick up the Screwdriver on the Listening Room rack and interact with the Master Transmitter.',
  },
  '7_ESCAPE': {
    number: 7,
    title: 'ESCAPE GREYFEN',
    objective: 'Take the Tagged Gate Key and reach the Exterior Perimeter Gate before The Receiver catches you.',
    hint: 'Grab the Tagged Key Ring in the Listening Chamber and run South back to the Exterior Porch Gate.',
  },
};

export const LORE_DOCUMENTS: Record<string, LoreDocument> = {
  theo_cassette_1: {
    id: 'theo_cassette_1',
    title: 'CASSETTE TAPE #01 — "MARA, DON’T ANSWER"',
    refCode: 'REF_05',
    subtitle: 'Recorded on ferric tape · Greyfen Intake Desk',
    body: [
      '[Heavy rain and 60Hz transformer hum. A click as the microphone engages.]',
      'THEO: "Mara? If this tape ever makes it out of Greyfen... listen to me carefully. I know it sounds like me calling from the woods. I know it uses the nickname from when we were kids."',
      'THEO: "The relay dish on the ridge didn’t just boost emergency calls during the storm. It caught something else in the static. The operators called it The Receiver."',
      'THEO: "The station power is dead right now, which keeps the lower chamber sealed. If you restore the basement fuse to reach the listening room... it will hear the generator. Whatever happens, don’t answer if you hear my voice."',
    ],
    audioTranscript: 'THEO (TAPE): "Mara... the relay caught something in the storm. Restore the basement fuse, but don’t answer if you hear my voice."',
  },
  cassette_operator_2: {
    id: 'cassette_operator_2',
    title: 'CASSETTE TAPE #02 — OPERATOR LOG 14-B',
    refCode: 'REF_07',
    subtitle: 'Found in Abandoned Records Bunk · Night Shift',
    body: [
      'OPERATOR HALE: "Third night after the mudslide cut the road. We keep receiving distress calls on 704.52 kilohertz from hikers who were confirmed dead in the valley two days ago."',
      'OPERATOR HALE: "Worse—when Vane answered the mic to ask their coordinates, the voice on the speaker shifted mid-sentence into Vane’s own mother. Then we heard footsteps in the ceiling duct."',
      'OPERATOR HALE: "It learns from the magnetic tape reels. The more you speak to it, the sharper the imitation gets. Keep spare tins of bolts nearby—if it enters the corridor, throw metal into the opposite room and get inside a steel locker."',
    ],
    audioTranscript: 'OPERATOR LOG: "Distress calls on 704.52 kHz from the dead... It learns from the reels. Throw metal to decoy it and hide in the lockers."',
  },
  freq_note: {
    id: 'freq_note',
    title: 'HANDWRITTEN FREQUENCY CALIBRATION NOTE',
    refCode: 'REF_19',
    subtitle: 'Recovered from Utility Kitchen Table',
    body: [
      'PRIMARY CARRIER LOCK:  704.52 kHz',
      '────────────────────────────────────',
      '~  68.43 Hz        Ø  76°   [LOCK TARGET]',
      '~ 1510.94 Hz       Ø 277°   [HARMONIC REJECT]',
      '~  321.18 Hz       Ø   2°   [GROUND NULL]',
      '',
      'Operator Note: Tune the main carrier dial to 704.52 kHz and align demodulator phase to 76° to unseal the magnetic lock on the Lower Listening Chamber.',
    ],
    audioTranscript: 'CLUE NOTE: "Carrier frequency 704.52 kHz, Phase angle 76 degrees. Aligning both unlocks the Lower Listening Chamber."',
  },
  operator_diary: {
    id: 'operator_diary',
    title: 'STATION OPERATOR’S LEATHER DIARY',
    refCode: 'REF_10',
    subtitle: 'Chief Engineer R. Mercer · Listening Chamber Desk',
    body: [
      'OCTOBER 14 — "The boy, Theo Venn, broke into the relay room trying to broadcast an SOS for his sister. Before I could stop him, the array locked onto his vocal resonance."',
      'OCTOBER 15 — "We sealed the Master Signal Console behind a screwed service plate so the creature couldn’t force us to broadcast. It stalks the hallways now, tall as the door lintels, wrapped in torn acoustic baffling and copper leads."',
      'OCTOBER 16 — "To kill the transmission permanently, unscrew the service plate on the Master Console and trigger EMERGENCY SHUTDOWN. Never press TRANSMIT/ANSWER—that feeds the carrier loop."',
    ],
    audioTranscript: 'DIARY ENTRY: "We sealed the Master Console behind a screwed plate. Unscrew it and trigger Emergency Shutdown—never press Answer."',
  },
  theo_cassette_final: {
    id: 'theo_cassette_final',
    title: 'CASSETTE TAPE #03 — THEO’S FINAL RECORDING',
    refCode: 'REF_05',
    subtitle: 'Master Reel · Secret Listening Chamber',
    body: [
      '[Loud carrier whine followed by rapid breathing and the scrape of a heavy chair.]',
      'THEO: "Mara, I’m inside the lower listening chamber. I pulled the main relay link, but the creature is right outside the bulkhead repeating my own words back to me."',
      'THEO: "Listen: I am not alive in this building anymore. What’s walking these halls is an echo wearing dead insulation and wire. Take the screwdriver from the rack, open the console, and shut the signal down for good. Then take the yellow-tagged gate key and run."',
    ],
    audioTranscript: 'THEO (FINAL TAPE): "I am not alive in this building anymore. Use the screwdriver to shut down the console, take the yellow-tagged gate key, and run!"',
  },
  family_photo: {
    id: 'family_photo',
    title: 'FADED SEPIA FAMILY PHOTOGRAPH',
    refCode: 'REF_17',
    subtitle: 'Secret Collectible · Mara, Theo & Mother',
    body: [
      'A worn studio portrait tucked behind the listening room oscilloscope.',
      'On the back, in Theo’s childhood handwriting:',
      '"Mara & Theo — Greyfen Ridge, before the storm. Even when the static is loud, remember what is real."',
      '[SECRET COLLECTED: Having all 3 recordings and the Family Photograph unlocks THE LAST RECORDING true archive ending upon shutting down the signal.]',
    ],
    audioTranscript: 'MEMORY: "Mara & Theo — before the storm. Even when the static is loud, remember what is real."',
  },
};

// Wall geometry boxes (minX, maxX, minZ, maxZ)
// Every doorway has a 1.6m opening with solid wall jambs on both sides.
export const INITIAL_WALLS: WallBox[] = [
  // Outer Perimeter Fence around Exterior Porch (X: -11..11, Z: 8..17.5)
  { id: 'ext_south', minX: -11.5, maxX: 11.5, minZ: 17.0, maxZ: 17.6, height: 3.2, material: 'fence' },
  { id: 'ext_west', minX: -11.5, maxX: -10.9, minZ: 7.5, maxZ: 17.5, height: 3.2, material: 'fence' },
  { id: 'ext_east', minX: 10.9, maxX: 11.5, minZ: 7.5, maxZ: 17.5, height: 3.2, material: 'fence' },

  // Station South Facade (Z = 7.5) with Entrance Doorway at X [-0.9..0.9]
  { id: 'south_facade_w', minX: -11.0, maxX: -0.9, minZ: 7.3, maxZ: 7.8, height: 3.6, material: 'wood' },
  { id: 'south_facade_e', minX: 0.9, maxX: 11.0, minZ: 7.3, maxZ: 7.8, height: 3.6, material: 'wood' },

  // Station Outer West, East, and North Walls
  { id: 'station_west', minX: -11.0, maxX: -10.4, minZ: -12.5, maxZ: 7.5, height: 3.6, material: 'concrete' },
  { id: 'station_east', minX: 10.4, maxX: 11.0, minZ: -12.5, maxZ: 7.5, height: 3.6, material: 'concrete' },
  { id: 'station_north', minX: -11.0, maxX: 11.0, minZ: -12.5, maxZ: -11.9, height: 3.6, material: 'concrete' },

  // Entry Corridor West Wall (X = -2.2, Z: -1.5..7.5) with doorway to Bedroom at Z [2.6..4.2]
  { id: 'corr_w_south', minX: -2.4, maxX: -2.0, minZ: 4.2, maxZ: 7.5, height: 3.6, material: 'wood' },
  { id: 'corr_w_north', minX: -2.4, maxX: -2.0, minZ: -1.5, maxZ: 2.6, height: 3.6, material: 'wood' },

  // Entry Corridor East Wall (X = 2.2, Z: -1.5..7.5) with doorway to Kitchen at Z [2.6..4.2]
  { id: 'corr_e_south', minX: 2.0, maxX: 2.4, minZ: 4.2, maxZ: 7.5, height: 3.6, material: 'wood' },
  { id: 'corr_e_north', minX: 2.0, maxX: 2.4, minZ: -1.5, maxZ: 2.6, height: 3.6, material: 'wood' },

  // Bedroom North Wall (Z = -1.5, X: -10.5..-2.2) with doorway to Cross-Hall at X [-7.3..-5.7]
  { id: 'bed_n_west', minX: -10.5, maxX: -7.3, minZ: -1.7, maxZ: -1.3, height: 3.6, material: 'wood' },
  { id: 'bed_n_east', minX: -5.7, maxX: -2.0, minZ: -1.7, maxZ: -1.3, height: 3.6, material: 'wood' },

  // Kitchen North Wall (Z = -1.5, X: 2.2..10.5) with doorway to Cross-Hall at X [5.7..7.3]
  { id: 'kit_n_west', minX: 2.0, maxX: 5.7, minZ: -1.7, maxZ: -1.3, height: 3.6, material: 'wood' },
  { id: 'kit_n_east', minX: 7.3, maxX: 10.5, minZ: -1.7, maxZ: -1.3, height: 3.6, material: 'wood' },

  // North Wing Partition Wall (Z = -4.5, X: -10.5..10.5)
  // Doorways at:
  //   Basement Fuse Room: X [-7.3..-5.7]
  //   Radio Workroom: X [-0.8..0.8]
  //   Listening Room Loopback: X [7.2..8.8]
  { id: 'nwing_s_1', minX: -10.5, maxX: -7.3, minZ: -4.7, maxZ: -4.3, height: 3.6, material: 'concrete' },
  { id: 'nwing_s_2', minX: -5.7, maxX: -0.8, minZ: -4.7, maxZ: -4.3, height: 3.6, material: 'concrete' },
  { id: 'nwing_s_3', minX: 0.8, maxX: 7.2, minZ: -4.7, maxZ: -4.3, height: 3.6, material: 'concrete' },
  { id: 'nwing_s_4', minX: 8.8, maxX: 10.5, minZ: -4.7, maxZ: -4.3, height: 3.6, material: 'concrete' },

  // Divider between Basement Fuse Room and Radio Workroom (X = -3.6, Z: -12.0..-4.5)
  { id: 'div_base_radio', minX: -3.8, maxX: -3.4, minZ: -12.0, maxZ: -4.5, height: 3.6, material: 'concrete' },

  // Divider between Radio Workroom and Secret Listening Chamber (X = 4.2, Z: -12.0..-4.5)
  // Doorway `door_listening` at Z [-9.0..-7.4]
  { id: 'div_radio_list_n', minX: 4.0, maxX: 4.4, minZ: -12.0, maxZ: -9.0, height: 3.6, material: 'concrete' },
  { id: 'div_radio_list_s', minX: 4.0, maxX: 4.4, minZ: -7.4, maxZ: -4.5, height: 3.6, material: 'concrete' },

  // Solid interior furniture collision boxes (kept compact so corridors >= 2.6m wide stay clear)
  { id: 'prop_reception_desk', minX: -0.5, maxX: 0.5, minZ: 4.5, maxZ: 5.3, height: 1.0, material: 'wood' },
  { id: 'prop_bed_frame', minX: -9.8, maxX: -7.6, minZ: 4.5, maxZ: 6.7, height: 1.0, material: 'metal' },
  { id: 'prop_kitchen_table', minX: 5.2, maxX: 7.4, minZ: 2.8, maxZ: 4.6, height: 1.0, material: 'wood' },
  { id: 'prop_radio_bench', minX: -1.8, maxX: 1.8, minZ: -11.5, maxZ: -10.2, height: 1.1, material: 'wood' },
  { id: 'prop_listening_console', minX: 6.8, maxX: 9.8, minZ: -11.5, maxZ: -10.1, height: 1.3, material: 'metal' },
];

export const INITIAL_DOORS: DoorDef[] = [
  {
    id: 'door_entrance',
    name: 'Station Entrance Door',
    x: 0,
    z: 7.55,
    width: 1.8,
    axis: 'x',
    isOpen: false,
    creaky: true,
  },
  {
    id: 'door_bedroom',
    name: 'Records & Bunk Room Door',
    x: -2.2,
    z: 3.4,
    width: 1.6,
    axis: 'z',
    isOpen: false,
    creaky: true,
  },
  {
    id: 'door_kitchen',
    name: 'Utility Kitchen Door',
    x: 2.2,
    z: 3.4,
    width: 1.6,
    axis: 'z',
    isOpen: false,
    creaky: false,
  },
  {
    id: 'door_basement',
    name: 'Basement Fuse Room Door',
    x: -6.5,
    z: -4.5,
    width: 1.6,
    axis: 'x',
    isOpen: false,
    creaky: true,
  },
  {
    id: 'door_radio',
    name: 'Emergency Radio Workroom Door',
    x: 0,
    z: -4.5,
    width: 1.6,
    axis: 'x',
    isOpen: false,
    lockedByItem: 'maintenance_key',
    creaky: true,
  },
  {
    id: 'door_listening',
    name: 'Secret Listening Chamber Bulkhead',
    x: 4.2,
    z: -8.2,
    width: 1.6,
    axis: 'z',
    isOpen: false,
    lockedByItem: 'listening_key',
    requiresTuning: true,
    creaky: true,
  },
  {
    id: 'door_loopback',
    name: 'East Emergency Exit Corridor Door',
    x: 8.0,
    z: -4.5,
    width: 1.6,
    axis: 'x',
    isOpen: false,
    lockedByItem: 'exit_key',
    creaky: true,
  },
];

export const HIDING_SPOTS: HidingSpotDef[] = [
  {
    id: 'locker_bedroom',
    name: 'Records Steel Locker',
    x: -9.6,
    z: 0.8,
    standX: -8.6,
    standZ: 0.8,
    facingYaw: -Math.PI / 2,
    roomId: 'bedroom_records',
  },
  {
    id: 'locker_kitchen',
    name: 'Utility Storage Locker',
    x: 9.6,
    z: 0.8,
    standX: 8.6,
    standZ: 0.8,
    facingYaw: Math.PI / 2,
    roomId: 'kitchen_utility',
  },
  {
    id: 'locker_basement',
    name: 'Basement Maintenance Locker',
    x: -9.6,
    z: -7.5,
    standX: -8.6,
    standZ: -7.5,
    facingYaw: -Math.PI / 2,
    roomId: 'basement_fuse',
  },
  {
    id: 'locker_radio',
    name: 'Radio Room Equipment Closet',
    x: -2.8,
    z: -7.5,
    standX: -1.8,
    standZ: -7.5,
    facingYaw: -Math.PI / 2,
    roomId: 'radio_workroom',
  },
];

export const INITIAL_INTERACTABLES: InteractableDef[] = [
  // Doors
  {
    id: 'int_door_entrance',
    name: 'Station Entrance Door',
    type: 'door',
    x: 0,
    y: 1.2,
    z: 7.55,
    radius: 2.8,
    doorId: 'door_entrance',
    refCode: 'REF_15',
  },
  {
    id: 'int_door_bedroom',
    name: 'Records & Bunk Room Door',
    type: 'door',
    x: -2.2,
    y: 1.2,
    z: 3.4,
    radius: 2.3,
    doorId: 'door_bedroom',
    refCode: 'REF_15',
  },
  {
    id: 'int_door_kitchen',
    name: 'Utility Kitchen Door',
    type: 'door',
    x: 2.2,
    y: 1.2,
    z: 3.4,
    radius: 2.3,
    doorId: 'door_kitchen',
    refCode: 'REF_15',
  },
  {
    id: 'int_door_basement',
    name: 'Basement Fuse Room Door',
    type: 'door',
    x: -6.5,
    y: 1.2,
    z: -4.5,
    radius: 2.3,
    doorId: 'door_basement',
    refCode: 'REF_15',
  },
  {
    id: 'int_door_radio',
    name: 'Radio Workroom Door',
    type: 'door',
    x: 0,
    y: 1.2,
    z: -4.5,
    radius: 2.3,
    doorId: 'door_radio',
    refCode: 'REF_15',
  },
  {
    id: 'int_door_listening',
    name: 'Listening Chamber Bulkhead',
    type: 'door',
    x: 4.2,
    y: 1.2,
    z: -8.2,
    radius: 2.3,
    doorId: 'door_listening',
    refCode: 'REF_15',
  },
  {
    id: 'int_door_loopback',
    name: 'East Corridor Bulkhead Door',
    type: 'door',
    x: 8.0,
    y: 1.2,
    z: -4.5,
    radius: 2.3,
    doorId: 'door_loopback',
    refCode: 'REF_15',
  },

  // Hiding Lockers
  {
    id: 'int_locker_bedroom',
    name: 'Records Steel Locker',
    type: 'hiding_spot',
    x: -9.6,
    y: 1.2,
    z: 0.8,
    radius: 2.3,
    hidingSpotId: 'locker_bedroom',
  },
  {
    id: 'int_locker_kitchen',
    name: 'Utility Storage Locker',
    type: 'hiding_spot',
    x: 9.6,
    y: 1.2,
    z: 0.8,
    radius: 2.3,
    hidingSpotId: 'locker_kitchen',
  },
  {
    id: 'int_locker_basement',
    name: 'Basement Maintenance Locker',
    type: 'hiding_spot',
    x: -9.6,
    y: 1.2,
    z: -7.5,
    radius: 2.3,
    hidingSpotId: 'locker_basement',
  },
  {
    id: 'int_locker_radio',
    name: 'Radio Equipment Locker',
    type: 'hiding_spot',
    x: -2.8,
    y: 1.2,
    z: -7.5,
    radius: 2.3,
    hidingSpotId: 'locker_radio',
  },

  // Pickups & Story Objects
  {
    id: 'pickup_theo_cassette_1',
    name: 'Theo’s Cassette Tape #01',
    type: 'pickup',
    x: 0.0,
    y: 0.92,
    z: 4.9,
    radius: 2.8,
    itemId: 'theo_cassette_1',
    refCode: 'REF_05',
  },
  {
    id: 'pickup_glass_fuse',
    name: '250V Glass Fuse',
    type: 'pickup',
    x: -6.2,
    y: 0.9,
    z: 5.5,
    radius: 2.4,
    itemId: 'glass_fuse',
    refCode: 'REF_21',
  },
  {
    id: 'pickup_spare_batteries_1',
    name: 'Spare Flashlight Batteries',
    type: 'pickup',
    x: -8.2,
    y: 0.85,
    z: 4.8,
    radius: 2.2,
    itemId: 'spare_batteries_1',
    refCode: 'REF_02',
  },
  {
    id: 'pickup_cassette_operator_2',
    name: 'Operator Cassette Log 14-B',
    type: 'pickup',
    x: -4.5,
    y: 0.9,
    z: 1.2,
    radius: 2.2,
    itemId: 'cassette_operator_2',
    refCode: 'REF_07',
  },
  {
    id: 'pickup_freq_note',
    name: 'Radio Frequency Note (704.52)',
    type: 'pickup',
    x: 6.1,
    y: 0.92,
    z: 3.6,
    radius: 2.4,
    itemId: 'freq_note',
    refCode: 'REF_19',
  },
  {
    id: 'pickup_noise_decoy_1',
    name: 'Tin of Metal Bolts (Decoy)',
    type: 'pickup',
    x: 4.5,
    y: 0.9,
    z: 5.8,
    radius: 2.3,
    itemId: 'noise_decoy_1',
    refCode: 'REF_18',
  },
  {
    id: 'pickup_spare_batteries_2',
    name: 'Spare Flashlight Batteries',
    type: 'pickup',
    x: 8.6,
    y: 0.9,
    z: 4.8,
    radius: 2.2,
    itemId: 'spare_batteries_2',
    refCode: 'REF_02',
  },
  {
    id: 'station_fuse_box',
    name: 'Basement Main Fuse Box',
    type: 'fuse_box',
    x: -7.5,
    y: 1.35,
    z: -11.4,
    radius: 2.5,
    refCode: 'REF_21',
  },
  {
    id: 'pickup_maintenance_key',
    name: 'Rusted Maintenance Key',
    type: 'pickup',
    x: -5.2,
    y: 0.9,
    z: -10.8,
    radius: 2.4,
    itemId: 'maintenance_key',
    refCode: 'REF_13',
  },
  {
    id: 'pickup_noise_decoy_2',
    name: 'Tin of Metal Bolts (Decoy)',
    type: 'pickup',
    x: -8.8,
    y: 0.88,
    z: -10.2,
    radius: 2.2,
    itemId: 'noise_decoy_2',
    refCode: 'REF_18',
  },
  {
    id: 'station_radio_workbench',
    name: 'Emergency Radio Workbench',
    type: 'radio_workbench',
    x: 0.0,
    y: 1.1,
    z: -10.6,
    radius: 2.6,
    refCode: 'REF_03',
  },
  {
    id: 'pickup_listening_key',
    name: 'Antique Brass Listening Key',
    type: 'pickup',
    x: 2.2,
    y: 0.92,
    z: -10.6,
    radius: 2.4,
    itemId: 'listening_key',
    refCode: 'REF_06',
  },
  {
    id: 'pickup_operator_diary',
    name: 'Operator’s Leather Diary',
    type: 'pickup',
    x: 6.2,
    y: 0.95,
    z: -6.2,
    radius: 2.4,
    itemId: 'operator_diary',
    refCode: 'REF_10',
  },
  {
    id: 'pickup_theo_cassette_final',
    name: 'Theo’s Final Recording',
    type: 'pickup',
    x: 9.2,
    y: 0.95,
    z: -7.5,
    radius: 2.4,
    itemId: 'theo_cassette_final',
    refCode: 'REF_05',
  },
  {
    id: 'pickup_family_photo',
    name: 'Venn Family Photograph (Secret)',
    type: 'pickup',
    x: 9.6,
    y: 0.95,
    z: -10.8,
    radius: 2.3,
    itemId: 'family_photo',
    refCode: 'REF_17',
  },
  {
    id: 'pickup_screwdriver',
    name: 'Flathead Maintenance Screwdriver',
    type: 'pickup',
    x: 5.8,
    y: 0.92,
    z: -9.8,
    radius: 2.4,
    itemId: 'screwdriver',
    refCode: 'REF_14',
  },
  {
    id: 'station_shutdown_console',
    name: 'Master Signal Transmitter Console',
    type: 'shutdown_console',
    x: 8.2,
    y: 1.2,
    z: -10.6,
    radius: 2.6,
    refCode: 'REF_16',
  },
  {
    id: 'pickup_exit_key',
    name: 'Tagged Perimeter Gate Key Ring',
    type: 'pickup',
    x: 7.2,
    y: 0.95,
    z: -10.4,
    radius: 2.4,
    itemId: 'exit_key',
    refCode: 'REF_20',
  },
  {
    id: 'station_exit_gate',
    name: 'Exterior Perimeter Exit Gate',
    type: 'exit_gate',
    x: -4.5,
    y: 1.3,
    z: 15.8,
    radius: 2.8,
    refCode: 'REF_20',
  },
];

// Connected Patrol & Navigation Waypoints for The Receiver
export interface WaypointNode {
  id: string;
  x: number;
  z: number;
  roomId: string;
  neighbors: string[];
}

export const WAYPOINTS: WaypointNode[] = [
  { id: 'wp_cross_center', x: 0, z: -2.8, roomId: 'entry_corridor', neighbors: ['wp_corr_mid', 'wp_cross_west', 'wp_cross_east', 'wp_radio'] },
  { id: 'wp_corr_mid', x: 0, z: 2.2, roomId: 'entry_corridor', neighbors: ['wp_cross_center', 'wp_corr_south', 'wp_bedroom', 'wp_kitchen'] },
  { id: 'wp_corr_south', x: 0, z: 5.8, roomId: 'entry_corridor', neighbors: ['wp_corr_mid'] },
  { id: 'wp_cross_west', x: -6.5, z: -2.8, roomId: 'cross_hall', neighbors: ['wp_cross_center', 'wp_bedroom', 'wp_basement'] },
  { id: 'wp_cross_east', x: 6.5, z: -2.8, roomId: 'cross_hall', neighbors: ['wp_cross_center', 'wp_kitchen', 'wp_listening_south'] },
  { id: 'wp_bedroom', x: -6.5, z: 2.8, roomId: 'bedroom_records', neighbors: ['wp_corr_mid', 'wp_cross_west'] },
  { id: 'wp_kitchen', x: 6.5, z: 2.8, roomId: 'kitchen_utility', neighbors: ['wp_corr_mid', 'wp_cross_east'] },
  { id: 'wp_basement', x: -6.5, z: -8.0, roomId: 'basement_fuse', neighbors: ['wp_cross_west'] },
  { id: 'wp_radio', x: 0, z: -8.0, roomId: 'radio_workroom', neighbors: ['wp_cross_center', 'wp_listening'] },
  { id: 'wp_listening', x: 7.2, z: -8.2, roomId: 'listening_chamber', neighbors: ['wp_radio', 'wp_listening_south'] },
  { id: 'wp_listening_south', x: 7.8, z: -6.0, roomId: 'listening_chamber', neighbors: ['wp_listening', 'wp_cross_east'] },
];

export const ITEM_METADATA: Record<ItemId, { name: string; ref: string; summary: string }> = {
  flashlight: { name: 'Heavy Metal Flashlight', ref: 'REF_12', summary: 'Ribbed steel beam light. Uses battery while active.' },
  theo_cassette_1: { name: 'Theo’s Cassette #01', ref: 'REF_05', summary: 'Warning tape left on the intake desk.' },
  cassette_operator_2: { name: 'Operator Cassette 14-B', ref: 'REF_07', summary: 'Night-shift log detailing vocal mimicry.' },
  glass_fuse: { name: '250V Glass Fuse', ref: 'REF_21', summary: 'Intact filament cartridge fuse for the basement panel.' },
  maintenance_key: { name: 'Rusted Maintenance Key', ref: 'REF_13', summary: 'Unlocks the Emergency Radio Workroom.' },
  freq_note: { name: 'Frequency Calibration Note', ref: 'REF_19', summary: 'Target carrier: 704.52 kHz, Phase: 76°.' },
  listening_key: { name: 'Antique Brass Key', ref: 'REF_06', summary: 'Unlocks the Lower Listening Chamber bulkhead.' },
  operator_diary: { name: 'Operator’s Leather Diary', ref: 'REF_10', summary: 'Mercer’s journal on shutting down the array.' },
  theo_cassette_final: { name: 'Theo’s Final Tape', ref: 'REF_05', summary: 'Recorded inside the Listening Chamber.' },
  family_photo: { name: 'Family Photograph', ref: 'REF_17', summary: 'Portrait of Mara, Theo, and their mother.' },
  screwdriver: { name: 'Maintenance Screwdriver', ref: 'REF_14', summary: 'Opens the sealed Master Signal Console plate.' },
  exit_key: { name: 'Tagged Gate Key Ring', ref: 'REF_20', summary: 'Yellow-tagged key to the Exterior Perimeter Gate.' },
  spare_batteries_1: { name: 'Spare AA Cells', ref: 'REF_02', summary: 'Restores +45% flashlight charge.' },
  spare_batteries_2: { name: 'Spare AA Cells', ref: 'REF_02', summary: 'Restores +45% flashlight charge.' },
  noise_decoy_1: { name: 'Tin of Metal Bolts', ref: 'REF_18', summary: 'Throwable noise decoy to lure The Receiver.' },
  noise_decoy_2: { name: 'Tin of Metal Bolts', ref: 'REF_18', summary: 'Throwable noise decoy to lure The Receiver.' },
};

export function getRoomNameAt(x: number, z: number): string {
  if (z > 7.5) return 'Exterior Gate & Porch';
  if (z >= -1.5 && x >= -2.2 && x <= 2.2) return 'Entry Corridor';
  if (z >= -1.5 && x < -2.2) return 'Abandoned Records & Bunk Room';
  if (z >= -1.5 && x > 2.2) return 'Utility Kitchen';
  if (z < -1.5 && z >= -4.5) return 'Station Cross-Hallway';
  if (z < -4.5 && x < -3.6) return 'Basement Fuse Room';
  if (z < -4.5 && x >= -3.6 && x <= 4.2) return 'Emergency Radio Workroom';
  if (z < -4.5 && x > 4.2) return 'Secret Lower Listening Chamber';
  return 'Greyfen Relay Station';
}
