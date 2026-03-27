'use client'

import { useState, useEffect, useRef } from 'react'
import { orgApi } from '@/lib/booking-api-client'
import type { OrgByIdResponse, OrgStaffMember } from '@/services/configs/booking.types'

interface UseOrgInfoResult {
	org: OrgByIdResponse | null
	staffList: OrgStaffMember[]
	loading: boolean
	error: string | null
}

const useOrgInfo = (orgSlug: string): UseOrgInfoResult => {
	const [org, setOrg] = useState<OrgByIdResponse | null>(null)
	const [staffList, setStaffList] = useState<OrgStaffMember[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const loadedSlugRef = useRef<string | null>(null)
	const hasLoadedRef = useRef(false)

	useEffect(() => {
		if (loadedSlugRef.current === orgSlug) return

		const loadOrg = async () => {
			if (!hasLoadedRef.current) setLoading(true)
			setError(null)

			try {
				const [orgData, staff] = await Promise.all([
					orgApi.getById(orgSlug),
					orgApi.getStaff(orgSlug),
				])
				setOrg(orgData)
				setStaffList(staff)
				loadedSlugRef.current = orgSlug
				hasLoadedRef.current = true
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to load organization'
				setError(message)
			} finally {
				setLoading(false)
			}
		}

		loadOrg()
	}, [orgSlug])

	return { org, staffList, loading, error }
}

export type { UseOrgInfoResult }
export { useOrgInfo }
