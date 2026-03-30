'use client'

import { useTranslations } from 'next-intl'
import { Separator } from '@/components/ui/separator'
import { StaffScheduleTabs } from '@/components/staff-schedule/StaffScheduleTabs'
import { useUser } from '@/lib/auth/user-provider'

export default function PersonalMySchedulePage() {
	const user = useUser()
	const t = useTranslations('staffSchedule')

	return (
		<div className="max-w-3xl space-y-6 px-4 py-6">
			<h1 className="text-lg font-semibold">{t('mySchedule')}</h1>
			<Separator />
			<StaffScheduleTabs staffId={user.id} readOnly={false} />
		</div>
	)
}
