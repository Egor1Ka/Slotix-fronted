'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { orgApi } from '@/lib/booking-api-client'
import { positionApi } from '@/services'
import type { OrgStaffMember } from '@/services/configs/booking.types'
import type { Position } from '@/services/configs/position.types'

interface StaffPositionAssignmentProps {
	orgId: string
	staff: OrgStaffMember[]
	onStaffUpdated: () => void
}

const NO_POSITION_VALUE = '__none__'

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

function StaffPositionAssignment({
	orgId,
	staff,
	onStaffUpdated,
}: StaffPositionAssignmentProps) {
	const t = useTranslations('positions')
	const [positions, setPositions] = useState<Position[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const loadPositions = async () => {
			try {
				const res = await positionApi.getByOrg({ pathParams: { orgId } })
				setPositions(res.data)
			} catch {
				// обрабатывается интерцептором toast
			} finally {
				setLoading(false)
			}
		}
		loadPositions()
	}, [orgId])

	const handlePositionChange = (staffId: string) => async (value: string) => {
		const newPositionId = value === NO_POSITION_VALUE ? null : value
		try {
			await orgApi.updateStaffPosition(orgId, staffId, newPositionId)
			toast.success(t('positionUpdated'))
			onStaffUpdated()
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t('positionUpdateError')
			toast.error(message)
		}
	}

	const findPositionName = (positionId: string | null | undefined): string => {
		if (!positionId) return t('noPosition')
		const match = positions.find((p) => p.id === positionId)
		return match ? match.name : t('noPosition')
	}

	const renderPositionOption = (position: Position) => (
		<SelectItem key={position.id} value={position.id}>
			{position.name}
		</SelectItem>
	)

	const renderStaffRow = (member: OrgStaffMember) => (
		<div
			key={member.id}
			className="flex items-center justify-between gap-3 py-2.5"
		>
			<div className="flex min-w-0 items-center gap-2">
				<Avatar className="size-7 shrink-0">
					<AvatarImage src={member.avatar} alt={member.name} />
					<AvatarFallback className="text-xs">
						{getInitials(member.name)}
					</AvatarFallback>
				</Avatar>
				<span className="truncate text-sm font-medium">{member.name}</span>
				{member.status === 'invited' && (
					<Badge
						variant="outline"
						className="text-muted-foreground shrink-0 px-1.5 py-0 text-[10px]"
					>
						{t('invited')}
					</Badge>
				)}
			</div>
			<Select
				value={member.positionId ?? NO_POSITION_VALUE}
				onValueChange={handlePositionChange(member.id)}
			>
				<SelectTrigger className="w-48 shrink-0">
					<SelectValue placeholder={t('selectPosition')}>
						{findPositionName(member.positionId)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={NO_POSITION_VALUE}>
						<span className="text-muted-foreground">{t('noPosition')}</span>
					</SelectItem>
					{positions.map(renderPositionOption)}
				</SelectContent>
			</Select>
		</div>
	)

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner className="size-6" />
			</div>
		)
	}

	if (staff.length === 0) {
		return (
			<p className="text-muted-foreground py-12 text-center text-sm">
				{t('noStaff')}
			</p>
		)
	}

	return (
		<div className="rounded-lg border p-4">
			<div className="flex flex-col divide-y">{staff.map(renderStaffRow)}</div>
		</div>
	)
}

export { StaffPositionAssignment }
