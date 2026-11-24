export type Holiday = {
  id: string;
  name: string;
  date: string;
  description: string;
  cancelled: boolean;
  added: boolean;
  note?: string;
  noticeAt?: string | null;
};

export type HolidayState = "cancelled" | "passed" | "added" | "upcoming";

const pad = (value: number) => String(value).padStart(2, "0");

export const todayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const toDayString = (value?: string | null): string | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toDate = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const formatWithWeekday = (day: string) => {
  const date = toDate(day);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} (${WEEKDAYS[date.getDay()]})`;
};

export const formatLong = (day: string) => {
  const date = toDate(day);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatPlain = (day: string) => {
  const date = toDate(day);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

export const stateOf = (holiday: Holiday, today: string): HolidayState => {
  if (holiday.cancelled) return "cancelled";
  if (holiday.date < today) return "passed";
  if (holiday.added) return "added";
  return "upcoming";
};

export const daysBetween = (from: string, to: string) => {
  const start = toDate(from);
  const end = toDate(to);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
};
