/**
 * Design tokens.
 *
 * Dark, loud and fast. The look borrows its grammar from the camera apps the
 * people playing this live in: a near-black canvas so content is the only
 * colour on screen, floating translucent controls, fat pill buttons, and one
 * electric accent that means "do the thing". Saturated colour is saved for
 * the cards themselves, which are the whole point.
 *
 * Deliberately not Snapchat's: no ghost, and a warmer yellow than theirs.
 */

export const palette = {
  yellow: '#FFE500',
  yellowDeep: '#E6CE00',

  green: '#2EE86F',
  greenDeep: '#1FB855',

  orange: '#FF6B2C',
  orangeDeep: '#E0541A',

  blue: '#2EA8FF',
  blueDeep: '#1388E0',

  pink: '#FF3D8B',
  pinkDeep: '#E0226F',

  purple: '#9B5CFF',
  purpleDeep: '#7B3DE6',

  red: '#FF3B47',
  redDeep: '#D92632',

  teal: '#00C2B2',
} as const;

export const color = {
  /** The canvas. Not pure black, which smears on OLED as things scroll. */
  background: '#0A0A0D',
  /** Cards, rows and inputs. */
  surface: '#16161B',
  /** Something sitting on a surface, or a pressed surface. */
  surfaceRaised: '#202028',
  /** Hairlines and input borders. */
  line: '#2A2A33',

  /** Translucent controls floating over full-bleed content. */
  glass: 'rgba(255,255,255,0.12)',
  glassStrong: 'rgba(255,255,255,0.2)',
  scrim: 'rgba(0,0,0,0.45)',

  text: '#FFFFFF',
  textMuted: '#A3A3B0',
  textFaint: '#6A6A78',

  /**
   * The two extremes used to pick readable text on an arbitrary deck colour.
   * They sit at opposite ends of the luminance range on purpose — see
   * contrast.ts for why that guarantees every deck colour has readable text.
   */
  bone: '#FFFFFF',
  ink: '#0A0A0D',

  /** The one accent. Primary actions, the shutter, the streak. */
  brand: palette.yellow,
  brandDeep: palette.yellowDeep,

  /** Full-screen flash on a correct guess. */
  correct: palette.green,
  /** Full-screen flash on a pass. */
  pass: palette.orange,

  /** Links, selection, the "send" action. */
  focus: palette.blue,

  danger: palette.red,

  gold: '#FFC93C',
  silver: '#C9CED8',
  bronze: '#E3A06A',
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
  palette.purple,
  palette.blue,
  palette.teal,
  palette.red,
  palette.yellow,
  '#5B5BFF',
  '#E040FB',
] as const;

/**
 * Two faces. Bricolage Grotesque for anything meant to be shouted — titles,
 * the card, scores — because it has a voice and it runs narrow, so card text
 * stays huge. Plus Jakarta Sans for everything you read, because a menu has to
 * be legible before it is fun.
 */
export const font = {
  display: 'BricolageGrotesque_800ExtraBold',
  card: 'BricolageGrotesque_800ExtraBold',
  regular: 'PlusJakartaSans_500Medium',
  medium: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  heavy: 'PlusJakartaSans_800ExtraBold',
} as const;

export const type = {
  hero: { fontFamily: font.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.2 },
  display: { fontFamily: font.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.8 },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.4 },
  heading: { fontFamily: font.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: font.bold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  /** Chat-style sender labels and section headers. */
  overline: { fontFamily: font.heavy, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 },
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

/** Side margin for menu screens. */
export const gutter = 16;

/**
 * Minimum tap target, per Apple's Human Interface Guidelines. Round-screen
 * targets are half the screen each and are not bound by this.
 */
export const minTapTarget = 44;

/**
 * Duration of the full-screen correct/pass flash. Long enough for the word to
 * land and be read from across the room, short enough not to slow a round.
 */
export const flashMs = 420;

export type ColorToken = keyof typeof color;
