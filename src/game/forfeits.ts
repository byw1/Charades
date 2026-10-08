import { seedFromString } from './random';

/**
 * Forfeits for whoever comes last.
 *
 * Dares, not drinking games: a drinking mode would push the App Store rating
 * to 17+. Every one of these happens in the room and is over in a few minutes,
 * and none asks anyone to post, message or hand over their phone.
 */
export const FORFEITS: readonly string[] = [
  'Do your best impression of someone in the room until they guess who it is.',
  'Talk in an accent until the next game starts.',
  'Narrate the next two minutes like a nature documentary.',
  'Serenade the winners with a song they choose.',
  'Do a dramatic slow-motion replay of your worst card.',
  'Give every winner a sincere, specific compliment.',
  'Talk like a pirate until your next turn.',
  'Do ten jumping jacks while singing the alphabet.',
  'Freestyle rap about the winners for thirty seconds.',
  'Strike a model pose every time someone says your name for ten minutes.',
  'Be the winners’ hype crew: cheer every time one of them speaks, for five minutes.',
  'Do your best runway walk across the room.',
  'Speak only in questions until the next round starts.',
  'Act out a film of the winners’ choosing. No words.',
  'Do your best evil villain laugh. Then do it louder.',
  'Explain the rules of this game like a sports commentator.',
  'Talk about yourself in the third person for ten minutes.',
  'Invent a secret handshake with the winners and do it.',
  'Perform a twenty-second interpretive dance called “Losing”.',
  'Give a victory speech on behalf of the team that beat you.',
  'Sing your next sentence like an opera singer.',
  'Let the winners choose the next deck.',
  'Tell a terrible joke. Keep going until someone groans.',
  'Draw a portrait of a winner with your other hand.',
  'Hold a plank while the winners slowly count to twenty.',
  'Do a celebrity impression the winners pick.',
  'Moonwalk across the room. Commit to it.',
  'Announce the next round like a boxing ring MC.',
  'Speak in rhymes until your next turn.',
  'Pick a winner and be their butler until the next game starts.',
];

/**
 * The forfeit for a game.
 *
 * Seeded from the session id rather than drawn at random, so it is the same
 * forfeit every time the standings render and after the app is reopened —
 * the loser cannot reroll by backing out.
 */
export function forfeitFor(sessionId: string): string {
  return FORFEITS[seedFromString(sessionId) % FORFEITS.length]!;
}
