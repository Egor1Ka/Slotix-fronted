'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
				<Spinner className="size-6" />
			</div>
		)
	}

	if (!staffId) return null

	return (
		<div className="container max-w-3xl space-y-6 py-6">
			<div className="flex items-center gap-3">
				<h1 className="text-lg font-semibold">{t('mySchedule')}</h1>
				{orgName && (
					<Badge variant="outline" className="text-xs">
						{orgName}
					</Badge>
				)}
			</div>

			<Separator />

			<StaffScheduleTabs staffId={staffId} orgId={orgId} readOnly={false} />
		</div>
	)
}
