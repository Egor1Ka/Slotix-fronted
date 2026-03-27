'use client'

import { useState, useEffect, useCallback } from 'react'
import type { OrgListItem } from '@/services'
import { orgApi } from '@/services'

interface UseUserOrgsResult {
	orgs: OrgListItem[]
	isLoading: boolean
	error: string | null
	refetch: () => void
}

function useUserOrgs(): UseUserOrgsResult {
	const [orgs, setOrgs] = useState<OrgListItem[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchOrgs = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const response = await orgApi.getUserOrgs()
			setOrgs(response.data)
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: 'Failed to fetch organizations'
			setError(message)
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchOrgs()
	}, [fetchOrgs])

	return { orgs, isLoading, error, refetch: fetchOrgs }
}

export { useUserOrgs }
