'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScheduleViewTab } from './ScheduleViewTab'
import { OverridesTab } from './OverridesTab'
import { BookingsTab } from './BookingsTab'

interface StaffScheduleTabsProps {
	staffId: string
	orgId: string
	readOnly: boolean
}

const TAB_VALUES = ['schedule', 'overrides', 'bookings'] as const
type TabValue = (typeof TAB_VALUES)[number]

const isValidTab = (value: string | null): value is TabValue =>
	TAB_VALUES.includes(value as TabValue)

function StaffScheduleTabs({ staffId, orgId, readOnly }: StaffScheduleTabsProps) {
	const t = useTranslations('staffSchedule')
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()

	const tabParam = searchParams.get('tab')
	const activeTab: TabValue = isValidTab(tabParam) ? tabParam : 'schedule'

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString())
		params.set('tab', value)
		router.replace(`${pathname}?${params.toString()}`)
	}

	return (
		<Tabs value={activeTab} onValueChange={handleTabChange}>
			<TabsList className="w-full">
				<TabsTrigger value="schedule" className="flex-1">
					{t('scheduleTab')}
				</TabsTrigger>
				<TabsTrigger value="overrides" className="flex-1">
					{t('overridesTab')}
				</TabsTrigger>
				<TabsTrigger value="bookings" className="flex-1">
					{t('bookingsTab')}
				</TabsTrigger>
			</TabsList>
			<TabsContent value="schedule">
				<ScheduleViewTab staffId={staffId} orgId={orgId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="overrides">
				<OverridesTab staffId={staffId} orgId={orgId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="bookings">
				<BookingsTab staffId={staffId} orgId={orgId} readOnly={readOnly} />
			</TabsContent>
		</Tabs>
	)
}

export { StaffScheduleTabs }
