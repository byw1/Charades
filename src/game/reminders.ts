/**
 * When to nudge about a streak.
 *
 * Only ever one reminder, only when there is a streak to lose, and never more
 * than once a day. The evening slot is when a group is most likely to be
 * together; a second, later slot catches a phone opened after seven.
 */

export type ReminderPlan = { at: Date; title: string; body: string };

/** 7pm, then 9:30pm if seven has already gone. */
const SLOTS: readonly [number, number][] = [
  [19, 0],
  [21, 30],
];

function at(day: Date, [hour, minute]: [number, number]): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
}

export function planStreakReminder(stats: { streak: number; playedToday: boolean }, now: Date): ReminderPlan | null {
  if (stats.streak <= 0) return null;

  const title = `🔥 Your ${stats.streak}-day streak ends tonight`;
  const body = 'One round keeps it alive. Phone on your forehead!';

  if (stats.playedToday) {
    // Safe today, so the next risk is tomorrow evening, at the first slot.
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
    return { at: at(tomorrow, SLOTS[0]!), title, body };
  }

  // A minute's grace, so a reminder is never scheduled for the moment it is set.
  const soon = now.getTime() + 60_000;
  const slot = SLOTS.map((s) => at(now, s)).find((time) => time.getTime() > soon);
  return slot ? { at: slot, title, body } : null;
}
