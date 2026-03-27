'use client'

import { useState, useCallback } from 'react'
import { bookingApi } from '@/lib/booking-api-client'
import type { ConfirmedBooking } from '../types'
import type { EventType } from '@/services/configs/booking.types'
import type { BookingStatus } from '@/services/configs/booking.types'
import type { ClientInfoData } from '@/components/booking/ClientInfoForm'
import type { BookingDetail } from '@/components/booking/BookingDetailsPanel'

interface UseBookingActionsParams {
	staffId: string | null
	staffList: { id: string }[]
	eventTypes: EventType[]
	selectedEventTypeId: string | null
	selectedSlotTime: string | null
	dateStr: string
	reloadBookings: () => void
	getFirstStaffId: (list: { id: string }[] | null) => string | null
	t: (key: string) => string
}

interface UseBookingActionsResult {
	bookingError: string | null
	confirmedBooking: ConfirmedBooking | null
	isSubmitting: boolean
	selectedBooking: BookingDetail | null
	setBookingError: (error: string | null) => void
	setConfirmedBooking: (booking: ConfirmedBooking | null) => void
	handleConfirmWithClient: (data: ClientInfoData) => Promise<void>
	handleCancel: () => Promise<void>
	handleResetSlot: () => void
	handleBookingSelect: (bookingId: string) => Promise<void>
	handleBookingStatusChange: (bookingId: string, status: BookingStatus) => Promise<void>
	handleBookingReschedule: (bookingId: string, newStartAt: string) => Promise<void>
	handleBookingClose: () => void
}

const browserTimezone = (): string =>
	Intl.DateTimeFormat().resolvedOptions().timeZone

const useBookingActions = (
	params: UseBookingActionsParams,
	setParams: (updates: Record<string, string | null>) => void,
): UseBookingActionsResult => {
	const {
		staffId,
		staffList,
		eventTypes,
		selectedEventTypeId,
		selectedSlotTime,
		dateStr,
		reloadBookings,
		getFirstStaffId,
		t,
	} = params

	const [bookingError, setBookingError] = useState<string | null>(null)
	const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null)

	const findEventTypeById = (id: string | null): EventType | undefined =>
		eventTypes.find((e) => e.id === id)

	const handleConfirmWithClient = async (data: ClientInfoData) => {
		if (!selectedEventTypeId || !selectedSlotTime) return

		const resolvedStaffId = staffId ?? getFirstStaffId(staffList)
		if (!resolvedStaffId) return

		const eventType = findEventTypeById(selectedEventTypeId)
		if (!eventType) return

		const startAt = `${dateStr}T${selectedSlotTime}:00.000Z`

		try {
			setIsSubmitting(true)
			const response = await bookingApi.create({
				eventTypeId: selectedEventTypeId,
				staffId: resolvedStaffId,
				startAt,
				timezone: browserTimezone(),
				invitee: {
					name: data.name,
					email: data.email || null,
					phone: data.phone || null,
					phoneCountry: null,
				},
			})

			setConfirmedBooking({
				bookingId: response.id,
				eventTypeId: response.eventTypeId,
				eventTypeName: response.eventTypeName,
				startAt: response.startAt,
				endAt: response.endAt,
				timezone: response.timezone,
				locationId: response.locationId,
				cancelToken: response.cancelToken,
				status: response.status,
				color: eventType.color,
				durationMin: eventType.durationMin,
				price: eventType.price,
				currency: eventType.currency,
				invitee: response.invitee,
			})
		} catch (err) {
			const message = err instanceof Error ? err.message : t('bookingFailed')
			setBookingError(message)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleCancel = async () => {
		if (!confirmedBooking) return

		try {
			await bookingApi.cancelById({
				bookingId: confirmedBooking.bookingId,
				reason: t('cancelledByAdmin'),
			})
			setConfirmedBooking(null)
			setParams({ slot: null })
		} catch (err) {
			const message = err instanceof Error ? err.message : t('cancelFailed')
			setBookingError(message)
		}
	}

	const handleResetSlot = () => {
		setParams({ slot: null })
	}

	const handleBookingSelect = async (bookingId: string) => {
		try {
			setParams({ eventType: null, slot: null })
			setConfirmedBooking(null)
			const detail = await bookingApi.getById(bookingId)
			setSelectedBooking(detail as unknown as BookingDetail)
		} catch (err) {
			const message = err instanceof Error ? err.message : t('loadError')
			setBookingError(message)
		}
	}

	const handleBookingStatusChange = async (bookingId: string, status: BookingStatus) => {
		try {
			await bookingApi.updateStatus(bookingId, status)
			setSelectedBooking(null)
			reloadBookings()
		} catch (err) {
			const message = err instanceof Error ? err.message : t('bookingFailed')
			setBookingError(message)
		}
	}

	const handleBookingReschedule = async (bookingId: string, newStartAt: string) => {
		try {
			await bookingApi.reschedule(bookingId, newStartAt)
			setSelectedBooking(null)
			reloadBookings()
		} catch (err) {
			const message = err instanceof Error ? err.message : t('bookingFailed')
			setBookingError(message)
		}
	}

	const handleBookingClose = () => {
		setSelectedBooking(null)
	}

	return {
		bookingError,
		confirmedBooking,
		isSubmitting,
		selectedBooking,
		setBookingError,
		setConfirmedBooking,
		handleConfirmWithClient,
		handleCancel,
		handleResetSlot,
		handleBookingSelect,
		handleBookingStatusChange,
		handleBookingReschedule,
		handleBookingClose,
	}
}

export type { UseBookingActionsResult }
export { useBookingActions }
