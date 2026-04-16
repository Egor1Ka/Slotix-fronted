import type {
	StaffBooking,
	CalendarDisplayBooking,
} from '@/services/configs/booking.types'
import { wallClockInTz } from '@/lib/calendar/tz'

const timeToMinFromISO = (iso: string, timezone: string): number => {
	const wc = wallClockInTz(iso, timezone)
	return wc.hour * 60 + wc.minute
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
		statusId: b.statusId,
		status: b.status,
		staffName: staff.name,
		staffAvatar: staff.avatar,
		timezone: scheduleTimezone,
	})

export type { StaffInfo }
export { dateFromISO, toCalendarDisplayBooking }
