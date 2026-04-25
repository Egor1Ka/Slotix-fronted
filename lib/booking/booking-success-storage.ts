'use client'

import type { ConfirmedBooking } from '@/lib/calendar/types'

interface BookingSuccessPayload {
	result: ConfirmedBooking
	staffName: string | null
	staffAvatar: string | null
	returnUrl: string
}

const STORAGE_KEY = 'slotix.booking-success'

const isBrowser = (): boolean => typeof window !== 'undefined'

const saveBookingSuccess = (payload: BookingSuccessPayload): void => {
	if (!isBrowser()) return
	try {
		window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
	} catch {
		// storage не доступний — мовчки ігноруємо
	}
}

const readBookingSuccess = (): BookingSuccessPayload | null => {
	if (!isBrowser()) return null
	try {
		const raw = window.sessionStorage.getItem(STORAGE_KEY)
		if (!raw) return null
		return JSON.parse(raw) as BookingSuccessPayload
	} catch {
		return null
	}
}

const clearBookingSuccess = (): void => {
	if (!isBrowser()) return
	try {
		window.sessionStorage.removeItem(STORAGE_KEY)
	} catch {
		// ignore
	}
}

export {
	saveBookingSuccess,
	readBookingSuccess,
	clearBookingSuccess,
	STORAGE_KEY,
}
export type { BookingSuccessPayload }
