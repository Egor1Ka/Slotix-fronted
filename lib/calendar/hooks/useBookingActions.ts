'use client'

import { useState, useEffect } from 'react'
import { bookingApi, bookingFormApi } from '@/lib/booking-api-client'
import type { ConfirmedBooking } from '../types'
import type { EventType } from '@/services/configs/booking.types'
import type { ClientInfoData } from '@/components/booking/ClientInfoForm'
import type { BookingDetail } from '@/components/booking/BookingDetailsPanel'
import type {
	MergedBookingForm,
	CustomFieldValue,
	BookingField,
} from '@/services/configs/booking-field.types'

interface UseBookingActionsParams {
	staffId: string | null
	staffList: { id: string }[]
	eventTypes: EventType[]
	selectedEventTypeId: string | null
	selectedSlotTime: string | null
	dateStr: string
	timezone: string
	reloadBookings: () => void
	getFirstStaffId: (list: { id: string }[] | null) => string | null
	t: (key: string) => string
}

interface UseBookingActionsResult {
	bookingError: string | null
	confirmedBooking: ConfirmedBooking | null
	isSubmitting: boolean
	selectedBooking: BookingDetail | null
	formConfig: MergedBookingForm | null
	setBookingError: (error: string | null) => void
	setConfirmedBooking: (booking: ConfirmedBooking | null) => void
	handleConfirmWithClient: (
		data: ClientInfoData,
		overrides?: { slotTime?: string; date?: string; staffId?: string },
	) => Promise<void>
	handleCancel: () => Promise<void>
	handleResetSlot: () => void
	handleBookingSelect: (bookingId: string) => Promise<void>
	handleBookingStatusChange: (
		bookingId: string,
		statusId: string,
	) => Promise<void>
	handleBookingReschedule: (
		bookingId: string,
		newStartAt: string,
	) => Promise<void>
	handleBookingClose: () => void
}

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
		timezone,
		reloadBookings,
		getFirstStaffId,
		t,
	} = params

	const [bookingError, setBookingError] = useState<string | null>(null)
	const [confirmedBooking, setConfirmedBooking] =
		useState<ConfirmedBooking | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(
		null,
	)
	const [formConfig, setFormConfig] = useState<MergedBookingForm | null>(null)
	const [formReloadTick, setFormReloadTick] = useState(0)

	// Загрузка конфигурации формы бронирования при смене услуги или после букинга
	useEffect(() => {
		if (!selectedEventTypeId) {
			setFormConfig(null)
			return
		}
		const loadFormConfig = async () => {
			try {
				const result = await bookingFormApi.getMergedForm(selectedEventTypeId)
				setFormConfig(result)
			} catch (err) {
				const message = err instanceof Error ? err.message : t('loadError')
				setBookingError(message)
			}
		}
		loadFormConfig()
	}, [selectedEventTypeId, formReloadTick])

	const findEventTypeById = (id: string | null): EventType | undefined =>
		eventTypes.find((e) => e.id === id)

	// Извлечение значений кастомных полей из данных формы
	const isCustomField = (key: string): boolean => key.startsWith('custom_')

	const findFieldLabel = (fieldId: string): string => {
		if (!formConfig) return fieldId
		const match = formConfig.customFields.find((f) => f.id === fieldId)
		return match ? match.label : fieldId
	}

	const toCustomFieldValue =
		(data: Record<string, unknown>): ((key: string) => CustomFieldValue) =>
		(key: string) => {
			const fieldId = key.replace('custom_', '')
			return {
				fieldId,
				label: findFieldLabel(fieldId),
				value: String(data[key] ?? ''),
			}
		}
	const hasValue = (entry: CustomFieldValue): boolean => entry.value.length > 0

	// Извлечение email/phone из кастомных полей для invitee
	const findFieldById = (fieldId: string): BookingField | undefined =>
		formConfig?.customFields.find((f) => f.id === fieldId)

	const isInviteeField = (field: BookingField): boolean =>
		field.type === 'email' || field.type === 'phone'

	const extractInviteeFromCustomFields = (
		data: Record<string, unknown>,
	): { email: string | null; phone: string | null } => {
		let email: string | null = null
		let phone: string | null = null

		const processKey = (key: string) => {
			if (!isCustomField(key)) return
			const fieldId = key.replace('custom_', '')
			const field = findFieldById(fieldId)
			if (!field || !isInviteeField(field)) return
			const value = String(data[key] ?? '')
			if (!value) return
			if (field.type === 'email' && !email) email = value
			if (field.type === 'phone' && !phone) phone = value
		}
		Object.keys(data).forEach(processKey)

		return { email, phone }
	}

	const isNonInviteeCustomField = (key: string): boolean => {
		if (!isCustomField(key)) return false
		const fieldId = key.replace('custom_', '')
		const field = findFieldById(fieldId)
		return !field || !isInviteeField(field)
	}

	const extractCustomFieldValues = (
		data: Record<string, unknown>,
	): CustomFieldValue[] =>
		Object.keys(data)
			.filter(isNonInviteeCustomField)
			.map(toCustomFieldValue(data))
			.filter(hasValue)

	const handleConfirmWithClient = async (
		data: ClientInfoData,
		overrides?: { slotTime?: string; date?: string; staffId?: string },
	) => {
		const resolvedSlotTime = overrides?.slotTime ?? selectedSlotTime
		const resolvedDate = overrides?.date ?? dateStr
		const resolvedStaffId =
			overrides?.staffId ?? staffId ?? getFirstStaffId(staffList)

		if (!selectedEventTypeId || !resolvedSlotTime) return
		if (!resolvedStaffId) return

		const eventType = findEventTypeById(selectedEventTypeId)
		if (!eventType) return

		const startAt = `${resolvedDate}T${resolvedSlotTime}:00`

		const dataRecord = data as Record<string, unknown>
		const inviteeFields = extractInviteeFromCustomFields(dataRecord)
		const customFieldValues = extractCustomFieldValues(dataRecord)

		try {
			setIsSubmitting(true)
			const body = {
				eventTypeId: selectedEventTypeId,
				staffId: resolvedStaffId,
				startAt,
				timezone,
				invitee: {
					name: data.name,
					email: inviteeFields.email,
					phone: inviteeFields.phone,
					phoneCountry: null,
				},
				...(customFieldValues.length > 0 && { customFieldValues }),
			}
			const response = await bookingApi.create(body)
			reloadBookings()
			setFormReloadTick((n) => n + 1)

			setConfirmedBooking({
				bookingId: response.id,
				eventTypeId: response.eventTypeId,
				eventTypeName: response.eventTypeName,
				startAt: response.startAt,
				endAt: response.endAt,
				timezone: response.timezone,
				locationId: response.locationId,
				cancelToken: response.cancelToken,
				statusId: response.statusId,
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
			reloadBookings()
		} catch (err) {
			const message = err instanceof Error ? err.message : t('cancelFailed')
			setBookingError(message)
		}
	}

	const handleResetSlot = () => {
		if (confirmedBooking) reloadBookings()
		setConfirmedBooking(null)
		setParams({ slot: null })
	}

	const handleBookingSelect = async (bookingId: string) => {
		try {
			setParams({ eventType: null, slot: null })
			setConfirmedBooking(null)
			reloadBookings()
			const detail = await bookingApi.getById(bookingId)

			// Обогатить customFieldValues лейблами из конфига формы
			const rawValues =
				(detail as unknown as Record<string, unknown>).customFieldValues ?? []
			const fieldValues = rawValues as {
				fieldId: string
				value: string
				label?: string
			}[]

			let enrichedValues: { fieldId: string; label: string; value: string }[] =
				[]

			if (fieldValues.length > 0) {
				try {
					const formCfg = await bookingFormApi.getMergedForm(detail.eventTypeId)
					const findLabel = (fieldId: string): string => {
						const match = formCfg.customFields.find((f) => f.id === fieldId)
						return match ? match.label : fieldId
					}
					const enrichField = (fv: {
						fieldId: string
						value: string
						label?: string
					}) => ({
						fieldId: fv.fieldId,
						label: fv.label ?? findLabel(fv.fieldId),
						value: fv.value,
					})
					enrichedValues = fieldValues.map(enrichField)
				} catch {
					const useExistingLabel = (fv: {
						fieldId: string
						value: string
						label?: string
					}) => ({
						fieldId: fv.fieldId,
						label: fv.label ?? fv.fieldId,
						value: fv.value,
					})
					enrichedValues = fieldValues.map(useExistingLabel)
				}
			}

			const bookingDetail = {
				...(detail as unknown as BookingDetail),
				customFieldValues: enrichedValues,
			}
			setSelectedBooking(bookingDetail)
		} catch (err) {
			const message = err instanceof Error ? err.message : t('loadError')
			setBookingError(message)
		}
	}

	const handleBookingStatusChange = async (
		bookingId: string,
		statusId: string,
	) => {
		try {
			await bookingApi.updateStatus(bookingId, statusId)
			setSelectedBooking(null)
			reloadBookings()
		} catch (err) {
			const message = err instanceof Error ? err.message : t('bookingFailed')
			setBookingError(message)
		}
	}

	const handleBookingReschedule = async (
		bookingId: string,
		newStartAt: string,
	) => {
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
		formConfig,
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
