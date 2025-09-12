import {
  format,
  isToday,
  isYesterday,
  subDays,
  isWithinInterval,
  parseISO,
  intervalToDuration,
} from "date-fns";

import { enUS } from "date-fns/locale";

export function formatCustomDate(dateInput: Date | string) {
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;

  if (isToday(date)) {
    return "Today";
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  const sixDaysAgo = subDays(new Date(), 6);

  if (isWithinInterval(date, { start: sixDaysAgo, end: new Date() })) {
    return format(date, "EEEE");
  }

  return format(date, "MMMM d, yyyy");
}

export const formatCallDuration = (joinedAt: string, leftAt: string | null) => {
  const start = new Date(joinedAt);
  if (!leftAt) {
    return "Unknown duration";
  }

  const end = new Date(leftAt);

  const duration = intervalToDuration({ start, end });

  const parts = [];
  if (duration.hours && duration.hours > 0) parts.push(`${duration.hours}h`);
  if (duration.minutes && duration.minutes > 0)
    parts.push(`${duration.minutes}m`);
  if (duration.seconds && duration.seconds > 0)
    parts.push(`${duration.seconds}s`);

  return parts.length > 0 ? parts.join(" ") : "< 1s";
};

export const shortEnLocale = {
  ...enUS,
  formatDistance: (token: string, count: number, options?: any) => {
    // Handle "now"
    if ((token === "lessThanXSeconds" || token === "xSeconds") && count < 5) {
      return "now";
    }

    const format = {
      lessThanXMinutes: "{{count}} min",
      xMinutes: "{{count}} min",
      aboutXHours: "{{count}} hr",
      xHours: "{{count}} hr",
      xDays: "{{count}} d",
      aboutXMonths: "{{count}} mo",
      xMonths: "{{count}} mo",
      aboutXYears: "{{count}} y",
      xYears: "{{count}} y",
      overXYears: "{{count}} y",
      almostXYears: "{{count}} y",
      lessThanXSeconds: "{{count}} sec",
      xSeconds: "{{count}} sec",
    } as Record<string, string>;

    let text = format[token] || "";
    text = text.replace("{{count}}", count.toString());

    return options?.addSuffix
      ? text + (options.comparison > 0 ? " from now" : " ago")
      : text;
  },
};
