'use client'

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { eventTypeApi } from '@/lib/booking-api-client'
import { positionApi } from '@/services'
import type { Position } from '@/services/configs/position.types'

interface PositionPricingSectionProps {
	eventTypeId: string | null
	orgId: string | null
	basePrice: number
}

export interface PositionPricingHandle {
	save: (eventTypeId: string) => Promise<void>
}

const PositionPricingSection = forwardRef<
	PositionPricingHandle,
	PositionPricingSectionProps
>(({ eventTypeId, orgId, basePrice }, ref) => {
	const t = useTranslations('services')
	const [positions, setPositions] = useState<Position[]>([])
	const [overrides, setOverrides] = useState<Record<string, string>>({})

	useEffect(() => {
		if (!orgId) return
		const load = async () => {
			try {
				const [posRes, pricing] = await Promise.all([
					positionApi.getByOrg({ pathParams: { orgId } }),
					eventTypeId
						? eventTypeApi.getPositionPricing(eventTypeId)
						: Promise.resolve([]),
				])
				setPositions(posRes.data)
				const initial: Record<string, string> = {}
				pricing.forEach((p) => {
					initial[p.positionId] = String(p.price.amount)
				})
				setOverrides(initial)
			} catch {
				// обрабатывается интерцептором
			}
		}
		load()
	}, [orgId, eventTypeId])

	const handleChange =
		(positionId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
			setOverrides((prev) => ({ ...prev, [positionId]: e.target.value }))
		}

	const save = async (idForSave: string) => {
		const toPayload = (positionId: string) => {
			const raw = overrides[positionId]
			const amount = raw === undefined || raw === '' ? null : Number(raw)
			return { positionId, amount }
		}
		const payload = positions.map((p) => toPayload(p.id))
		await eventTypeApi.syncPositionPricing(idForSave, payload)
	}

	useImperativeHandle(ref, () => ({ save }), [save])

	if (!orgId || positions.length === 0) return null

	const renderPositionRow = (position: Position) => (
		<div
			key={position.id}
			className="flex items-center justify-between gap-3 py-2"
		>
			<span className="text-sm">{position.name}</span>
			<Input
				type="number"
				min={0}
				placeholder={String(basePrice)}
				value={overrides[position.id] ?? ''}
				onChange={handleChange(position.id)}
				className="w-32"
			/>
		</div>
	)

	return (
		<div className="space-y-2">
			<Separator />
			<div className="space-y-1">
				<Label>{t('positionPricing')}</Label>
				<p className="text-muted-foreground text-xs">
					{t('positionPricingHint')}
				</p>
			</div>
			<div className="flex flex-col">{positions.map(renderPositionRow)}</div>
		</div>
	)
})

PositionPricingSection.displayName = 'PositionPricingSection'

export { PositionPricingSection }
