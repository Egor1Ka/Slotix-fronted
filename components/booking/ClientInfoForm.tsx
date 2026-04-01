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
	phone?: string
	email?: string
	[key: string]: string | undefined
}

interface ClientInfoFormProps {
	formConfig: MergedBookingForm
	onSubmit: (data: ClientInfoData) => void
	isSubmitting: boolean
}

// --- Билдеры схем ---

const buildEmailSchema = (required: boolean, invalidMsg: string) => {
	const base = z.string().email(invalidMsg)
	return required ? base : base.optional().or(z.literal(''))
}

const buildPhoneSchema = (required: boolean, requiredMsg: string) =>
	required ? z.string().min(1, requiredMsg) : z.string().optional()

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
		phone: buildPhoneSchema(
			formConfig.baseFields.phone.required,
			t('validation.contactRequired'),
		),
		email: buildEmailSchema(
			formConfig.baseFields.email.required,
			t('validation.invalidEmail'),
		),
	}

	const customShape: Record<string, z.ZodTypeAny> = {}
	const addCustomField = (field: BookingField) => {
		customShape[`custom_${field.id}`] = buildCustomFieldSchema(field)
	}
	formConfig.customFields.forEach(addCustomField)

	const schema = z.object({ ...baseShape, ...customShape })

	const bothOptional =
		!formConfig.baseFields.phone.required &&
		!formConfig.baseFields.email.required

	if (bothOptional) {
		const hasContact = (data: Record<string, unknown>) => {
			const email = data.email as string | undefined
			const phone = data.phone as string | undefined
			return (email && email.length > 0) || (phone && phone.length > 0)
		}
		return schema.refine(hasContact, {
			message: t('validation.contactRequired'),
			path: ['phone'],
		})
	}

	return schema
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

	const phoneLabel = formConfig.baseFields.phone.required
		? `${t('phone')} *`
		: t('phone')
	const emailLabel = formConfig.baseFields.email.required
		? `${t('email')} *`
		: t('email')

	const renderCustomField = (field: BookingField) => (
		<DynamicFieldRenderer key={field.id} field={field} />
	)

	return (
		<FormProvider {...methods}>
			<form
				onSubmit={handleSubmit(onSubmit)}
				className="flex flex-col gap-3"
			>
				<h4 className="text-sm font-medium">{t('clientInfo')}</h4>

				<Field data-invalid={!!errors.name || undefined}>
					<FieldLabel htmlFor="client-name">
						{t('clientName')}
					</FieldLabel>
					<Input
						id="client-name"
						{...register('name')}
						placeholder={t('enterName')}
					/>
					<FieldError errors={[errors.name]} />
				</Field>

				<Field data-invalid={!!errors.phone || undefined}>
					<FieldLabel htmlFor="client-phone">
						{phoneLabel}
					</FieldLabel>
					<Input
						id="client-phone"
						type="tel"
						{...register('phone')}
						placeholder="+380..."
					/>
					<FieldError errors={[errors.phone]} />
				</Field>

				<Field data-invalid={!!errors.email || undefined}>
					<FieldLabel htmlFor="client-email">
						{emailLabel}
					</FieldLabel>
					<Input
						id="client-email"
						type="email"
						{...register('email')}
						placeholder="email@example.com"
					/>
					<FieldError errors={[errors.email]} />
				</Field>

				{formConfig.customFields.map(renderCustomField)}

				<Button
					type="submit"
					className="mt-1 w-full"
					disabled={isSubmitting}
				>
					{isSubmitting ? t('creating') : t('confirmBooking')}
				</Button>
			</form>
		</FormProvider>
	)
}

export { ClientInfoForm }
export type { ClientInfoData }
