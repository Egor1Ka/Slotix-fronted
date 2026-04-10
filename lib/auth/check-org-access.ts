import 'server-only'

import { cookies } from 'next/headers'
import type { OrgMembership } from '@/services/configs/org.types'

interface ApiResponse<T> {
	statusCode: number
	status: string
	data: T
}

export async function checkOrgAccess(
	orgId: string,
): Promise<OrgMembership | null> {
	const cookieStore = await cookies()
	const accessToken = cookieStore.get('accessToken')?.value

	if (!accessToken) return null

	const backendUrl = process.env.BACKEND_URL ?? ''

	try {
		const response = await fetch(
			`${backendUrl}/api/org/${orgId}/my-membership`,
			{
				headers: { Cookie: `accessToken=${accessToken}` },
				cache: 'no-store',
			},
		)

		if (!response.ok) return null

		const json: ApiResponse<OrgMembership> = await response.json()
		return json.data
	} catch {
		return null
	}
}
