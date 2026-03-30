'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { StaffScheduleTabs } from '@/components/staff-schedule/StaffScheduleTabs'
import { useUser } from '@/lib/auth/user-provider'
import { orgApi } from '@/lib/booking-api-client'
import type { OrgStaffMember } from '@/services/configs/booking.types'

export default function MySchedulePage() {
	const params = useParams<{ orgId: string }>()
	const user = useUser()
	const t = useTranslations('staffSchedule')

	const orgId = params.orgId

	const [staffId, setStaffId] = useState<string | null>(null)
	const [orgName, setOrgName] = useState<string>('')
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [staffList, orgData] = await Promise.all([
					orgApi.getStaff(orgId),
					orgApi.getById(orgId),
				])

				setOrgName(orgData.name)

				// Находим staff member текущего пользователя по userId
				const findCurrentStaff = (member: OrgStaffMember): boolean =>
					member.id === user.id

				const currentStaff = staffList.find(findCurrentStaff)
				if (currentStaff) {
					setStaffId(currentStaff.id)
				}
			} catch {
				// обрабатывается интерцептором toast
			} finally {
				setLoading(false)
			}
		}

		fetchData()
	}, [orgId, user.id])

	if (loading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<Spinner />
			</div>
		)
	}

	if (!staffId) return null

	return (
		<div className="container max-w-3xl py-6">
			<h1 className="mb-4 text-lg font-semibold">
				{t('mySchedule')} — {orgName}
			</h1>

			<StaffScheduleTabs staffId={staffId} orgId={orgId} readOnly={false} />
		</div>
	)
}
