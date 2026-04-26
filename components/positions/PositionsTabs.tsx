'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PositionList } from '@/components/positions/PositionList'
import { StaffPositionAssignment } from '@/components/positions/StaffPositionAssignment'
import { orgApi } from '@/lib/booking-api-client'
import type { OrgStaffMember } from '@/services/configs/booking.types'

interface PositionsTabsProps {
	orgId: string
}

function PositionsTabs({ orgId }: PositionsTabsProps) {
	const t = useTranslations('positions')
	const [staff, setStaff] = useState<OrgStaffMember[]>([])

	const loadStaff = async () => {
		try {
			const data = await orgApi.getStaff(orgId)
			setStaff(data)
		} catch {
			// toast вже показано інтерцептором
		}
	}

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
		loadStaff()
	}, [orgId])

	return (
		<Tabs defaultValue="positions">
			<TabsList className="w-full">
				<TabsTrigger value="positions">{t('tabPositions')}</TabsTrigger>
				<TabsTrigger value="assignments">{t('tabAssignments')}</TabsTrigger>
			</TabsList>
			<TabsContent value="positions" className="pt-4">
				<PositionList orgId={orgId} />
			</TabsContent>
			<TabsContent value="assignments" className="pt-4">
				<StaffPositionAssignment
					orgId={orgId}
					staff={staff}
					onStaffUpdated={loadStaff}
				/>
			</TabsContent>
		</Tabs>
	)
}

export { PositionsTabs }
