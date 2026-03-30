'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { eventTypeApi, positionApi, orgApi, setServerErrors } from '@/services'
import type { EventType, Position, OrgStaffMember } from '@/services'

const PALETTE = [
	'#8B5CF6',
	'#06B6D4',
	'#F59E0B',
	'#EF4444',
	'#10B981',
	'#3B82F6',
	'#EC4899',
	'#F97316',
]

const serviceSchema = z
	.object({
		name: z.string().min(2),
		durationMin: z.number().min(1),
		price: z.number().min(0),
		color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
		description: z.string().optional(),
		staffPolicy: z.enum(['any', 'by_position', 'specific']),
		assignedPositions: z.array(z.string()),
		assignedStaff: z.array(z.string()),
	})
	.refine(
		(data) => {
			if (data.staffPolicy === 'by_position') {
				return data.assignedPositions.length > 0
			}
			return true
		},
		{ path: ['assignedPositions'], message: 'Select at least one position' },
	)
	.refine(
		(data) => {
			if (data.staffPolicy === 'specific') {
				return data.assignedStaff.length > 0
			}
			return true
		},
		{ path: ['assignedStaff'], message: 'Select at least one staff member' },
	)

type ServiceFormData = z.infer<typeof serviceSchema>

interface ServiceDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	orgId: string
	currency: string
	eventType?: EventType
	onSuccess: () => void
}

