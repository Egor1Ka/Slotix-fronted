'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import type { CreateScheduleOverrideBody } from '@/services/configs/booking.types'

interface ScheduleOverrideFormProps {
	staffId: string
	orgId?: string
	onSave: (body: CreateScheduleOverrideBody) => Promise<void>
}

function ScheduleOverrideForm({
	staffId,
	orgId,
	onSave,
}: ScheduleOverrideFormProps) {
	const t = useTranslations('booking')

	const overrideSchema = z.object({
		date: z.string().min(1, t('validation.selectDate')),
		fullDay: z.boolean(),
		breakStart: z
			.string()
			.regex(/^\d{2}:\d{2}$/, t('validation.timeFormat'))
			.optional(),
		breakEnd: z
			.string()
			.regex(/^\d{2}:\d{2}$/, t('validation.timeFormat'))
			.optional(),
		reason: z.string().optional(),
	})

	type OverrideFormData = z.infer<typeof overrideSchema>

	const {
		register,
		handleSubmit,
		control,
		watch,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<OverrideFormData>({
		resolver: zodResolver(overrideSchema),
		defaultValues: {
			date: '',
			fullDay: true,
			breakStart: '10:00',
			breakEnd: '14:00',
			reason: '',
		},
	})

	const fullDay = watch('fullDay')

	const handleFormSubmit = async (data: OverrideFormData) => {
		const breakSlots =
			!data.fullDay && data.breakStart && data.breakEnd
				? [{ start: data.breakStart, end: data.breakEnd }]
				: []

		await onSave({
			staffId,
			...(orgId && { orgId }),
			date: data.date,
			enabled: false,
			slots: breakSlots,
			reason: data.reason || undefined,
		})

		reset()
	}

	return (
		<form
			onSubmit={handleSubmit(handleFormSubmit)}
			className="flex flex-col gap-4"
		>
			<h3 className="text-sm font-semibold">{t('schedule.override')}</h3>

			<Field data-invalid={!!errors.date || undefined}>
				<FieldLabel htmlFor="override-date">{t('schedule.date')}</FieldLabel>
				<Input id="override-date" type="date" {...register('date')} />
				<FieldError errors={[errors.date]} />
			</Field>

			<Field orientation="horizontal">
				<FieldLabel htmlFor="override-fullday">
					{t('schedule.fullDayOff')}
				</FieldLabel>
				<Controller
					control={control}
					name="fullDay"
					render={({ field }) => (
						<Switch
							id="override-fullday"
							checked={field.value}
							onCheckedChange={field.onChange}
						/>
					)}
				/>
			</Field>

			{!fullDay && (
				<div className="flex flex-col gap-1.5">
					<span className="text-muted-foreground text-xs">
						{t('schedule.breakHours')}
					</span>
					<div className="flex items-center gap-2">
						<Input type="time" className="w-28" {...register('breakStart')} />
						<span className="text-muted-foreground text-xs">—</span>
						<Input type="time" className="w-28" {...register('breakEnd')} />
					</div>
				</div>
			)}

			<Separator />

			<Field data-invalid={!!errors.reason || undefined}>
				<FieldLabel htmlFor="override-reason">
					{t('schedule.reason')}
				</FieldLabel>
				<Input
					id="override-reason"
					placeholder={t('schedule.reasonPlaceholder')}
					{...register('reason')}
				/>
				<FieldError errors={[errors.reason]} />
			</Field>

			<Button type="submit" disabled={isSubmitting} className="w-full">
				{isSubmitting ? t('saving') : t('schedule.addException')}
			</Button>
		</form>
	)
}

export { ScheduleOverrideForm }
