export type Countdown =
  | { done: true }
  | { done: false; days: number; hours: number; minutes: number; seconds: number };

export function getCountdown(target: Date, now: Date): Countdown {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { done: true };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    done: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export const EVENT_PASSED_TEXT = "Событие состоялось";
