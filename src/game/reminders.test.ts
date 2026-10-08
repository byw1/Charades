import { planStreakReminder } from './reminders';

const day = (h: number, m = 0) => new Date(2026, 9, 7, h, m);

describe('planStreakReminder', () => {
  it('stays quiet with no streak to lose', () => {
    expect(planStreakReminder({ streak: 0, playedToday: false }, day(12))).toBeNull();
  });

  it('nudges at 7pm on a day not yet played', () => {
    const plan = planStreakReminder({ streak: 5, playedToday: false }, day(12))!;
    expect(plan.at).toEqual(day(19));
    expect(plan.title).toContain('5-day streak');
  });

  it('falls back to 9:30pm once seven has gone', () => {
    expect(planStreakReminder({ streak: 2, playedToday: false }, day(19, 30))!.at).toEqual(day(21, 30));
  });

  it('gives up for the night once the last slot has passed', () => {
    expect(planStreakReminder({ streak: 2, playedToday: false }, day(22))).toBeNull();
  });

  it('moves to tomorrow evening once today is safe', () => {
    expect(planStreakReminder({ streak: 3, playedToday: true }, day(20))!.at).toEqual(new Date(2026, 9, 8, 19, 0));
  });
});
