export type DateTimeErrors = {
  date?: string;
  time?: string;
};

export function validateDateTime(date: string, time: string): DateTimeErrors {
  const errors: DateTimeErrors = {};
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dateMatch) {
    errors.date = '请使用 YYYY-MM-DD 格式';
  } else {
    const [, year, month, day] = dateMatch.map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
      errors.date = '请输入真实存在的日期';
    }
  }

  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!timeMatch) {
    errors.time = '请使用 HH:mm 格式';
  } else {
    const [, hour, minute] = timeMatch.map(Number);
    if (hour > 23 || minute > 59) errors.time = '请输入 00:00 至 23:59';
  }

  return errors;
}
