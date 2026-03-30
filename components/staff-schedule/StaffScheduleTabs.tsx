'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Calendar, CalendarOff, ClipboardList } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScheduleViewTab } from './ScheduleViewTab'
import { OverridesTab } from './OverridesTab'
import { BookingsTab } from './BookingsTab'

interface StaffScheduleTabsProps {
	staffId: string
	orgId?: string
	readOnly: boolean
}

const TAB_VALUES = ['schedule', 'overrides', 'bookings'] as const
type TabValue = (typeof TAB_VALUES)[number]

const isValidTab = (value: string | null): value is TabValue =>
	TAB_VALUES.includes(value as TabValue)

function StaffScheduleTabs({
	staffId,
	orgId,
	readOnly,
}: StaffScheduleTabsProps) {
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
		<Tabs
			data-slot="staff-schedule-tabs"
			value={activeTab}
			onValueChange={handleTabChange}
		>
			<TabsList className="w-full">
				<TabsTrigger value="schedule" className="flex-1 gap-1.5">
					<Calendar className="size-3.5" />
					{t('scheduleTab')}
				</TabsTrigger>
				<TabsTrigger value="overrides" className="flex-1 gap-1.5">
					<CalendarOff className="size-3.5" />
					{t('overridesTab')}
				</TabsTrigger>
				<TabsTrigger value="bookings" className="flex-1 gap-1.5">
					<ClipboardList className="size-3.5" />
					{t('bookingsTab')}
				</TabsTrigger>
			</TabsList>
			<TabsContent value="schedule" className="pt-4">
				<ScheduleViewTab staffId={staffId} orgId={orgId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="overrides" className="pt-4">
				<OverridesTab staffId={staffId} orgId={orgId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="bookings" className="pt-4">
				<BookingsTab staffId={staffId} orgId={orgId} readOnly={readOnly} />
			</TabsContent>
		</Tabs>
	)
}

export { StaffScheduleTabs }
