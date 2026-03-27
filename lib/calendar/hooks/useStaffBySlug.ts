'use client'

import { useState, useEffect, useRef } from 'react'
import { staffApi } from '@/lib/booking-api-client'
import type { StaffBySlugResponse } from '@/services/configs/booking.types'

interface UseStaffBySlugResult {
	staff: StaffBySlugResponse | null
	loading: boolean
	error: string | null
}

const useStaffBySlug = (slug: string): UseStaffBySlugResult => {
	const [staff, setStaff] = useState<StaffBySlugResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const loadedSlugRef = useRef<string | null>(null)

	useEffect(() => {
		if (loadedSlugRef.current === slug) return

		const loadStaff = async () => {
			setLoading(true)
			setError(null)
			try {
				const data = await staffApi.getById(slug)
				setStaff(data)
				loadedSlugRef.current = slug
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Failed to load staff'
				setError(message)
			} finally {
				setLoading(false)
			}
		}

		loadStaff()
	}, [slug])

	return { staff, loading, error }
}

export type { UseStaffBySlugResult }
export { useStaffBySlug }
