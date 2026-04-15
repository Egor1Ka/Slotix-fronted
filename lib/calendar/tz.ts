const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

const getDayOfWeekInTz = (dateStr: string, timezone: string): number => {
  const anchor = new Date(`${dateStr}T12:00:00Z`)
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timezone,
  }).format(anchor)
  return WEEKDAY_INDEX[weekday] ?? 0
}

const todayInTz = (timezone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())

export { getDayOfWeekInTz, todayInTz }
