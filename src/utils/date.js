export function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromLocalDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function daysBetweenLocalDateKeys(startDateKey, endDateKey = toLocalDateKey()) {
  const start = fromLocalDateKey(startDateKey);
  const end = fromLocalDateKey(endDateKey);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / 86400000);
}

export function getLocalWeekDateKey(dayOffsetFromMonday) {
  const date = new Date();
  const mondayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
  date.setDate(date.getDate() - mondayIndex + dayOffsetFromMonday);
  return toLocalDateKey(date);
}
