'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { orgApi, userApi, setServerErrors } from '@/services'

const bioSchema = z.object({
	bio: z.string().max(500).optional().or(z.literal('')),
})

type BioFormData = z.infer<typeof bioSchema>

function StaffMyProfilePage() {
	const params = useParams<{ orgId: string }>()
	const t = useTranslations('profile')
	const [staffId, setStaffId] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [currentBio, setCurrentBio] = useState<string>('')

	const orgId = params.orgId

	useEffect(() => {
		const fetchData = async () => {
			try {
				const userResponse = await userApi.me()
				const userId = userResponse.data.id

				const staffResponse = await orgApi.getStaff({
					pathParams: { id: orgId },
				})
				const me = staffResponse.data.find((s) => s.id === userId)
				if (me) {
					setStaffId(me.id)
					setCurrentBio(me.bio ?? '')
				}
			} catch {
				// toast interceptor handles errors
			} finally {
				setLoading(false)
			}
		}

		fetchData()
	}, [orgId])

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setError,
	} = useForm<BioFormData>({
		resolver: zodResolver(bioSchema),
		values: { bio: currentBio },
	})

	const onSubmit = async (data: BioFormData) => {
		if (!staffId) return
		try {
			await orgApi.updateStaffBio({
				pathParams: { orgId, staffId },
				body: { bio: data.bio || null },
			})
			toast.success(t('saved'))
		} catch (err) {
			if (!setServerErrors(err, setError)) {
				// toast already shown
			}
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">Loading...</p>
			</div>
		)
	}

	if (!staffId) return null

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="mb-6 text-2xl font-bold">{t('myTitle')}</h1>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
