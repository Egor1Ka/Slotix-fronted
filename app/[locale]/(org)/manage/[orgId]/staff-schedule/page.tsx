'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Empty } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { StaffFilter } from '@/components/staff-schedule/StaffFilter'
import { StaffScheduleTabs } from '@/components/staff-schedule/StaffScheduleTabs'
import { orgApi } from '@/lib/booking-api-client'
import type { OrgStaffMember } from '@/services/configs/booking.types'

export default function AdminStaffSchedulePage() {
	const params = useParams<{ orgId: string }>()
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()
	const t = useTranslations('staffSchedule')

	const orgId = params.orgId
	const staffId = searchParams.get('staffId')

	const [staffList, setStaffList] = useState<OrgStaffMember[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchStaff = async () => {
			try {
				const data = await orgApi.getStaff(orgId)
				setStaffList(data)
			} catch {
				// обрабатывается интерцептором toast
			} finally {
				setLoading(false)
			}
		}

		fetchStaff()
	}, [orgId])

	const handleSelectStaff = (id: string) => {
		const queryParams = new URLSearchParams(searchParams.toString())
		queryParams.set('staffId', id)
		queryParams.delete('tab')
		router.replace(`${pathname}?${queryParams.toString()}`)
	}

	if (loading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<Spinner />
			</div>
		)
	}

	return (
		<div className="container max-w-3xl py-6">
			<h1 className="mb-4 text-lg font-semibold">{t('staffSchedule')}</h1>

			<StaffFilter
				staff={staffList}
				selectedId={staffId}
				onSelect={handleSelectStaff}
			/>

			<div className="mt-6">
				{staffId ? (
					<StaffScheduleTabs
						key={staffId}
						staffId={staffId}
						orgId={orgId}
						readOnly
					/>
				) : (
					<Empty>{t('selectStaffDescription')}</Empty>
				)}
			</div>
		</div>
	)
}
