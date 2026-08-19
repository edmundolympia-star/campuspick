export const PICKUP_CUTOFF_HOUR = 18;
export const PICKUP_TIME_ZONE = "Asia/Kuala_Lumpur";

function localDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PICKUP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour"))
  };
}

export function addDaysToDateString(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function todayInPickupZone(now = new Date()) {
  const parts = localDateParts(now);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function nextPickupDate(now = new Date()) {
  const parts = localDateParts(now);
  const today = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  return addDaysToDateString(today, parts.hour >= PICKUP_CUTOFF_HOUR ? 2 : 1);
}

export function formatPickupDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("zh-MY", {
    month: "short",
    day: "numeric",
    weekday: "short"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function pickupCutoffLabel() {
  return "每天 6:00 PM 截止";
}
