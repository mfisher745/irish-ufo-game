/**
 * Master palette. DESIGN.md section 8: one palette of 48 colours, with a
 * sub-palette per region. Every generated sprite, tile, HUD element and font
 * pixel uses a colour from this file and nothing else.
 *
 * Values are 0xRRGGBB so they can go straight into Phaser. Use `css()` for
 * canvas 2D drawing.
 */

export const PALETTE = {
  // Neutrals (shared by every region)
  ink: 0x14121a,
  coal: 0x2a2833,
  slate: 0x474a57,
  steel: 0x6f7684,
  fog: 0xa2a9b3,
  bone: 0xd8d6c8,
  white: 0xf6f4ea,
  fluoro: 0xeaf6ff,

  // Characters (shared by every region)
  skinShade: 0xa8654a,
  skin: 0xd99873,
  skinLight: 0xf0c2a0,
  anorak: 0x6c7d62,
  denim: 0x3b5378,
  mykoCoat: 0x33303f,
  beanie: 0x7a2f3a,
  alarm: 0xe0343c,

  // Kilnamoe: wet, dim, warm indoors
  mossDark: 0x24402c,
  moss: 0x3f6b3a,
  grass: 0x6f9a45,
  turfDark: 0x3a2619,
  turf: 0x5e3d24,
  peat: 0x8a5a32,
  amber: 0xe0962e,
  amberLight: 0xf7c765,

  // Boston and DC: hard edges, overlit
  brickDark: 0x6e2a24,
  brick: 0xa2422f,
  navyDark: 0x17223f,
  navy: 0x27407a,

  // Ohio: wide and flat
  corn: 0xe8c53e,
  cornShade: 0xb58b24,
  dustyBlue: 0x7fa3c4,
  skyPale: 0xbcd6e6,
  motelPink: 0xe58fa0,
  motelPinkShade: 0xb55d78,

  // Roswell: tacky
  lime: 0xa6e22a,
  limeShade: 0x5fa01e,
  magenta: 0xd83a9c,
  magentaShade: 0x8f2470,
  tan: 0xd9bf8c,
  tanShade: 0xa88a5a,

  // Nevada and the base: heat outside, cold inside
  sand: 0xedd49a,
  rust: 0xb5532a,
  rustDark: 0x7a3220,
  teal: 0x1f9c95,
  tealDark: 0x12595e,
  violet: 0x6b4bb0,
  violetDark: 0x3a2a6e,
  alienGrey: 0x9aa39b,
} as const;

export type ColourName = keyof typeof PALETTE;

/** Art regions. Boston and DC share one; Nevada outdoors and the base do not. */
export type ArtRegion = 'kilnamoe' | 'cities' | 'ohio' | 'roswell' | 'nevada' | 'base';

/** Colours every region may use: neutrals, characters and the alarm red. */
export const SHARED_COLOURS = [
  'ink',
  'coal',
  'slate',
  'steel',
  'fog',
  'bone',
  'white',
  'skinShade',
  'skin',
  'skinLight',
  'anorak',
  'denim',
  'mykoCoat',
  'beanie',
  'alarm',
] as const satisfies readonly ColourName[];

/**
 * The colours that set each region's look, most dominant first. Environment
 * art for a region uses these plus SHARED_COLOURS. A colour from another
 * region may appear only on an object that has travelled (Andrew's pint in
 * Boston is still amber).
 */
export const REGION_COLOURS = {
  kilnamoe: ['slate', 'moss', 'turf', 'amber', 'mossDark', 'grass', 'turfDark', 'peat', 'amberLight'],
  cities: ['brick', 'navy', 'fluoro', 'brickDark', 'navyDark', 'amber'],
  ohio: ['corn', 'dustyBlue', 'motelPink', 'cornShade', 'skyPale', 'motelPinkShade', 'grass'],
  roswell: ['lime', 'magenta', 'tan', 'limeShade', 'magentaShade', 'tanShade', 'alienGrey'],
  nevada: ['sand', 'rust', 'rustDark', 'tan', 'tanShade', 'skyPale'],
  base: ['teal', 'violet', 'tealDark', 'violetDark', 'alienGrey', 'fluoro'],
} as const satisfies Record<ArtRegion, readonly ColourName[]>;

/** '#rrggbb' for canvas 2D contexts. */
export function css(name: ColourName): string {
  return `#${PALETTE[name].toString(16).padStart(6, '0')}`;
}
