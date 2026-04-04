'use client'

import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { setServerErrors } from '@/services'

const profileSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.min(2, 'Name must be at least 2 characters'),
	description: z.string().max(1000).optional().or(z.literal('')),
	address: z.string().optional().or(z.literal('')),
	phone: z.string().optional().or(z.literal('')),
	website: z
		.string()
		.url('Must be a valid URL')
		.optional()
		.or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileFormProps {
	defaultValues: ProfileFormData
	onSubmit: (data: ProfileFormData) => Promise<void>
}

function ProfileForm({ defaultValues, onSubmit }: ProfileFormProps) {
	const t = useTranslations('profile')

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setError,
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		defaultValues,
	})

	const handleFormSubmit = async (data: ProfileFormData) => {
		try {
			await onSubmit(data)
			toast.success(t('saved'))
		} catch (err) {
			if (!setServerErrors(err, setError)) {
				// toast already shown by interceptor
			}
		}
	}

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
			<Field data-invalid={!!errors.name || undefined}>
				<FieldLabel htmlFor="profile-name">{t('name')}</FieldLabel>
				<Input id="profile-name" {...register('name')} />
				<FieldError errors={[errors.name]} />
			</Field>

			<Field data-invalid={!!errors.description || undefined}>
				<FieldLabel htmlFor="profile-description">
					{t('description')}
				</FieldLabel>
				<Textarea
					id="profile-description"
					placeholder={t('descriptionPlaceholder')}
					rows={4}
					{...register('description')}
				/>
				<FieldError errors={[errors.description]} />
			</Field>

			<Field data-invalid={!!errors.address || undefined}>
				<FieldLabel htmlFor="profile-address">{t('address')}</FieldLabel>
				<Input
					id="profile-address"
					placeholder={t('addressPlaceholder')}
					{...register('address')}
				/>
				<FieldError errors={[errors.address]} />
			</Field>

			<Field data-invalid={!!errors.phone || undefined}>
				<FieldLabel htmlFor="profile-phone">{t('phone')}</FieldLabel>
				<Input
					id="profile-phone"
					placeholder={t('phonePlaceholder')}
					{...register('phone')}
				/>
				<FieldError errors={[errors.phone]} />
			</Field>

			<Field data-invalid={!!errors.website || undefined}>
				<FieldLabel htmlFor="profile-website">{t('website')}</FieldLabel>
				<Input
					id="profile-website"
					placeholder={t('websitePlaceholder')}
					{...register('website')}
				/>
				<FieldError errors={[errors.website]} />
			</Field>

			<Button type="submit" disabled={isSubmitting}>
				{t('save')}
			</Button>
		</form>
	)
}

export { ProfileForm, profileSchema }
export type { ProfileFormData }
