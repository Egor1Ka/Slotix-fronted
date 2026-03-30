import type {
	StaffBooking,
	CalendarDisplayBooking,
} from '@/services/configs/booking.types'

const timeToMinFromISO = (iso: string): number => {
	const d = new Date(iso)
	return d.getUTCHours() * 60 + d.getUTCMinutes()
}

const dateFromISO = (iso: string): string => iso.split('T')[0]

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
	(staff: StaffInfo) =>
	(b: StaffBooking): CalendarDisplayBooking => ({
		startMin: timeToMinFromISO(b.startAt),
		duration: diffMinutes(b.startAt, b.endAt),
		label: `${b.eventTypeName} — ${staff.name}`,
		color: b.color,
		date: dateFromISO(b.startAt),
		bookingId: b.id,
		status: b.status,
		staffName: staff.name,
		staffAvatar: staff.avatar,
	})

export type { StaffInfo }
export { toCalendarDisplayBooking }
