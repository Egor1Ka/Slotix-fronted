'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import type {
	BookingField,
	BookingFieldType,
} from '@/services/configs/booking-field.types'

const FIELD_TYPES: BookingFieldType[] = ['text', 'textarea', 'email', 'phone']

const schema = z.object({
	label: z.string().min(1),
	type: z.enum(['email', 'phone', 'text', 'textarea']),
	required: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface BookingFieldEditorProps {
	field?: BookingField | null
	onSave: (data: {
		label: string
		type: BookingFieldType
		required: boolean
	}) => void
	onCancel: () => void
	isSaving: boolean
}

function BookingFieldEditor({
	field,
	onSave,
	onCancel,
	isSaving,
}: BookingFieldEditorProps) {
	const t = useTranslations('booking')

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			label: field?.label ?? '',
			type: field?.type ?? 'text',
			required: field?.required ?? false,
		},
	})

	const TYPE_LABELS: Record<BookingFieldType, string> = {
		text: t('bookingForm.typeText'),
		textarea: t('bookingForm.typeTextarea'),
		email: t('bookingForm.typeEmail'),
		phone: t('bookingForm.typePhone'),
	}

	const renderTypeOption = (type: BookingFieldType) => (
		<SelectItem key={type} value={type}>
			{TYPE_LABELS[type]}
		</SelectItem>
	)

	return (
		<form
			onSubmit={handleSubmit(onSave)}
			className="space-y-4 rounded-lg border p-4"
		>
			<Field data-invalid={!!errors.label || undefined}>
				<FieldLabel htmlFor="field-label">
					{t('bookingForm.fieldLabel')}
				</FieldLabel>
				<Input id="field-label" {...register('label')} />
				<FieldError errors={[errors.label]} />
			</Field>

			<Field data-invalid={!!errors.type || undefined}>
				<FieldLabel>{t('bookingForm.fieldType')}</FieldLabel>
				<Controller
					control={control}
					name="type"
					render={({ field: controllerField }) => (
						<Select
							value={controllerField.value}
							onValueChange={controllerField.onChange}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FIELD_TYPES.map(renderTypeOption)}
							</SelectContent>
						</Select>
					)}
				/>
			</Field>

			<Field orientation="horizontal">
				<FieldLabel>{t('bookingForm.fieldRequired')}</FieldLabel>
				<Controller
					control={control}
					name="required"
					render={({ field: controllerField }) => (
						<Switch
							checked={controllerField.value}
							onCheckedChange={controllerField.onChange}
						/>
					)}
				/>
			</Field>

			<div className="flex gap-2">
				<Button type="submit" disabled={isSaving}>
					{field ? t('bookingForm.editField') : t('bookingForm.addField')}
				</Button>
				<Button type="button" variant="outline" onClick={onCancel}>
					{t('cancel')}
				</Button>
			</div>
		</form>
	)
}

export { BookingFieldEditor }
