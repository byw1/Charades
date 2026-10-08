import { Platform } from 'react-native';
import type { ReminderPlan } from '@/game/reminders';

/**
 * Streak reminders, as local notifications.
 *
 * Scheduled on the phone by the phone. There is no push server and no push
 * token is ever requested: a local notification is an alarm with words on it.
 * The module is loaded only when needed, so nothing about notifications runs
 * at launch for anyone who has not turned reminders on.
 */

const ID = 'deckhead-streak-reminder';

async function notifications() {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

/** Asks for permission. True if reminders can be shown. */
export async function allowReminders(): Promise<boolean> {
  const N = await notifications();
  if (!N) return false;
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await N.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  return asked.granted;
}

/**
 * Replaces whatever reminder is pending with the one planned now, or none.
 * Called whenever the home screen comes back, so playing a game moves the
 * reminder on to tomorrow.
 */
export async function syncStreakReminder(plan: ReminderPlan | null, enabled: boolean): Promise<void> {
  const N = await notifications();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(ID);
    if (!enabled || !plan) return;
    const permission = await N.getPermissionsAsync();
    if (!permission.granted) return;
    await N.scheduleNotificationAsync({
      identifier: ID,
      content: { title: plan.title, body: plan.body, sound: true },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: plan.at },
    });
  } catch {
    // A missed reminder is not worth an error on screen.
  }
}
