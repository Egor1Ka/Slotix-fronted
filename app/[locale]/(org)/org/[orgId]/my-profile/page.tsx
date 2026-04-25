'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { useUser } from '@/lib/auth/user-provider'
import { orgApi, setServerErrors } from '@/services'
import type { OrgMembership } from '@/services/configs/org.types'

const profileSchema = z.object({
	displayName: z
		.string()
		.trim()
		.max(100)
		.optional()
		.or(z.literal(''))
		.refine((v) => !v || v.length >= 2, {
			message: 'Minimum 2 characters',
		}),
	bio: z.string().max(500).optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

function StaffMyProfilePage() {
	const params = useParams<{ orgId: string }>()
	const t = useTranslations('profile')
	const user = useUser()
	const [membership, setMembership] = useState<OrgMembership | null>(null)
	const [loading, setLoading] = useState(true)

	const orgId = params.orgId

	useEffect(() => {
		const fetchMembership = async () => {
			try {
				const response = await orgApi.getMyMembership({
					pathParams: { id: orgId },
				})
				setMembership(response.data)
			} catch {
				// toast interceptor handles errors
			} finally {
				setLoading(false)
			}
		}

		fetchMembership()
	}, [orgId])

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setError,
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		values: {
			displayName: membership?.displayName ?? '',
			bio: membership?.bio ?? '',
		},
	})

	const onSubmit = async (data: ProfileFormData) => {
		const displayName = data.displayName?.trim() || null
		const bio = data.bio?.trim() || null
		try {
			const response = await orgApi.updateStaffMember({
				pathParams: { orgId, staffId: user.id },
				body: { displayName, bio },
			})
			setMembership((prev) =>
				prev
					? {
							...prev,
							displayName: response.data.displayName,
							bio: response.data.bio,
						}
					: prev,
			)
			toast.success(t('saved'))
		} catch (err) {
			if (!setServerErrors(err, setError)) {
				// toast already shown by interceptor
			}
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Spinner />
			</div>
		)
	}

	if (!membership) return null

	const effectiveName = membership.displayName || user.name
	const roleLabel = t(`role.${membership.role}`)

	const renderBadges = () => {
		const badges = [
			<Badge key="role" variant="secondary">
				{roleLabel}
			</Badge>,
		]
		if (membership.position) {
			badges.push(
				<Badge key="position" variant="outline">
					{membership.position}
				</Badge>,
			)
		}
		return badges
	}

	return (
		<div className="mx-auto max-w-2xl space-y-6 p-6">
			<h1 className="text-2xl font-bold">{t('myTitle')}</h1>

			<ProfileHeader
				avatar={user.avatar}
				name={effectiveName}
				badges={renderBadges()}
			/>

			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<Field data-invalid={!!errors.displayName || undefined}>
					<FieldLabel htmlFor="org-display-name">
						{t('orgDisplayNameLabel')}
					</FieldLabel>
					<Input
						id="org-display-name"
						placeholder={user.name}
						{...register('displayName')}
					/>
					<FieldDescription>{t('orgDisplayNameHint')}</FieldDescription>
					<FieldError errors={[errors.displayName]} />
				</Field>

				<Field data-invalid={!!errors.bio || undefined}>
					<FieldLabel htmlFor="staff-bio">{t('bio')}</FieldLabel>
					<Textarea
						id="staff-bio"
						placeholder={t('bioPlaceholder')}
						rows={4}
						{...register('bio')}
					/>
					<FieldError errors={[errors.bio]} />
				</Field>

				<Button type="submit" disabled={isSubmitting}>
					{t('save')}
				</Button>
			</form>
		</div>
	)
}

export default StaffMyProfilePage