function ServiceDialog({
	open,
	onOpenChange,
	orgId,
	currency,
	eventType,
	onSuccess,
}: ServiceDialogProps) {
	const t = useTranslations('services')
	const isEdit = !!eventType

	const [positions, setPositions] = useState<Position[]>([])
	const [staff, setStaff] = useState<OrgStaffMember[]>([])
	const [loadingData, setLoadingData] = useState(false)

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset,
		setError,
		setValue,
		watch,
		control,
	} = useForm<ServiceFormData>({
		resolver: zodResolver(serviceSchema),
		defaultValues: {
			name: '',
			durationMin: 30,
			price: 0,
			color: PALETTE[0],
			description: '',
			staffPolicy: 'any',
			assignedPositions: [],
			assignedStaff: [],
		},
	})

	const selectedColor = watch('color')
	const staffPolicy = watch('staffPolicy')
	const assignedPositions = watch('assignedPositions')
	const assignedStaff = watch('assignedStaff')

	const loadReferenceData = useCallback(async () => {
		setLoadingData(true)
		try {
			const [positionsRes, staffRes] = await Promise.all([
				positionApi.getByOrg({ pathParams: { orgId } }),
				orgApi.getStaff({ pathParams: { id: orgId } }),
			])
			setPositions(positionsRes.data)
			setStaff(staffRes.data)
		} catch {
			// Toast вже показано інтерцептором
		} finally {
			setLoadingData(false)
		}
	}, [orgId])

	useEffect(() => {
		if (open) {
			loadReferenceData()
			reset({
				name: eventType?.name ?? '',
				durationMin: eventType?.durationMin ?? 30,
				price: eventType?.price ?? 0,
				color: eventType?.color ?? PALETTE[0],
				description: eventType?.description ?? '',
				staffPolicy: eventType?.staffPolicy ?? 'any',
				assignedPositions: eventType?.assignedPositions ?? [],
				assignedStaff: eventType?.assignedStaff ?? [],
			})
		}
	}, [open, eventType, reset, loadReferenceData])

	const onSubmit = async (data: ServiceFormData) => {
		try {
			if (isEdit) {
				await eventTypeApi.update({
					pathParams: { id: eventType.id },
					body: {
						name: data.name,
						durationMin: data.durationMin,
						price: data.price,
						currency,
						color: data.color,
						description: data.description,
						staffPolicy: data.staffPolicy,
						assignedPositions:
							data.staffPolicy === 'by_position'
								? data.assignedPositions
								: [],
						assignedStaff:
							data.staffPolicy === 'specific'
								? data.assignedStaff
								: [],
					},
				})
				toast.success(t('updated'))
			} else {
				await eventTypeApi.create({
					body: {
						orgId,
						name: data.name,
						durationMin: data.durationMin,
						price: data.price,
						currency,
						color: data.color,
						description: data.description,
						staffPolicy: data.staffPolicy,
						assignedPositions:
							data.staffPolicy === 'by_position'
								? data.assignedPositions
								: [],
						assignedStaff:
							data.staffPolicy === 'specific'
								? data.assignedStaff
								: [],
					},
				})
				toast.success(t('created'))
			}
			reset()
			onOpenChange(false)
			onSuccess()
		} catch (err) {
			if (!setServerErrors(err, setError)) {
				// Не validation помилка -- toast вже показано інтерцептором
			}
		}
	}

	const selectColor = (color: string) => () => {
		setValue('color', color, { shouldValidate: true })
	}

	const isColorSelected = (color: string) => color === selectedColor

	const renderColorOption = (color: string) => (
		<button
			key={color}
			type="button"
			className={`size-7 rounded-full border-2 transition-transform ${
				isColorSelected(color)
					? 'scale-110 border-foreground'
					: 'border-transparent hover:border-gray-400'
			}`}
			style={{ backgroundColor: color }}
			onClick={selectColor(color)}
		/>
	)

	const togglePosition = (positionId: string) => () => {
		const isSelected = assignedPositions.includes(positionId)
		const next = isSelected
			? assignedPositions.filter((id) => id !== positionId)
			: [...assignedPositions, positionId]
		setValue('assignedPositions', next, { shouldValidate: true })
	}

	const toggleStaff = (staffId: string) => () => {
		const isSelected = assignedStaff.includes(staffId)
		const next = isSelected
			? assignedStaff.filter((id) => id !== staffId)
			: [...assignedStaff, staffId]
		setValue('assignedStaff', next, { shouldValidate: true })
	}

	const renderPositionChip = (position: Position) => {
		const isActive = assignedPositions.includes(position.id)
		return (
			<button
				key={position.id}
				type="button"
				className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
					isActive
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border hover:bg-muted'
				}`}
				onClick={togglePosition(position.id)}
			>
				{position.name}
			</button>
		)
	}

	const renderStaffChip = (member: OrgStaffMember) => {
		const isActive = assignedStaff.includes(member.id)
		return (
			<button
				key={member.id}
				type="button"
				className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
					isActive
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border hover:bg-muted'
				}`}
				onClick={toggleStaff(member.id)}
			>
				{member.name}
			</button>
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isEdit ? t('edit') : t('add')}</DialogTitle>
				</DialogHeader>
				{loadingData ? (
					<div className="flex justify-center py-8">
						<Spinner className="size-6" />
					</div>
				) : (
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<Field data-invalid={!!errors.name || undefined}>
							<FieldLabel htmlFor="service-name">
								{t('name')}
							</FieldLabel>
							<Input
								id="service-name"
								placeholder={t('namePlaceholder')}
								{...register('name')}
							/>
							<FieldError errors={[errors.name]} />
						</Field>

						<div className="grid grid-cols-2 gap-3">
							<Field
								data-invalid={!!errors.durationMin || undefined}
							>
								<FieldLabel htmlFor="service-duration">
									{t('duration')} ({t('durationMin')})
								</FieldLabel>
								<Input
									id="service-duration"
									type="number"
									min={1}
									{...register('durationMin', {
										valueAsNumber: true,
									})}
								/>
								<FieldError errors={[errors.durationMin]} />
							</Field>

							<Field data-invalid={!!errors.price || undefined}>
								<FieldLabel htmlFor="service-price">
									{t('price')} ({currency})
								</FieldLabel>
								<Input
									id="service-price"
									type="number"
									min={0}
									step="0.01"
									{...register('price', {
										valueAsNumber: true,
									})}
								/>
								<FieldError errors={[errors.price]} />
							</Field>
						</div>

						<Field data-invalid={!!errors.color || undefined}>
							<FieldLabel>{t('color')}</FieldLabel>
							<div className="flex flex-wrap gap-2">
								{PALETTE.map(renderColorOption)}
							</div>
							<FieldError errors={[errors.color]} />
						</Field>

						<Field data-invalid={!!errors.description || undefined}>
							<FieldLabel htmlFor="service-description">
								{t('description')}
							</FieldLabel>
							<Textarea
								id="service-description"
								placeholder={t('descriptionPlaceholder')}
								{...register('description')}
							/>
							<FieldError errors={[errors.description]} />
						</Field>

						<Field data-invalid={!!errors.staffPolicy || undefined}>
							<FieldLabel>{t('staffPolicy')}</FieldLabel>
							<Controller
								control={control}
								name="staffPolicy"
								render={({ field }) => (
									<RadioGroup
										value={field.value}
										onValueChange={field.onChange}
										className="gap-3"
									>
										<label className="flex items-center gap-2 text-sm">
											<RadioGroupItem value="any" />
											{t('staffPolicyAny')}
										</label>
										<label className="flex items-center gap-2 text-sm">
											<RadioGroupItem value="by_position" />
											{t('staffPolicyByPosition')}
										</label>
										<label className="flex items-center gap-2 text-sm">
											<RadioGroupItem value="specific" />
											{t('staffPolicySpecific')}
										</label>
									</RadioGroup>
								)}
							/>
							<FieldError errors={[errors.staffPolicy]} />
						</Field>

						{staffPolicy === 'by_position' && (
							<Field
								data-invalid={
									!!errors.assignedPositions || undefined
								}
							>
								<FieldLabel>
									{t('assignedPositions')}
								</FieldLabel>
								{positions.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										{t('selectPositions')}
									</p>
								) : (
									<div className="flex flex-wrap gap-2">
										{positions.map(renderPositionChip)}
									</div>
								)}
								<FieldError
									errors={[errors.assignedPositions]}
								/>
							</Field>
						)}

						{staffPolicy === 'specific' && (
							<Field
								data-invalid={
									!!errors.assignedStaff || undefined
								}
							>
								<FieldLabel>{t('assignedStaff')}</FieldLabel>
								{staff.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										{t('selectStaff')}
									</p>
								) : (
									<div className="flex flex-wrap gap-2">
										{staff.map(renderStaffChip)}
									</div>
								)}
								<FieldError errors={[errors.assignedStaff]} />
							</Field>
						)}

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								{t('cancel')}
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isEdit ? t('edit') : t('add')}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	)
}

export { ServiceDialog }
