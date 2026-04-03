'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { ViewMode } from '../types'
interface UseCalendarNavigationParams {
	orgSlug?: string
	dateStr: string
	selectedEventTypeId: string | null
}

interface UseCalendarNavigationResult {
	setParams: (updates: Record<string, string | null>) => void
	handleViewChange: (newView: ViewMode) => void
	handleDateChange: (newDate: string) => void
	handleDayClick: (newDate: string) => void
	handleStaffSelect: (id: string | null) => void
	handleStaffAutoSelect: (id: string) => void
	handleEventTypeSelect: (eventTypeId: string) => void
	handleSlotSelect: (time: string, slotDate?: string) => void
}

const useCalendarNavigation = (
	params: UseCalendarNavigationParams,
): UseCalendarNavigationResult => {
	const { orgSlug, dateStr, selectedEventTypeId } = params
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()

	const setParams = (updates: Record<string, string | null>) => {
		const urlParams = new URLSearchParams(searchParams.toString())
		const applyEntry = ([key, value]: [string, string | null]) => {
			if (value === null) urlParams.delete(key)
			else urlParams.set(key, value)
		}
		Object.entries(updates).forEach(applyEntry)
		router.replace(`?${urlParams.toString()}`, { scroll: false })
	}

	const handleViewChange = (newView: ViewMode) => {
		setParams({ view: newView, slot: null })
	}

	const handleDateChange = (newDate: string) => {
		setParams({ date: newDate, slot: null })
	}

	const handleDayClick = (newDate: string) => {
		setParams({ date: newDate, view: 'day', slot: null })
	}

	const buildOrgBasePath = (): string => {
		if (!orgSlug) return pathname
		const parts = pathname.split('/')
		const orgIdIndex = parts.indexOf(orgSlug)
		return parts.slice(0, orgIdIndex + 1).join('/')
	}

	const handleStaffSelect = (id: string | null) => {
		if (!orgSlug) return
		const basePath = buildOrgBasePath()
		const urlParams = new URLSearchParams(searchParams.toString())
		urlParams.delete('slot')
		const query = urlParams.toString()
		const suffix = query ? `?${query}` : ''
		const target = id ? `${basePath}/${id}${suffix}` : `${basePath}${suffix}`
		router.replace(target, { scroll: false })
	}

	// Автовыбор сотрудника при фильтрации — сохраняет eventType в URL
	const handleStaffAutoSelect = (id: string) => {
		if (!orgSlug) return
		const basePath = buildOrgBasePath()
		const urlParams = new URLSearchParams(searchParams.toString())
		urlParams.delete('slot')
		const query = urlParams.toString()
		const suffix = query ? `?${query}` : ''
		const target = `${basePath}/${id}${suffix}`
		router.replace(target, { scroll: false })
	}

	const handleEventTypeSelect = (eventTypeId: string) => {
		const isDeselect = eventTypeId === selectedEventTypeId
		setParams({ eventType: isDeselect ? null : eventTypeId, slot: null })
	}

	const handleSlotSelect = (time: string, slotDate?: string) => {
		const updates: Record<string, string | null> = { slot: time }
		if (slotDate && slotDate !== dateStr) updates.date = slotDate
		setParams(updates)
	}

	return {
		setParams,
		handleViewChange,
		handleDateChange,
		handleDayClick,
		handleStaffSelect,
		handleStaffAutoSelect,
		handleEventTypeSelect,
		handleSlotSelect,
	}
}

export type { UseCalendarNavigationResult }
export { useCalendarNavigation }
