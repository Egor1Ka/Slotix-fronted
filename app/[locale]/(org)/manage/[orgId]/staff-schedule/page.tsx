'use client'

import { useState, useEffect } from 'react'
import {
	useParams,
	useSearchParams,
	useRouter,
	usePathname,
} from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Users } from 'lucide-react'
import {
	Empty,
	EmptyHeader,
	EmptyTitle,
	EmptyDescription,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
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
				<Spinner className="size-6" />
			</div>
		)
	}

	return (
		<div className="max-w-3xl space-y-6 px-4 py-6">
			<div className="space-y-4">
				<h1 className="text-lg font-semibold">{t('staffSchedule')}</h1>
				<StaffFilter
					staff={staffList}
					selectedId={staffId}
					onSelect={handleSelectStaff}
				/>
			</div>

			<Separator />

			{staffId ? (
				<StaffScheduleTabs
					key={staffId}
					staffId={staffId}
					orgId={orgId}
					readOnly
				/>
			) : (
				<Empty className="rounded-xl border border-dashed py-12">
					<EmptyHeader>
						<Users className="text-muted-foreground mx-auto mb-2 size-8" />
						<EmptyTitle>{t('selectStaffDescription')}</EmptyTitle>
						<EmptyDescription>{t('selectStaffHint')}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</div>
	)
}
