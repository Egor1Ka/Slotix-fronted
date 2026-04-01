'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import type { BookingField } from '@/services/configs/booking-field.types'

interface DynamicFieldRendererProps {
	field: BookingField
}

const INPUT_TYPE_MAP: Record<BookingField['type'], string> = {
	email: 'email',
	phone: 'tel',
	text: 'text',
	textarea: 'text',
}

function DynamicFieldRenderer({ field }: DynamicFieldRendererProps) {
	const {
		register,
		formState: { errors },
	} = useFormContext()

	const fieldName = `custom_${field.id}`
	const error = errors[fieldName]
	const label = field.required ? `${field.label} *` : field.label

	const isTextarea = field.type === 'textarea'

	return (
		<Field data-invalid={!!error || undefined}>
			<FieldLabel htmlFor={fieldName}>{label}</FieldLabel>
			{isTextarea ? (
				<Textarea
					id={fieldName}
					{...register(fieldName)}
					placeholder={field.label}
				/>
			) : (
				<Input
					id={fieldName}
					type={INPUT_TYPE_MAP[field.type]}
					{...register(fieldName)}
					placeholder={field.label}
				/>
			)}
			<FieldError errors={[error]} />
		</Field>
	)
}

export { DynamicFieldRenderer }
