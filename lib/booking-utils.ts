import type {
	StaffBooking,
	CalendarDisplayBooking,
} from '@/services/configs/booking.types'

const getTimePart = (parts: Intl.DateTimeFormatPart[], type: string): number => {
	const part = parts.find((p) => p.type === type)
	return part ? parseInt(part.value, 10) : 0
}

const timeToMinFromISO = (iso: string, timezone?: string): number => {
	const date = new Date(iso)
	if (!timezone) {
		return date.getUTCHours() * 60 + date.getUTCMinutes()
	}
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})
	const parts = formatter.formatToParts(date)
	const hour = getTimePart(parts, 'hour')
	const minute = getTimePart(parts, 'minute')
	return hour * 60 + minute
}

const dateFromISO = (iso: string, timezone: string): string =>
	new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(iso))

const diffMinutes = (startISO: string, endISO: string): number => {
	const start = new Date(startISO).getTime()
	const end = new Date(endISO).getTime()
	return Math.round((end - start) / 60000)
}

interface StaffInfo {
	name: string
	avatar: string
}

const toCalendarDisplayBooking =
	(staff: StaffInfo, scheduleTimezone: string) =>
	(b: StaffBooking): CalendarDisplayBooking => ({
		startMin: timeToMinFromISO(b.startAt, scheduleTimezone),
		duration: diffMinutes(b.startAt, b.endAt),
		label: `${b.eventTypeName} — ${staff.name}`,
		color: b.color,
		date: dateFromISO(b.startAt, scheduleTimezone),
		bookingId: b.id,
		status: b.status,
		staffName: staff.name,
		staffAvatar: staff.avatar,
		timezone: scheduleTimezone,
	})

export type { StaffInfo }
export { toCalendarDisplayBooking }
