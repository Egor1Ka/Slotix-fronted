import type { Granularity } from '@/services/configs/stats.types'

const formatMoney = (amount: number, currency: string, locale: string): string =>
	new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
	}).format(amount)

const formatMoneyCompact = (
	amount: number,
	currency: string,
	locale: string,
): string =>
	new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(amount)

const addDaysIso = (yyyyMmDd: string, days: number): string => {
	const date = new Date(`${yyyyMmDd}T00:00:00Z`)
	date.setUTCDate(date.getUTCDate() + days)
	return date.toISOString().slice(0, 10)
}

const formatDay = (
	yyyyMmDd: string,
	timezone: string,
	locale: string,
): string =>
	new Intl.DateTimeFormat(locale, {
		timeZone: timezone,
		month: 'short',
		day: 'numeric',
	}).format(new Date(`${yyyyMmDd}T12:00:00Z`))

const formatMonth = (
	yyyyMmDd: string,
	timezone: string,
	locale: string,
): string =>
	new Intl.DateTimeFormat(locale, {
		timeZone: timezone,
		year: 'numeric',
		month: 'long',
	}).format(new Date(`${yyyyMmDd}T12:00:00Z`))

const formatWeek = (
	yyyyMmDd: string,
	timezone: string,
	locale: string,
): string => {
	const start = formatDay(yyyyMmDd, timezone, locale)
	const end = formatDay(addDaysIso(yyyyMmDd, 6), timezone, locale)
	return `${start} – ${end}`
}

const formatDateLabel = (
	yyyyMmDd: string,
	granularity: Granularity,
	timezone: string,
	locale: string,
): string => {
	if (granularity === 'day') return formatDay(yyyyMmDd, timezone, locale)
	if (granularity === 'month') return formatMonth(yyyyMmDd, timezone, locale)
	return formatWeek(yyyyMmDd, timezone, locale)
}

export { formatMoney, formatMoneyCompact, formatDateLabel }
