'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Trash2, Pencil, Plus } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { BookingFieldEditor } from '@/components/booking/BookingFieldEditor'
import {
	PositionPricingSection,
	type PositionPricingHandle,
} from './PositionPricingSection'
import { eventTypeApi, positionApi, orgApi, setServerErrors } from '@/services'
import { bookingFieldApi } from '@/lib/booking-api-client'
import type { EventType, Position, OrgStaffMember } from '@/services'
import type {
	BookingField,
	BookingFieldType,
} from '@/services/configs/booking-field.types'

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

const baseServiceSchema = z.object({
	name: z.string().min(2),
	durationMin: z.number().min(1),
	price: z.number().min(0),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	description: z.string().optional(),
})

const orgServiceSchema = baseServiceSchema
	.extend({
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

const personalServiceSchema = baseServiceSchema

type OrgServiceFormData = z.infer<typeof orgServiceSchema>
type PersonalServiceFormData = z.infer<typeof personalServiceSchema>
type ServiceFormData = OrgServiceFormData | PersonalServiceFormData

// ── Component ──

interface ServiceDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	ownerId: string
	ownerType: 'org' | 'user'
	currency: string
	eventType?: EventType
	onSuccess: () => void
}

function ServiceDialog({
	open,
	onOpenChange,
	ownerId,
	ownerType,
	currency,
	eventType,
	onSuccess,
}: ServiceDialogProps) {
	const t = useTranslations('services')
	const isEdit = !!eventType
	const isOrg = ownerType === 'org'

	const [positions, setPositions] = useState<Position[]>([])
	const [staff, setStaff] = useState<OrgStaffMember[]>([])
	const [loadingData, setLoadingData] = useState(false)

	// ── Per-service custom fields state ──
	const [customFields, setCustomFields] = useState<BookingField[]>([])
	const [editingField, setEditingField] = useState<BookingField | null>(null)
	const [isAddingField, setIsAddingField] = useState(false)
	const [isSavingField, setIsSavingField] = useState(false)

	// ── Position pricing ──
	const pricingRef = useRef<PositionPricingHandle>(null)

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
		resolver: zodResolver(isOrg ? orgServiceSchema : personalServiceSchema),
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

	// ── Load reference data ──

	const loadReferenceData = useCallback(async () => {
		if (!isOrg) return
		setLoadingData(true)
		try {
			const [positionsRes, staffRes] = await Promise.all([
				positionApi.getByOrg({ pathParams: { orgId: ownerId } }),
				orgApi.getStaff({ pathParams: { id: ownerId } }),
			])
			setPositions(positionsRes.data)
			setStaff(staffRes.data)
		} catch {
			// Toast вже показано інтерцептором
		} finally {
			setLoadingData(false)
		}
	}, [ownerId, isOrg])

	// ── Load per-service custom fields ──

	const loadCustomFields = useCallback(async () => {
		if (!eventType) return
		try {
			const fields = await bookingFieldApi.getFields(
				ownerId,
				ownerType,
				eventType.id,
			)
			setCustomFields(fields)
		} catch {
			// Toast вже показано інтерцептором
		}
	}, [ownerId, ownerType, eventType])

	useEffect(() => {
		if (open) {
			loadReferenceData()
			loadCustomFields()

			const baseDefaults = {
				name: eventType?.name ?? '',
				durationMin: eventType?.durationMin ?? 30,
				price: eventType?.price ?? 0,
				color: eventType?.color ?? PALETTE[0],
				description: eventType?.description ?? '',
			}

			const orgDefaults = isOrg
				? {
						staffPolicy: eventType?.staffPolicy ?? 'any',
						assignedPositions: eventType?.assignedPositions ?? [],
						assignedStaff: eventType?.assignedStaff ?? [],
					}
				: {}

			reset({ ...baseDefaults, ...orgDefaults })
			setCustomFields([])
			setEditingField(null)
			setIsAddingField(false)
		}
	}, [open, eventType, reset, loadReferenceData, loadCustomFields, isOrg])

	// ── Submit ──

	const onSubmit = async (data: ServiceFormData) => {
		try {
			const ownerField = isOrg ? { orgId: ownerId } : { userId: ownerId }
			const staffFields = isOrg
				? {
						staffPolicy: (data as OrgServiceFormData).staffPolicy,
						assignedPositions:
							(data as OrgServiceFormData).staffPolicy === 'by_position'
								? (data as OrgServiceFormData).assignedPositions
								: [],
						assignedStaff:
							(data as OrgServiceFormData).staffPolicy === 'specific'
								? (data as OrgServiceFormData).assignedStaff
								: [],
					}
				: {}

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
						...staffFields,
					},
				})

				if (isOrg) {
					await pricingRef.current?.save(eventType.id)
				}

				// Сохранить кастомные поля per-service
				const existingFields = await bookingFieldApi.getFields(
					ownerId,
					ownerType,
					eventType.id,
				)
				const existingIds = existingFields.map((f: BookingField) => f.id)
				const currentIds = customFields.map((f) => f.id)

				// Удалить поля которых больше нет
				const isRemoved = (id: string) => !currentIds.includes(id)
				const removedIds = existingIds.filter(isRemoved)
				const removeField = (id: string) => bookingFieldApi.remove(id)
				await Promise.all(removedIds.map(removeField))

				// Создать новые (local- prefix)
				const isNewField = (f: BookingField) => f.id.startsWith('local-')
				const createField = (f: BookingField) =>
					bookingFieldApi.create({
						ownerId,
						ownerType,
						eventTypeId: eventType.id,
						type: f.type,
						label: f.label,
						required: f.required,
					})
				await Promise.all(customFields.filter(isNewField).map(createField))

				// Обновить существующие
				const isExistingChanged = (f: BookingField) =>
					!f.id.startsWith('local-') && existingIds.includes(f.id)
				const updateField = (f: BookingField) =>
					bookingFieldApi.update(f.id, {
						label: f.label,
						type: f.type,
						required: f.required,
					})
				await Promise.all(
					customFields.filter(isExistingChanged).map(updateField),
				)

				toast.success(t('updated'))
			} else {
				const created = await eventTypeApi.create({
					body: {
						...ownerField,
						name: data.name,
						durationMin: data.durationMin,
						price: data.price,
						currency,
						color: data.color,
						description: data.description,
						...staffFields,
					},
				})
				if (isOrg && created.data?.id) {
					await pricingRef.current?.save(created.data.id)
				}
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

	// ── Color helpers ──

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
					? 'border-foreground scale-110'
					: 'border-transparent hover:border-gray-400'
			}`}
			style={{ backgroundColor: color }}
			onClick={selectColor(color)}
		/>
	)

	// ── Staff assignment helpers ──

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

	// ── Per-service custom fields handlers ──

	const tBooking = useTranslations('booking')

	const TYPE_LABELS: Record<BookingFieldType, string> = {
		text: tBooking('bookingForm.typeText'),
		textarea: tBooking('bookingForm.typeTextarea'),
		email: tBooking('bookingForm.typeEmail'),
		phone: tBooking('bookingForm.typePhone'),
	}

	const handleStartAddField = useCallback(() => {
		setEditingField(null)
		setIsAddingField(true)
	}, [])

	const handleStartEditField = useCallback((field: BookingField) => {
		setEditingField(field)
		setIsAddingField(true)
	}, [])

	const handleCancelField = useCallback(() => {
		setEditingField(null)
		setIsAddingField(false)
	}, [])

	const handleSaveField = useCallback(
		(data: { label: string; type: BookingFieldType; required: boolean }) => {
			if (editingField) {
				const updateField = (f: BookingField): BookingField =>
					f.id === editingField.id ? { ...f, ...data } : f
				setCustomFields((prev) => prev.map(updateField))
			} else {
				const newField: BookingField = {
					id: `local-${Date.now()}`,
					ownerId,
					ownerType,
					eventTypeId: eventType?.id ?? null,
					type: data.type,
					label: data.label,
					required: data.required,
					createdAt: new Date().toISOString(),
				}
				setCustomFields((prev) => [...prev, newField])
			}
			setEditingField(null)
			setIsAddingField(false)
		},
		[editingField, ownerId, ownerType, eventType],
	)

	const handleDeleteField = useCallback((fieldId: string) => {
		const isNotTarget = (f: BookingField) => f.id !== fieldId
		setCustomFields((prev) => prev.filter(isNotTarget))
	}, [])

	const createFieldEditHandler = (field: BookingField) => () => {
		handleStartEditField(field)
	}

	const createFieldDeleteHandler = (fieldId: string) => () => {
		handleDeleteField(fieldId)
	}

	const renderCustomFieldItem = (field: BookingField) => (
		<div
			key={field.id}
			className="flex items-center justify-between rounded-lg border p-3"
		>
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium">{field.label}</span>
				<Badge variant="secondary">{TYPE_LABELS[field.type]}</Badge>
				{field.required && (
					<Badge variant="outline">{t('bookingForm.required')}</Badge>
				)}
			</div>
			<div className="flex gap-1">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={createFieldEditHandler(field)}
				>
					<Pencil className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={createFieldDeleteHandler(field.id)}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)

	const orgErrors = errors as unknown as FieldErrors<OrgServiceFormData>

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
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
							<FieldLabel htmlFor="service-name">{t('name')}</FieldLabel>
							<Input
								id="service-name"
								placeholder={t('namePlaceholder')}
								{...register('name')}
							/>
							<FieldError errors={[errors.name]} />
						</Field>

						<div className="grid grid-cols-2 gap-3">
							<Field data-invalid={!!errors.durationMin || undefined}>
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

						{isOrg && (
							<PositionPricingSection
								ref={pricingRef}
								eventTypeId={eventType?.id ?? null}
								orgId={ownerId}
								basePrice={watch('price') || 0}
							/>
						)}

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
								className="break-all"
								{...register('description')}
							/>
							<FieldError errors={[errors.description]} />
						</Field>

						{isOrg && (
							<>
								<Field data-invalid={!!orgErrors.staffPolicy || undefined}>
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
									<FieldError errors={[orgErrors.staffPolicy]} />
								</Field>

								{staffPolicy === 'by_position' && (
									<Field
										data-invalid={!!orgErrors.assignedPositions || undefined}
									>
										<FieldLabel>{t('assignedPositions')}</FieldLabel>
										{positions.length === 0 ? (
											<p className="text-muted-foreground text-sm">
												{t('selectPositions')}
											</p>
										) : (
											<div className="flex flex-wrap gap-2">
												{positions.map(renderPositionChip)}
											</div>
										)}
										<FieldError errors={[orgErrors.assignedPositions]} />
									</Field>
								)}

								{staffPolicy === 'specific' && (
									<Field data-invalid={!!orgErrors.assignedStaff || undefined}>
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
										<FieldError errors={[orgErrors.assignedStaff]} />
									</Field>
								)}
							</>
						)}

						{/* Секція: Кастомні поля для цієї послуги */}
						<Separator className="my-4" />
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h4 className="font-medium">{t('bookingForm.customFields')}</h4>
								{isEdit && !isAddingField && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleStartAddField}
									>
										<Plus className="mr-1 h-4 w-4" />
										{t('bookingForm.addField')}
									</Button>
								)}
							</div>

							{!isEdit && (
								<p className="text-muted-foreground text-sm">
									{t('bookingForm.saveFirst')}
								</p>
							)}

							{isEdit && isAddingField && (
								<BookingFieldEditor
									field={editingField}
									onSave={handleSaveField}
									onCancel={handleCancelField}
									isSaving={isSavingField}
								/>
							)}

							{isEdit && customFields.length === 0 && !isAddingField && (
								<p className="text-muted-foreground text-sm">
									{t('bookingForm.noCustomFields')}
								</p>
							)}

							{isEdit && customFields.length > 0 && (
								<div className="space-y-2">
									{customFields.map(renderCustomFieldItem)}
								</div>
							)}
						</div>

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
