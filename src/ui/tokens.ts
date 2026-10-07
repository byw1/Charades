/**
 * Design tokens.
 *
 * Bright, chunky and friendly. A white canvas, saturated colour used with
 * intent, and surfaces that sit on a solid "ledge" of their own darker shade so
 * every button looks like it can be physically pressed. The playful energy
 * comes from colour, shape and motion; the type stays bold and simple so it is
 * still readable across a dim room after a couple of drinks.
 *
 * Every saturated colour that carries white text clears 3:1 against white,
 * which is WCAG AA for the large, heavy type it is always paired with.
 */

export const palette = {
  green: '#43A800',
  greenShade: '#357F00',
  greenLight: '#D7FFB8',

  blue: '#0F9AE0',
  blueShade: '#0B78B0',
  blueLight: '#DDF4FF',

  orange: '#E67700',
  orangeShade: '#B35C00',
  orangeLight: '#FFE8CC',

  red: '#E83A3A',
  redShade: '#B52A2A',
  redLight: '#FFDFE0',

  pink: '#F0386B',
  pinkShade: '#BF2A53',
  pinkLight: '#FFE0EA',

  purple: '#8B5CF6',
  purpleShade: '#6A40CF',
  purpleLight: '#EDE5FF',

  teal: '#0EA5A0',
  tealShade: '#0A7D79',

  yellow: '#FFC800',
  yellowShade: '#D9A400',
  yellowLight: '#FFF5CC',
} as const;

export const color = {
  /** The canvas. */
  background: '#FFFFFF',
  /** A quiet second surface, for wells and inputs at rest. */
  backgroundSoft: '#F7F7F9',

  /** Headings and body copy. Softer than black, which reads as harsh on white. */
  text: '#3C3C4E',
  /** Secondary copy. */
  textMuted: '#7A7A8C',
  /** Placeholders, captions, disabled. */
  textFaint: '#AFAFBD',

  /** Borders on white surfaces, and the ledge under a white button. */
  line: '#E5E5EC',
  lineShade: '#D2D2DC',

  /**
   * The two extremes used to pick readable text on an arbitrary deck colour.
   * They sit at opposite ends of the luminance range on purpose — see
   * contrast.ts for why that guarantees every deck colour has readable text.
   */
  bone: '#FFFFFF',
  ink: '#1A1A2E',

  /** The brand, and the mascot's card. */
  brand: palette.pink,
  brandShade: palette.pinkShade,

  /** Full-screen flash on a correct guess, and every "go" action. */
  correct: palette.green,
  correctShade: palette.greenShade,
  /** Full-screen flash on a pass. */
  pass: palette.orange,
  passShade: palette.orangeShade,

  /** Selection, focus and links. */
  focus: palette.blue,
  focusLight: palette.blueLight,

  /** Celebration: trophies, first place, the big moments. */
  gold: palette.yellow,
  goldShade: palette.yellowShade,
  silver: '#B9C2CF',
  silverShade: '#97A2B2',
  bronze: '#E3A06A',
  bronzeShade: '#C07F4C',

  danger: palette.red,
  dangerShade: palette.redShade,
} as const;

/**
 * Deck colours offered in the editor and used by the bundled decks.
 *
 * Green and orange are deliberately absent: they are the correct and pass
 * flashes, and a card the same colour as its own flash makes the signature
 * moment of the round fail to read.
 */
export const deckColors = [
  palette.pink,
  palette.blue,
  palette.purple,
  palette.teal,
  palette.red,
  '#5B5BD6',
  '#C026D3',
  '#475569',
] as const;

/**
 * Nunito: rounded terminals, a generous x-height, and heavy weights that stay
 * friendly rather than shouting. One family for everything keeps the app
 * sounding like one voice; weight does the work of hierarchy.
 */
export const font = {
  regular: 'Nunito_700Bold',
  bold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
  /** The card face in a round. */
  card: 'Nunito_900Black',
} as const;

export const type = {
  hero: { fontFamily: font.black, fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
  display: { fontFamily: font.black, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: font.black, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  heading: { fontFamily: font.bold, fontSize: 19, lineHeight: 25 },
  body: { fontFamily: font.regular, fontSize: 17, lineHeight: 24 },
  label: { fontFamily: font.bold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: font.regular, fontSize: 14, lineHeight: 19 },
  /** Small-caps-style overline: section labels, step counters. */
  overline: { fontFamily: font.black, fontSize: 13, lineHeight: 17, letterSpacing: 1.1 },
} as const;

/** Four-point grid. */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

/** How far a pressable surface sits above its ledge. */
export const ledge = 4;

/**
 * Minimum tap target, per Apple's Human Interface Guidelines. Round-screen
 * targets are half the screen each and are not bound by this.
 */
export const minTapTarget = 44;

/**
 * Duration of the full-screen correct/pass flash. Long enough for the word to
 * pop in and be read from across the room, short enough not to slow a round.
 */
export const flashMs = 420;

export type ColorToken = keyof typeof color;
