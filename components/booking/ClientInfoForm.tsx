'use client'

import { useForm, FormProvider, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { DynamicFieldRenderer } from './DynamicFieldRenderer'
import type {
	MergedBookingForm,
	BookingField,
} from '@/services/configs/booking-field.types'

interface ClientInfoData {
	name: string
	[key: string]: string | undefined
}

interface ClientInfoFormProps {
	formConfig: MergedBookingForm
	onSubmit: (data: ClientInfoData) => void
	isSubmitting: boolean
}

// --- Билдеры схем ---

const buildCustomFieldSchema = (field: BookingField) => {
	if (field.type === 'email') {
		return field.required
			? z.string().email()
			: z.string().email().optional().or(z.literal(''))
	}
	return field.required ? z.string().min(1) : z.string().optional()
}

const buildSchema = (
	formConfig: MergedBookingForm,
	t: ReturnType<typeof useTranslations>,
) => {
	const baseShape: Record<string, z.ZodTypeAny> = {
		name: z.string().min(2, t('validation.nameMin')),
	}

	const customShape: Record<string, z.ZodTypeAny> = {}
	const addCustomField = (field: BookingField) => {
		customShape[`custom_${field.id}`] = buildCustomFieldSchema(field)
	}
	formConfig.customFields.forEach(addCustomField)

	return z.object({ ...baseShape, ...customShape })
}

// --- Компонент ---

function ClientInfoForm({
	formConfig,
	onSubmit,
	isSubmitting,
}: ClientInfoFormProps) {
	const t = useTranslations('booking')
	const schema = buildSchema(formConfig, t)

	const methods = useForm<ClientInfoData>({
		resolver: zodResolver(schema) as unknown as Resolver<ClientInfoData>,
	})

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = methods

	const renderCustomField = (field: BookingField) => (
		<DynamicFieldRenderer key={field.id} field={field} />
	)

	return (
		<FormProvider {...methods}>
			<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
				<h4 className="text-sm font-medium">{t('clientInfo')}</h4>

				<Field data-invalid={!!errors.name || undefined}>
					<FieldLabel htmlFor="client-name">{t('clientName')}</FieldLabel>
					<Input
						id="client-name"
						{...register('name')}
						placeholder={t('enterName')}
					/>
					<FieldError errors={[errors.name]} />
				</Field>

				{formConfig.customFields.map(renderCustomField)}

				<Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
					{isSubmitting ? t('creating') : t('confirmBooking')}
				</Button>
			</form>
		</FormProvider>
	)
}

export { ClientInfoForm }
export type { ClientInfoData }
