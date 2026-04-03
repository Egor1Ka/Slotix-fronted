'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { SettingsIcon } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import {
	Sheet,
	SheetTrigger,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet'
import { ScheduleEditor } from './ScheduleEditor'
import { ScheduleOverrideForm } from './ScheduleOverrideForm'
import { SlotModeSelector } from './SlotModeSelector'
import type { SlotMode } from '@/lib/slot-engine'
import type {
	ScheduleTemplate,
	WeeklyHours,
	CreateScheduleOverrideBody,
} from '@/services/configs/booking.types'

interface ScheduleSheetButtonProps {
	schedule: ScheduleTemplate
	onSaveSchedule: (weeklyHours: WeeklyHours[]) => Promise<void>
	onSaveOverride: (body: CreateScheduleOverrideBody) => Promise<void>
	onSaveSlotMode: (mode: SlotMode) => Promise<void>
}

function ScheduleSheetButton({
	schedule,
	onSaveSchedule,
	onSaveOverride,
	onSaveSlotMode,
}: ScheduleSheetButtonProps) {
	const t = useTranslations('booking')
	const [open, setOpen] = useState(false)
	const [savingMode, setSavingMode] = useState(false)
	const [localSlotMode, setLocalSlotMode] = useState(schedule.slotMode)

	useEffect(() => {
		setLocalSlotMode(schedule.slotMode)
	}, [schedule.slotMode])

	const handleSlotModeChange = async (mode: SlotMode) => {
		setLocalSlotMode(mode)
		setSavingMode(true)
		try {
			await onSaveSlotMode(mode)
		} finally {
			setSavingMode(false)
		}
	}

	const handleSaveSchedule = async (weeklyHours: WeeklyHours[]) => {
		await onSaveSchedule(weeklyHours)
		setOpen(false)
	}

	const handleSaveOverride = async (body: CreateScheduleOverrideBody) => {
		await onSaveOverride(body)
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors">
				<SettingsIcon className="size-4" />
				{t('schedule.settings')}
			</SheetTrigger>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{t('schedule.settings')}</SheetTitle>
					<SheetDescription>
						{t('schedule.settingsDescription')}
					</SheetDescription>
				</SheetHeader>
				<div className="flex flex-col gap-6 py-4">
					<ScheduleEditor schedule={schedule} onSave={handleSaveSchedule} />
					<Separator />
					<div className={savingMode ? 'pointer-events-none opacity-50' : ''}>
						<SlotModeSelector
							value={localSlotMode}
							onChange={handleSlotModeChange}
						/>
					</div>
					<Separator />
					<ScheduleOverrideForm
						staffId={schedule.staffId}
						orgId={schedule.orgId ?? undefined}
						onSave={handleSaveOverride}
					/>
				</div>
			</SheetContent>
		</Sheet>
	)
}

export { ScheduleSheetButton }
